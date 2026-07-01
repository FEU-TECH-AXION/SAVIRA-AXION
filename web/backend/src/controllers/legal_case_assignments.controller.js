const LegalCaseAssignmentsModel = require('../models/legal_case_assignments.model')
const supabase = require('../config/supabase')

async function requireParalegalForLegalPersonnel(req, res) {
    const role = String(req.user?.role || req.user?.role_name || '').toLowerCase()
    if (role !== 'legal personnel') return true

    const { data, error } = await supabase
        .from('legal_personnels')
        .select('legal_personnel_type')
        .eq('user_id', req.user?.id || req.user?.user_id)
        .maybeSingle()
    if (error) throw error

    if (String(data?.legal_personnel_type || '').toLowerCase() !== 'paralegal') {
        res.status(403).json({ error: 'Only paralegals can assign legal personnel.' })
        return false
    }

    return true
}

const getItems = async (req, res) => {
    try {
        const data = await LegalCaseAssignmentsModel.getAll()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const item = await LegalCaseAssignmentsModel.create(req.body)
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/legal_case_assignments/assign
// Body: { case_report_id, legal_personnel_id, assignment_role, notes }
const assignCase = async (req, res) => {
    const { case_report_id, legal_personnel_id, notes } = req.body
  const performed_by = req.user?.user_id ?? null

  if (!case_report_id || !legal_personnel_id) {
    return res.status(400).json({
      error: 'case_report_id and legal_personnel_id are required.'
    })
  }

  try {
    if (!(await requireParalegalForLegalPersonnel(req, res))) return

    // 1. Resolve assignment_role from legal_personnel_type
    const { data: personnelData, error: personnelError } = await supabase
      .from('legal_personnels')
      .select('legal_personnel_type, users(first_name, last_name)')
      .eq('legal_personnel_id', legal_personnel_id)
      .single()

    if (personnelError || !personnelData) {
      return res.status(404).json({ error: 'Legal personnel not found.' })
    }

    // Normalize to assignment_role value
    const typeMap = {
      'legal officer': 'lawyer',
      'lawyer':        'lawyer',
      'paralegal':     'paralegal',
    }
    const assignment_role = typeMap[personnelData.legal_personnel_type?.toLowerCase()]
    if (!assignment_role) {
      return res.status(400).json({
        error: `Unknown legal_personnel_type: "${personnelData.legal_personnel_type}"`
      })
    }

    // 2. Prevent assigning the same person twice on the same case
    const alreadyAssigned = await LegalCaseAssignmentsModel.isAlreadyAssigned(
      case_report_id,
      legal_personnel_id
    )
    if (alreadyAssigned) {
      return res.status(409).json({
        error: 'This person is already actively assigned to this case.'
      })
    }

    // 3. Insert assignment with derived role
    const assignment = await LegalCaseAssignmentsModel.create({
      case_report_id,
      legal_personnel_id,
      assignment_role,           // derived, not from request body
      assigned_by:  performed_by,
      notes:        notes ?? null,
      is_active:    true,
    })

    // 4. Write to case_report_logs
    const name = personnelData.users
      ? `${personnelData.users.first_name} ${personnelData.users.last_name}`.trim()
      : `Personnel #${legal_personnel_id}`

    await supabase.from('case_report_logs').insert([{
      case_report_id,
      action_type:          `${assignment_role}_assigned`,
      remarks:              `${personnelData.legal_personnel_type} assigned: ${name}.${notes ? ' Notes: ' + notes : ''}`,
      performed_by_user_id: performed_by,
      performed_at:         new Date().toISOString(),
    }])

    res.status(201).json({ data: assignment })
  } catch (err) {
    console.error('[assignCase]', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/legal_case_assignments/:caseReportId
const getAssignmentsByCase = async (req, res) => {
    const { caseReportId } = req.params
    try {
        const data = await LegalCaseAssignmentsModel.getActiveByCase(caseReportId)
        res.json({ data })
    } catch (err) {
        console.error('[getAssignmentsByCase]', err)
        res.status(500).json({ error: err.message })
    }
}

const bulkAssignCase = async (req, res) => {
    const { case_report_id, legal_personnel_ids, notes } = req.body
    const performed_by = req.user?.user_id ?? null

    if (!case_report_id || !Array.isArray(legal_personnel_ids) || legal_personnel_ids.length === 0) {
        return res.status(400).json({
            error: 'case_report_id and legal_personnel_ids (array) are required.'
        })
    }

    try {
        if (!(await requireParalegalForLegalPersonnel(req, res))) return

        const results = { assigned: [], failed: [] }

        // Check each person and build valid rows
        const validRows = []
        for (const legal_personnel_id of legal_personnel_ids) {

            // 1. Check for duplicate active assignment
            const alreadyAssigned = await LegalCaseAssignmentsModel.isAlreadyAssigned(
                case_report_id,
                legal_personnel_id
            )
            if (alreadyAssigned) {
                results.failed.push({
                    legal_personnel_id,
                    reason: 'Already actively assigned to this case.'
                })
                continue
            }

            // 2. Resolve assignment_role from legal_personnel_type
            const { data: personnelData, error: personnelError } = await supabase
                .from('legal_personnels')
                .select('legal_personnel_type, users(first_name, last_name)')
                .eq('legal_personnel_id', legal_personnel_id)
                .single()

            if (personnelError || !personnelData) {
                results.failed.push({
                    legal_personnel_id,
                    reason: 'Personnel not found.'
                })
                continue
            }

            const typeMap = {
                'legal officer': 'lawyer',
                'lawyer':        'lawyer',
                'paralegal':     'paralegal',
            }
            const assignment_role = typeMap[personnelData.legal_personnel_type?.toLowerCase()]
            if (!assignment_role) {
                results.failed.push({
                    legal_personnel_id,
                    reason: `Unknown type: ${personnelData.legal_personnel_type}`
                })
                continue
            }

            validRows.push({
                case_report_id,
                legal_personnel_id,
                assignment_role,
                assigned_by:  performed_by,
                notes:        notes ?? null,
                is_active:    true,
                _name: personnelData.users
                    ? `${personnelData.users.first_name} ${personnelData.users.last_name}`.trim()
                    : `Personnel #${legal_personnel_id}`,
            })
        }

        // 3. Bulk insert all valid rows with shared batch_id
        if (validRows.length > 0) {
            const rowsToInsert = validRows.map(({ _name, ...row }) => row)
            await LegalCaseAssignmentsModel.bulkCreate(rowsToInsert)

            // 4. Log each assignment to case_report_logs
            const logRows = validRows.map(r => ({
                case_report_id,
                action_type:          `${r.assignment_role}_assigned`,
                remarks:              `${r.assignment_role === 'lawyer' ? 'Lawyer' : 'Paralegal'} assigned: ${r._name}.${notes ? ' Notes: ' + notes : ''}`,
                performed_by_user_id: performed_by,
                performed_at:         new Date().toISOString(),
            }))
            await supabase.from('case_report_logs').insert(logRows)

            results.assigned = validRows.map(r => ({
                legal_personnel_id: r.legal_personnel_id,
                name:               r._name,
                assignment_role:    r.assignment_role,
            }))
        }

        // Return both successes and failures so frontend can show partial results
        res.status(201).json({
            data:    results.assigned,
            failed:  results.failed,
            message: results.failed.length > 0
                ? 'Some assignments failed.'
                : 'All assignments saved successfully.',
        })
    } catch (err) {
        console.error('[bulkAssignCase]', err)
        res.status(500).json({ error: err.message })
    }
}

const removeAssignment = async (req, res) => {
    const { caseReportId, legalPersonnelId } = req.params
    const role = String(req.user?.role || req.user?.role_name || '').toLowerCase()
    const performedBy = req.user?.id || req.user?.user_id || null

    if (role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can remove legal personnel assignments.' })
    }

    try {
        const alreadyAssigned = await LegalCaseAssignmentsModel.isAlreadyAssigned(caseReportId, legalPersonnelId)
        if (!alreadyAssigned) {
            return res.status(404).json({ error: 'Active legal personnel assignment not found.' })
        }

        await LegalCaseAssignmentsModel.deactivateOne(caseReportId, legalPersonnelId)
        await supabase.from('case_report_logs').insert([{
            case_report_id: caseReportId,
            action_type: 'legal_personnel_unassigned',
            remarks: `Legal personnel #${legalPersonnelId} removed from the case.`,
            performed_by_user_id: performedBy,
            performed_at: new Date().toISOString(),
        }])

        res.json({ message: 'Legal personnel removed successfully.' })
    } catch (err) {
        console.error('[removeLegalAssignment]', err)
        res.status(500).json({ error: err.message || 'Failed to remove legal personnel.' })
    }
}

module.exports = { getItems, createItem, assignCase, bulkAssignCase, getAssignmentsByCase, removeAssignment }
