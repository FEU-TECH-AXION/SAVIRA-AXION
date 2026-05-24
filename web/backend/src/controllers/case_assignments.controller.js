const { assignCaseToOfficer, getAssignmentsByCaseId, getAssignmentsByOfficerId } = require('../models/case_assignments.model');

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

module.exports = { createAssignment, getCaseAssignments, getOfficerAssignments };
