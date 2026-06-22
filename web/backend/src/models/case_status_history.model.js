const supabase = require('../config/supabase')

// Reverse map of your frontend STATUS_STEP — needed to convert
// status name (string) back to case_status_id (int) for DB inserts
const STATUS_ID_MAP = {
  "Submitted":               1,
  "For Verification":        2,
  "Undergoing Review":       3,
  "Verified - True":         4,
  "Verified - False":        5,
  "Under Case Evaluation":   6,
  "Case Filed":              7,
  "Investigation Ongoing":   8,
  "Hearing Ongoing":         9,
  "Dismissed":               10,
  "Perpetrator Convicted":   11,
  "Resolved":                12,
  "Withdrawn":               13
}

const APPROVAL_REQUIRED_STATUSES = new Set([
  'Verified - True',
  'Verified - False',
  'Case Filed',
  'Dismissed',
  'Perpetrator Convicted',
  'Resolved',
])

// Fetch all approved history entries for a case — used by the
// StatusHistorySection component on the frontend
const getByCaseReport = async (caseReportId, { staffView = false } = {}) => {
  let query = supabase
    .from('case_status_history')
    .select(`
      history_id,
      display_id,
      case_status_id,
      changed_by_id,
      changed_by_role,
      notes,
      form_data,
      approval_status,
      approved_by_id,
      approved_at,
      rejection_reason,
      created_at,
      case_status ( case_status_name )
    `)
    .eq('case_report_id', caseReportId)
    .order('created_at', { ascending: true })

  // Complainants only see approved entries; staff see everything
  if (!staffView) {
    query = query.eq('approval_status', 'approved')
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Called when an officer submits a status change modal —
// creates a pending record that waits for admin approval
const create = async ({
    caseReportId,
    caseStatusId,
    changedById,
    changedByRole,
    notes,
    formData,
    approvalStatus = 'approved',   // default approved — no pending queue for now
    approvedAt     = null,
    approvedById   = null,
}) => {
  const { data, error } = await supabase
    .from('case_status_history')
    .insert([{
      case_report_id:  caseReportId,
      case_status_id:  caseStatusId,
      changed_by_id:   changedById,
      changed_by_role: changedByRole,
      notes,
      form_data:       formData,
      approval_status: approvalStatus,
      approved_at:     approvedAt,
      approved_by_id:  approvedById,
    }])
    .select()
  if (error) throw error
  return data[0]
}

// Admin approves: update history row + update case_reports.case_status_id
const approve = async (historyId, approvedById) => {
  async function updateApproval(approverValue) {
    return supabase
      .from('case_status_history')
      .update({
        approval_status: 'approved',
        approved_by_id:  approverValue,
        approved_at:     new Date().toISOString(),
      })
      .eq('history_id', historyId)
      .eq('approval_status', 'pending')
      .select()
      .maybeSingle()
  }

  // 1. Mark the history row as approved
  let { data: historyRow, error: histErr } = await updateApproval(approvedById)
  if (histErr?.code === '22P02' && String(histErr.message || '').includes('integer')) {
    ;({ data: historyRow, error: histErr } = await updateApproval(null))
  }
  if (histErr) throw histErr
  if (!historyRow) throw new Error('Pending status change not found or already reviewed.')

  // 2. Promote the new status to the case report itself
  const { error: caseErr } = await supabase
    .from('case_reports')
    .update({ case_status_id: historyRow.case_status_id })
    .eq('case_report_id', historyRow.case_report_id)
  if (caseErr) throw caseErr

  return historyRow
}

// Admin rejects: mark as rejected with a reason, no case_report update
const reject = async (historyId, approvedById, rejectionReason) => {
  async function updateRejection(approverValue) {
    return supabase
      .from('case_status_history')
      .update({
        approval_status:  'rejected',
        approved_by_id:   approverValue,
        approved_at:      new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('history_id', historyId)
      .eq('approval_status', 'pending')
      .select()
      .maybeSingle()
  }

  let { data, error } = await updateRejection(approvedById)
  if (error?.code === '22P02' && String(error.message || '').includes('integer')) {
    ;({ data, error } = await updateRejection(null))
  }
  if (error) throw error
  if (!data) throw new Error('Pending status change not found or already reviewed.')
  return data
}

// Check if a case already has a pending approval — used to
// block duplicate submissions (matches the frontend pendingApproval check)
const getPending = async (caseReportId) => {
  const { data, error } = await supabase
    .from('case_status_history')
    .select('*')
    .eq('case_report_id', caseReportId)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() // returns null instead of error if none found
  if (error) throw error
  return data
}

const getById = async (historyId) => {
  const { data, error } = await supabase
    .from('case_status_history')
    .select('*')
    .eq('history_id', historyId)
    .maybeSingle()
  if (error) throw error
  return data
}

const reviewWithdrawal = async ({
  historyId,
  approvedById,
  decision,
  rejectionReason = null,
  originIp = null,
}) => {
  const { data, error } = await supabase.rpc('review_case_withdrawal', {
    p_history_id: historyId,
    p_reviewed_by_user_id: approvedById,
    p_decision: decision,
    p_rejection_reason: rejectionReason,
    p_origin_ip: originIp,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

module.exports = {
  getByCaseReport,
  getById,
  create,
  approve,
  reject,
  getPending,
  reviewWithdrawal,
  STATUS_ID_MAP,
  APPROVAL_REQUIRED_STATUSES,
}
