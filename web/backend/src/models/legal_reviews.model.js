const supabase = require('../config/supabase')

const REVIEW_DETAIL_COLUMNS = {
  paralegal_record: null,
  endorsed_to: null,
  endorsement_details: null,
  monitoring_log: [],
}

async function getLatestByCase(caseReportId) {
  const { data, error } = await supabase
    .from('legal_reviews')
    .select('*')
    .eq('case_report_id', caseReportId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getLogsByReview(legalReviewId) {
  if (!legalReviewId) return []
  const { data, error } = await supabase
    .from('legal_review_logs')
    .select('*')
    .eq('legal_review_id', legalReviewId)
    .order('performed_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function getAssignedLegalPersonnelId(caseReportId) {
  const { data, error } = await supabase
    .from('legal_case_assignments')
    .select('legal_personnel_id, assignment_role')
    .eq('case_report_id', caseReportId)
    .eq('is_active', true)
    .order('assignment_role', { ascending: true })
  if (error) throw error

  const assignments = data || []
  return (
    assignments.find((a) => a.assignment_role === 'legal_officer')?.legal_personnel_id ||
    assignments.find((a) => a.assignment_role === 'paralegal')?.legal_personnel_id ||
    null
  )
}

async function getLegalPersonnelIdByUser(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data?.legal_personnel_id || null
}

async function resolveLegalPersonnelId({ caseReportId, currentReview, legalPersonnelId, performedByUserId }) {
  if (currentReview?.legal_personnel_id) return currentReview.legal_personnel_id
  if (legalPersonnelId) return legalPersonnelId

  const assignedLegalPersonnelId = await getAssignedLegalPersonnelId(caseReportId)
  if (assignedLegalPersonnelId) return assignedLegalPersonnelId

  const actorLegalPersonnelId = await getLegalPersonnelIdByUser(performedByUserId)
  if (actorLegalPersonnelId) return actorLegalPersonnelId

  return null
}

async function createForCase({ caseReportId, legalPersonnelId }) {
  const { data, error } = await supabase
    .from('legal_reviews')
    .insert([{
      case_report_id: caseReportId,
      legal_personnel_id: legalPersonnelId,
      review_type: 'Legal Review',
      review_status: 'In Progress',
      ...REVIEW_DETAIL_COLUMNS,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateReview(legalReviewId, patch) {
  const { data, error } = await supabase
    .from('legal_reviews')
    .update(patch)
    .eq('legal_review_id', legalReviewId)
    .select()
    .single()
  if (error) throw error
  return data
}

async function logAction({ legalReviewId, caseReportId, actionType, remarks, performedByUserId }) {
  const { data, error } = await supabase
    .from('legal_review_logs')
    .insert([{
      legal_review_id: legalReviewId,
      case_report_id: caseReportId,
      action_type: actionType,
      remarks: remarks?.slice(0, 500) || null,
      performed_by_user_id: performedByUserId,
      performed_at: new Date().toISOString(),
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

module.exports = {
  getLatestByCase,
  getLogsByReview,
  resolveLegalPersonnelId,
  createForCase,
  updateReview,
  logAction,
}
