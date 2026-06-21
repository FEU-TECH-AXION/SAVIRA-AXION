const CaseAssessments = require('../models/case_assessments.model')
const supabase       = require('../config/supabase')

const getItems = async (req, res) => {
  try {
    const data = await CaseAssessments.getAll()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/case_assessments/case/:caseReportId
// Fetches all assessments for a specific case, joined with their
// history row so the frontend can show which status each assessment
// was created for
const getItemsByCaseReport = async (req, res) => {
  try {
    const data = await CaseAssessments.getByCaseReport(req.params.caseReportId)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    const item = await CaseAssessments.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const recordAssessmentAction  = async (req, res) => {
  const ALLOWED = [
    'case_type',
    'primary_category',
    'additional_categories',
    'referral_required',
    'referral_body',
    'endorsement',
    'assessment_type',
    'assessment_stage',
    'findings',
    'recommendation',
  ]

  try {
    const body = { ...req.body }
    delete body.case_officer_id
    const { data: approver, error: approverError } = await supabase
      .from('users')
      .select('user_id, roles(role_name)')
      .eq('user_id', req.user?.id)
      .maybeSingle()

    if (approverError) throw approverError

    const approverRole = String(approver?.roles?.role_name || '')
      .toLowerCase()
      .replaceAll('_', ' ')

    const isClassificationApproval = [
      'case_type',
      'primary_category',
      'additional_categories',
    ].some((field) => Object.hasOwn(body, field))

    if (
      isClassificationApproval &&
      !['admin', 'case officer'].includes(approverRole)
    ) {
      return res.status(403).json({
        error: 'Only an admin or case officer may approve case classifications.',
      })
    }

    const updates = Object.fromEntries(
      Object.entries(body).filter(([k]) => ALLOWED.includes(k))
    )

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No valid fields to update.' })

    // Always insert a new row — every action is a new audit record.
    // We never overwrite existing assessments.
    const { data, error } = await supabase
      .from('case_assessments')
      .insert([{
        case_report_id: req.params.caseReportId,
        changed_by_id:   approver.user_id,
        ...updates,
      }])
      .select()
      .single()

    if (error) throw error

    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


module.exports = { getItems, getItemsByCaseReport, createItem, recordAssessmentAction }
