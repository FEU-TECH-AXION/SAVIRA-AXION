const CaseAssessments = require('../models/case_assessments.model')
const supabase       = require('../config/supabase')
const { getPublicIdByCaseReportId } = require('../utils/casePublicIds')
const { resolveActor, resolveActors, withActor } = require('../utils/actor')

const PRELIMINARY_REFERRAL_BODIES = new Set([
  'DSWD',
  'PNP Women and Children Protection Desk',
  'BSP/GSP Mechanism',
  'School/Workplace CODI',
])
const REFERRAL_ALLOWED_STATUS_ID = 4 // Verified - True

const getItems = async (req, res) => {
  try {
    const data = await CaseAssessments.getAll()
    res.json(await enrichAssessmentActors(data))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function enrichAssessmentActors(items = []) {
  const rows = Array.isArray(items) ? items : [items]
  const actorsById = await resolveActors(rows.map((item) => item?.changed_by_id))
  const shaped = rows.map((item) =>
    withActor(item, actorsById[item?.changed_by_id], {
      idField: 'changed_by_id',
      nameField: 'changed_by_name',
      roleField: 'changed_by_role',
    })
  )
  return Array.isArray(items) ? shaped : shaped[0]
}

// GET /api/case_assessments/case/:caseReportId
// Fetches all assessments for a specific case, joined with their
// history row so the frontend can show which status each assessment
// was created for
const getItemsByCaseReport = async (req, res) => {
  try {
    const data = await CaseAssessments.getByCaseReport(req.params.caseReportId)
    const enriched = await enrichAssessmentActors(data)
    res.json({
      data: enriched.map((item) => ({ ...item, case_report_id: req.casePublicId || item.case_report_id })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    const item = await CaseAssessments.create(req.body)
    const enriched = await enrichAssessmentActors(item)
    res.status(201).json({
      ...enriched,
      case_report_id: await getPublicIdByCaseReportId(item.case_report_id),
    })
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

    const isReferralUpdate = Object.hasOwn(updates, 'referral_required') || Object.hasOwn(updates, 'referral_body')
    if (isReferralUpdate) {
      const { data: report, error: reportError } = await supabase
        .from('case_reports')
        .select('case_report_id, case_status_id')
        .eq('case_report_id', req.params.caseReportId)
        .maybeSingle()

      if (reportError) throw reportError
      if (!report) return res.status(404).json({ error: 'Case report not found.' })
      if (Number(report.case_status_id) !== REFERRAL_ALLOWED_STATUS_ID) {
        return res.status(400).json({
          error: 'Case must be Verified True before referral or endorsement can be flagged.',
        })
      }

      if (updates.referral_body && !PRELIMINARY_REFERRAL_BODIES.has(updates.referral_body)) {
        return res.status(400).json({
          error: 'Court referral must be recorded through legal review endorsement.',
        })
      }
    }

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
    const actor = await resolveActor(approver.user_id)

    res.json({
      data: withActor(
        { ...data, case_report_id: req.casePublicId || data.case_report_id },
        actor,
        {
          idField: 'changed_by_id',
          nameField: 'changed_by_name',
          roleField: 'changed_by_role',
        }
      ),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


module.exports = { getItems, getItemsByCaseReport, createItem, recordAssessmentAction }
