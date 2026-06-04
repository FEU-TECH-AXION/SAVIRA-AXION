const supabase = require('../config/supabase')

// Reverse map of your frontend STATUS_STEP — needed to convert
// status name (string) back to case_status_id (int) for DB inserts
const STATUS_ID_MAP = {
  "For Verification":      1,
  "Undergoing Review":     2,
  "Verified - True":       3,
  "Verified - False":      4,
  "Under Case Evaluation": 5,
  "Case Filed":            6,
  "Investigation Ongoing": 7,
  "Hearing Ongoing":       8,
  "Dismissed":             9,
  "Perpetrator Convicted": 10,
}

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
const create = async ({ caseReportId, caseStatusId, changedById, changedByRole, notes, formData }) => {
  const { data, error } = await supabase
    .from('case_status_history')
    .insert([{
      case_report_id:  caseReportId,
      case_status_id:  caseStatusId,
      changed_by_id:   changedById,
      changed_by_role: changedByRole,
      notes,
      form_data:       formData,
      approval_status: 'pending',
    }])
    .select()
  if (error) throw error
  return data[0]
}

// Admin approves: update history row + update case_reports.case_status_id
const approve = async (historyId, approvedById) => {
  // 1. Mark the history row as approved
  const { data: historyRow, error: histErr } = await supabase
    .from('case_status_history')
    .update({
      approval_status: 'approved',
      approved_by_id:  approvedById,
      approved_at:     new Date().toISOString(),
    })
    .eq('history_id', historyId)
    .select()
    .single()
  if (histErr) throw histErr

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
  const { data, error } = await supabase
    .from('case_status_history')
    .update({
      approval_status:  'rejected',
      approved_by_id:   approvedById,
      approved_at:      new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq('history_id', historyId)
    .select()
    .single()
  if (error) throw error
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
    .maybeSingle() // returns null instead of error if none found
  if (error) throw error
  return data
}

module.exports = { getByCaseReport, create, approve, reject, getPending, STATUS_ID_MAP }