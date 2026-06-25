//controller
const supabase = require('../config/supabase')
const VolunteerApplicationAssignmentsModel = require('../models/volunteer_application_assignments.model')
const { notifyUser } = require('../services/notificationService');

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationAssignmentsModel.getAll()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getAssignmentsByApplication = async (req, res) => {
    const { applicationId } = req.params
    try {
        const data = await VolunteerApplicationAssignmentsModel.getActiveByApplication(applicationId)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


const bulkAssignApplication = async (req, res) => {
    console.log('req.user:', req.user)
    const { application_ids, assessor_ids } = req.body
    const assigned_by = req.user?.id ?? null

    if (!Array.isArray(application_ids) || application_ids.length === 0 ||
        !Array.isArray(assessor_ids)    || assessor_ids.length === 0) {
        return res.status(400).json({
            error: 'application_ids and assessor_ids (arrays) are required.'
        })
    }

    try {
        // 1. Verify all assessors are in Membership committee (committee_id = 2)
        const { data: validStaff, error: staffError } = await supabase
            .from('staff')
            .select('user_id, users(first_name, last_name)')
            .in('user_id', assessor_ids)
            .eq('committee_id', 2)

        if (staffError) throw staffError

        const validIds    = validStaff.map(s => s.user_id)
        const invalidIds  = assessor_ids.filter(id => !validIds.includes(id))

        if (invalidIds.length > 0) {
            return res.status(400).json({
                error: 'Some assignees are not part of the Membership Committee.'
            })
        }

        const results = { assigned: [], failed: [] }

        // 2. Build rows — check duplicates per application + assessor pair
        const validRows = []
        
        for (const appId of application_ids) {
            for (const assessorId of assessor_ids) {
                const staffMember = validStaff.find(s => s.user_id === assessorId)
                validRows.push({
                    volunteer_application_id: appId,
                    assessor_id:              assessorId,
                    assigned_by,
                    committee_id:             2,
                    is_active:                true,
                    _name: staffMember?.users
                        ? `${staffMember.users.first_name} ${staffMember.users.last_name}`.trim()
                        : `Staff #${assessorId}`,
                })
            }
        }

        // 3. Bulk insert valid rows
        if (validRows.length > 0) {
            const rowsToInsert = validRows.map(({ _name, ...row }) => row)
            const inserted = await VolunteerApplicationAssignmentsModel.bulkCreate(rowsToInsert)

            // Only notify for rows that were actually inserted
            const insertedIds = new Set(
                (inserted || []).map(r => `${r.volunteer_application_id}:${r.assessor_id}`)
            )

            results.assigned = validRows
                .filter(r => insertedIds.has(`${r.volunteer_application_id}:${r.assessor_id}`))
                .map(r => ({
                    volunteer_application_id: r.volunteer_application_id,
                    assessor_id:              r.assessor_id,
                    name:                     r._name,
                }))

            for (const row of validRows.filter(r => insertedIds.has(`${r.volunteer_application_id}:${r.assessor_id}`))) {
                notifyUser(row.assessor_id, {
                    title: 'New Application Assigned',
                    body: `You have been assigned to review a volunteer application.`,
                    data: {
                        volunteer_application_id: row.volunteer_application_id,
                        link: `/volunteer-applications/${row.volunteer_application_id}`,
                    },
                }).catch(err => console.error('[notifyUser] Failed to notify assessor:', err.message))
            }
        }

        res.status(201).json({
            data:    results.assigned,
            failed:  results.failed,
            message: results.failed.length > 0
                ? 'Some assignments failed.'
                : 'All assignments saved successfully.',
        })
    } catch (err) {
        console.error('[bulkAssignApplication]', err)
        res.status(500).json({ error: err.message })
    }
}

const removeAssignment = async (req, res) => {
    const { applicationId, assessorId } = req.params
    const role = String(req.user?.role || req.user?.role_name || '').toLowerCase()

    if (role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can remove volunteer staff assignments.' })
    }

    try {
        const alreadyAssigned = await VolunteerApplicationAssignmentsModel.isAlreadyAssigned(applicationId, assessorId)
        if (!alreadyAssigned) {
            return res.status(404).json({ error: 'Active staff assignment not found.' })
        }

        await VolunteerApplicationAssignmentsModel.deactivateOne(applicationId, assessorId)

        const remainingAssignments = await VolunteerApplicationAssignmentsModel.getActiveByApplication(applicationId)
        if (remainingAssignments.length === 0) {
            await supabase
                .from('volunteer_applications')
                .update({ application_status: 'pending', updated_at: new Date().toISOString() })
                .eq('volunteer_application_id', applicationId)
                .eq('application_status', 'reviewing')
        }

        res.json({ message: 'Staff assignment removed successfully.' })
    } catch (err) {
        console.error('[removeVolunteerAssignment]', err)
        res.status(500).json({ error: err.message || 'Failed to remove staff assignment.' })
    }
}

module.exports = { getItems, getAssignmentsByApplication, bulkAssignApplication, removeAssignment }
