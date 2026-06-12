const LegalCaseAssignmentsModel = require('../models/legal_case_assignments.model')
const supabase = require('../config/supabase')

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
      'legal officer': 'legal_officer',
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

module.exports = { getItems, createItem, assignCase, getAssignmentsByCase }