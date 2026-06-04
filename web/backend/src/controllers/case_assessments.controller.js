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

const patchLatestAssessment = async (req, res) => {
  // case_type matches what frontend sends (string array)
  // case_type_ids is removed — frontend doesn't send that
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
    // Strip case_officer_id and anything not in ALLOWED
    const { case_officer_id, ...body } = req.body

    const updates = Object.fromEntries(
      Object.entries(body).filter(([k]) => ALLOWED.includes(k))
    )

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No valid fields to update.' })

    const { data: existing, error: fetchErr } = await supabase
      .from('case_assessments')
      .select('case_assessment_id')
      .eq('case_report_id', req.params.caseReportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (fetchErr) throw fetchErr

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('case_assessments')
        .update(updates)
        .eq('case_assessment_id', existing.case_assessment_id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('case_assessments')
        .insert([{ case_report_id: req.params.caseReportId, ...updates }])
        .select()
        .single()
      if (error) throw error
      result = data
    }

    res.json({ data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


module.exports = { getItems, getItemsByCaseReport, createItem, patchLatestAssessment }