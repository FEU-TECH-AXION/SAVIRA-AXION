const supabase = require('../config/supabase')

const REVIEW_DETAIL_COLUMNS = {
  paralegal_record: null,
  lawyer_record: null,
  endorsed_to: null,
  endorsement_details: null,
  monitoring_log: [],
  document_repository: [],
}

const STATUS_NAME_BY_ID = {
  1: 'Submitted',
  2: 'For Verification',
  3: 'Undergoing Review',
  4: 'Verified - True',
  5: 'Verified - False',
  6: 'Under Case Evaluation',
  7: 'Case Filed',
  8: 'Investigation Ongoing',
  9: 'Hearing Ongoing',
  10: 'Dismissed',
  11: 'Perpetrator Convicted',
  12: 'Resolved',
  13: 'Withdrawn',
}

function formatActorName(user, role) {
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  const label = role || 'System'
  return name ? `${name} - ${label}` : label
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

async function getLatestByCaseIds(caseReportIds = []) {
  const ids = [...new Set((caseReportIds || []).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('legal_reviews')
    .select('*')
    .in('case_report_id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error

  const latestByCase = {}
  for (const review of data || []) {
    if (!latestByCase[review.case_report_id]) latestByCase[review.case_report_id] = review
  }
  return latestByCase
}

async function getCaseIdsByEndorsedTo(endorsedTo) {
  const text = String(endorsedTo || '').trim()
  if (!text || text === 'All') return null

  const { data, error } = await supabase
    .from('legal_reviews')
    .select('case_report_id')
    .eq('endorsed_to', text)
  if (error) throw error

  return [...new Set((data || []).map((review) => review.case_report_id))]
}

async function countCurrentCasesByStatuses(statusIds = []) {
  const ids = [...new Set((statusIds || []).map(Number).filter(Number.isFinite))]
  if (ids.length === 0) return 0

  const { count, error } = await supabase
    .from('case_reports')
    .select('case_report_id', { count: 'exact', head: true })
    .eq('is_current', true)
    .in('case_status_id', ids)
  if (error) throw error
  return count || 0
}

async function countCurrentCasesByIdsAndStatuses(caseReportIds = [], statusIds = []) {
  const caseIds = [...new Set((caseReportIds || []).filter(Boolean))]
  const ids = [...new Set((statusIds || []).map(Number).filter(Number.isFinite))]
  if (caseIds.length === 0 || ids.length === 0) return 0

  const { count, error } = await supabase
    .from('case_reports')
    .select('case_report_id', { count: 'exact', head: true })
    .eq('is_current', true)
    .in('case_report_id', caseIds)
    .in('case_status_id', ids)
  if (error) throw error
  return count || 0
}

async function getManagementStats({ legalStatusIds = [], activeStatusIds = [], underEvaluationStatusId = 6 } = {}) {
  const [
    underEvaluation,
    activeCases,
    endorsedRows,
    pendingRows,
  ] = await Promise.all([
    countCurrentCasesByStatuses([underEvaluationStatusId]),
    countCurrentCasesByStatuses(activeStatusIds),
    supabase
      .from('legal_reviews')
      .select('case_report_id')
      .not('endorsed_to', 'is', null),
    supabase
      .from('case_status_history')
      .select('case_report_id')
      .eq('approval_status', 'pending'),
  ])

  if (endorsedRows.error) throw endorsedRows.error
  if (pendingRows.error) throw pendingRows.error

  const [endorsedCases, pendingApprovals] = await Promise.all([
    countCurrentCasesByIdsAndStatuses(
      (endorsedRows.data || []).map((review) => review.case_report_id),
      legalStatusIds
    ),
    countCurrentCasesByIdsAndStatuses(
      (pendingRows.data || []).map((history) => history.case_report_id),
      legalStatusIds
    ),
  ])

  return {
    underEvaluation,
    activeCases,
    endorsedCases,
    pendingApprovals,
  }
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

async function getLogsByReviewIds(legalReviewIds = []) {
  const ids = [...new Set((legalReviewIds || []).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('legal_review_logs')
    .select('*')
    .in('legal_review_id', ids)
    .order('performed_at', { ascending: false })
  if (error) throw error

  return (data || []).reduce((map, log) => {
    if (!map[log.legal_review_id]) map[log.legal_review_id] = []
    map[log.legal_review_id].push(log)
    return map
  }, {})
}

async function getPendingStatusHistoryByCaseIds(caseReportIds = []) {
  const ids = [...new Set((caseReportIds || []).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('case_status_history')
    .select(`
      history_id,
      display_id,
      case_report_id,
      case_status_id,
      changed_by_id,
      changed_by_role,
      notes,
      form_data,
      approval_status,
      approved_at,
      rejection_reason,
      created_at,
      case_status ( case_status_name )
    `)
    .in('case_report_id', ids)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error

  const userIds = [...new Set((data || []).map((row) => row.changed_by_id).filter(Boolean))]
  let usersById = {}
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds)
    if (usersError) throw usersError
    usersById = (users || []).reduce((map, user) => {
      map[user.user_id] = user
      return map
    }, {})
  }

  return (data || []).reduce((map, row) => {
    if (!map[row.case_report_id]) map[row.case_report_id] = []
    map[row.case_report_id].push({
      historyId: row.history_id,
      displayId: row.display_id,
      status: row.case_status?.case_status_name || STATUS_NAME_BY_ID[row.case_status_id] || null,
      date: new Date(row.approved_at || row.created_at).toLocaleDateString('en-PH'),
      by: formatActorName(usersById[row.changed_by_id], row.changed_by_role),
      notes: row.notes,
      formData: row.form_data,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
    })
    return map
  }, {})
}

async function getPublicLogsByCase(caseReportId) {
  const { data, error } = await supabase
    .from('legal_review_logs')
    .select('legal_review_log_id, action_type, public_message, performed_by_user_id, performed_at')
    .eq('case_report_id', caseReportId)
    .eq('is_public', true)
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
    assignments.find((a) => a.assignment_role === 'lawyer')?.legal_personnel_id ||
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

async function logAction({ legalReviewId, caseReportId, actionType, remarks, performedByUserId, isPublic = false, publicMessage = null }) {
  const { data, error } = await supabase
    .from('legal_review_logs')
    .insert([{
      legal_review_id: legalReviewId,
      case_report_id: caseReportId,
      action_type: actionType,
      remarks: remarks?.slice(0, 500) || null,
      is_public: isPublic,
      public_message: isPublic ? publicMessage : null,
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
  getLatestByCaseIds,
  getCaseIdsByEndorsedTo,
  getManagementStats,
  getLogsByReview,
  getLogsByReviewIds,
  getPendingStatusHistoryByCaseIds,
  getPublicLogsByCase,
  resolveLegalPersonnelId,
  createForCase,
  updateReview,
  logAction,
}
