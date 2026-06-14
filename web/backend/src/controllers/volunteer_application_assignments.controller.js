const supabase = require('../config/supabase')
const VolunteerApplicationAssignmentsModel = require('../models/volunteer_application_assignments.model')

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
        const validRows = []

        // 2. Build rows — check duplicates per application + assessor pair
        for (const appId of application_ids) {
            for (const assessorId of assessor_ids) {
                const alreadyAssigned = await VolunteerApplicationAssignmentsModel.isAlreadyAssigned(
                    appId,
                    assessorId
                )
                if (alreadyAssigned) {
                    results.failed.push({
                        volunteer_application_id: appId,
                        assessor_id:              assessorId,
                        reason:                   'Already actively assigned to this application.'
                    })
                    continue
                }

                const staffMember = validStaff.find(s => s.user_id === assessorId)
                validRows.push({
                    volunteer_application_id: appId,
                    assessor_id:              assessorId,
                    assigned_by,
                    committee_id:             2,
                    is_active:                true,
                    // notes:                    notes ?? null,
                    _name: staffMember?.users
                        ? `${staffMember.users.first_name} ${staffMember.users.last_name}`.trim()
                        : `Staff #${assessorId}`,
                })
            }
        }

        // 3. Bulk insert valid rows
        if (validRows.length > 0) {
            const rowsToInsert = validRows.map(({ _name, ...row }) => row)
            await VolunteerApplicationAssignmentsModel.bulkCreate(rowsToInsert)

            results.assigned = validRows.map(r => ({
                volunteer_application_id: r.volunteer_application_id,
                assessor_id:              r.assessor_id,
                name:                     r._name,
            }))
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

module.exports = { getItems, getAssignmentsByApplication, bulkAssignApplication }