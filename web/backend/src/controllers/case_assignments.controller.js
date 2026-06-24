const { assignCaseToOfficer, getAssignmentsByCaseId, getAssignmentsByOfficerId } = require('../models/case_assignments.model');
const { notifyUser } = require('../services/notificationService');

// POST /api/case_assignments — assign a case to an officer
const createAssignment = async (req, res) => {
    try {
        const { case_report_id, case_officer_id } = req.body;
        const assignedBy = req.user?.id;

        if (!case_report_id || !case_officer_id) {
            return res.status(400).json({ error: 'Missing required fields: case_report_id, case_officer_id' });
        }

        if (!assignedBy) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const assignment = await assignCaseToOfficer(case_report_id, case_officer_id, assignedBy);
        return res.status(201).json({ data: assignment });
    } catch (err) {
        console.error('[createAssignment]', err.message);
        return res.status(500).json({ error: 'Failed to assign case.' });
    }
};

// GET /api/case_assignments/:caseId — get assignment history for a case
const getCaseAssignments = async (req, res) => {
    try {
        const { caseId } = req.params;
        const assignments = await getAssignmentsByCaseId(caseId);
        return res.json({ data: assignments });
    } catch (err) {
        console.error('[getCaseAssignments]', err.message);
        return res.status(500).json({ error: 'Failed to fetch assignments.' });
    }
};

// GET /api/case_assignments/officer/:officerId — get cases assigned to an officer
const getOfficerAssignments = async (req, res) => {
    try {
        const { officerId } = req.params;
        const caseIds = await getAssignmentsByOfficerId(officerId);
        return res.json({ data: caseIds });

    } catch (err) {
        console.error('[getOfficerAssignments]', err.message);
        return res.status(500).json({ error: 'Failed to fetch officer assignments.' });
    }
};

const CaseAssignmentsModel = require('../models/case_assignments.model');
const supabase = require('../config/supabase');

// POST /api/case_assignments/bulk-assign — assign multiple cases to multiple officers
const bulkAssignOfficers = async (req, res) => {
    try {
        const { case_report_ids, case_officer_ids, notes } = req.body;
        const assignedBy = req.user?.id || req.user?.user_id;

        let reportIds = case_report_ids || (req.body.case_report_id ? [req.body.case_report_id] : []);
        let officerIds = case_officer_ids || (req.body.case_officer_id ? [req.body.case_officer_id] : []);

        if (reportIds.length === 0 || officerIds.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid case_report_ids or case_officer_ids' });
        }

        const results = { assigned: [], failed: [] };
        const validRows = [];
        const logRows = [];

        // For each case and each officer
        for (const case_report_id of reportIds) {
            for (const case_officer_id of officerIds) {
                // 1. Check for duplicate active assignment
                const alreadyAssigned = await CaseAssignmentsModel.isAlreadyAssigned(case_report_id, case_officer_id);
                if (alreadyAssigned) {
                    results.failed.push({
                        case_report_id,
                        case_officer_id,
                        reason: 'Already actively assigned to this case.'
                    });
                    continue;
                }

                // Get officer details for logging
                const { data: officerData, error: officerError } = await supabase
                    .from('case_officers')
                    .select('user_id, users(first_name, last_name)')
                    .eq('case_officer_id', case_officer_id)
                    .single();

                if (officerError || !officerData) {
                    results.failed.push({
                        case_report_id,
                        case_officer_id,
                        reason: 'Officer not found.'
                    });
                    continue;
                }

                const officerName = officerData.users ? `${officerData.users.first_name} ${officerData.users.last_name}`.trim() : `Officer #${case_officer_id}`;

                validRows.push({
                    case_report_id,
                    case_officer_id,
                    assigned_by: assignedBy,
                    is_active: true
                });

                logRows.push({
                    case_report_id,
                    action_type: 'case_officer_assigned',
                    remarks: `Case officer assigned: ${officerName}.${notes ? ' Notes: ' + notes : ''}`,
                    performed_by_user_id: assignedBy,
                    performed_at: new Date().toISOString(),
                });

                results.assigned.push({
                    case_report_id,
                    case_officer_id,
                    name: officerName
                });
                
                // Notify the assigned officer
                if (officerData.user_id) {
                    console.log('[notifyUser] sending to:', officerData.user_id);
                    notifyUser(officerData.user_id, {
                        title: 'New Case Assigned',
                        body: `You have been assigned to case ${case_report_id}.`,
                        data: {
                            case_report_id,
                            link: `/cases/${case_report_id}`,
                        },
                    }).catch(err => console.error('[notifyUser] Failed to notify officer:', err.message));
                }
            }
        }

        if (validRows.length > 0) {
            await CaseAssignmentsModel.bulkCreate(validRows);
            await supabase.from('case_report_logs').insert(logRows);
        }

        return res.status(201).json({
            data: results.assigned,
            failed: results.failed,
            message: results.failed.length > 0 ? 'Some assignments failed.' : 'All assignments saved successfully.',
        });
    } catch (err) {
        console.error('[bulkAssignOfficers]', err.message);
        return res.status(500).json({ error: 'Failed to assign cases.' });
    }
};

const removeAssignment = async (req, res) => {
    try {
        const { caseReportId, caseOfficerId } = req.params;
        const role = String(req.user?.role || req.user?.role_name || '').toLowerCase();
        const performedBy = req.user?.id || req.user?.user_id || null;

        if (role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can remove case officer assignments.' });
        }

        const removed = await CaseAssignmentsModel.deactivateOne(caseReportId, caseOfficerId);
        if (removed.length === 0) {
            return res.status(404).json({ error: 'Active case officer assignment not found.' });
        }

        await supabase.from('case_report_logs').insert([{
            case_report_id: caseReportId,
            action_type: 'case_officer_unassigned',
            remarks: `Case officer #${caseOfficerId} removed from the case.`,
            performed_by_user_id: performedBy,
            performed_at: new Date().toISOString(),
        }]);

        return res.json({ message: 'Case officer removed successfully.' });
    } catch (err) {
        console.error('[removeAssignment]', err);
        return res.status(500).json({ error: err.message || 'Failed to remove case officer.' });
    }
};

module.exports = { createAssignment, getCaseAssignments, getOfficerAssignments, bulkAssignOfficers, removeAssignment };
