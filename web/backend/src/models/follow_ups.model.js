const supabase = require('../config/supabase')

const ACTIVE_STATUSES = ['open', 'responded']

async function getCaseAccess(caseId, userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('user_id, email, first_name, last_name, roles(role_name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (userError) throw userError
  if (!user) return null

  const { data: report, error: reportError } = await supabase
    .from('case_reports')
    .select('case_report_id, case_status_id, complainant_id')
    .eq('case_report_id', caseId)
    .eq('is_current', true)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) return null

  const roleName = String(user.roles?.role_name || '').toLowerCase()
  const isStaff = ['admin', 'case officer', 'case_officer', 'legal personnel', 'legal_personnel', 'staff']
    .includes(roleName)
  const canManageFollowUps = ['admin', 'case officer', 'case_officer'].includes(roleName)

  let isOwner = false
  if (!isStaff) {
    const { data: complainant, error } = await supabase
      .from('complainants')
      .select('user_id')
      .eq('complainant_id', report.complainant_id)
      .maybeSingle()
    if (error) throw error
    isOwner = complainant?.user_id === userId
  }

  return { report, user, roleName, isStaff, isOwner, canManageFollowUps }
}

async function createRequest(payload) {
  const { data, error } = await supabase
    .from('follow_up_requests')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

async function listByCase(caseId) {
  const { data, error } = await supabase
    .from('follow_up_requests')
    .select(`
      *,
      initiator:users!follow_up_requests_initiated_by_user_id_fkey(
        user_id, first_name, last_name
      ),
      resolver:users!follow_up_requests_resolved_by_user_id_fkey(
        user_id, first_name, last_name
      ),
      follow_up_messages(
        *,
        sender:users!follow_up_messages_sender_user_id_fkey(
          user_id, first_name, last_name
        )
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data || []).map((request) => ({
    ...request,
    follow_up_messages: [...(request.follow_up_messages || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }))
}

async function getRequest(id) {
  const { data, error } = await supabase
    .from('follow_up_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

async function addMessage(payload, awaitingRole) {
  const { data, error } = await supabase
    .from('follow_up_messages')
    .insert([payload])
    .select()
    .single()
  if (error) throw error

  const { error: updateError } = await supabase
    .from('follow_up_requests')
    .update({
      status: 'responded',
      awaiting_role: awaitingRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.follow_up_request_id)
    .in('status', ACTIVE_STATUSES)
  if (updateError) throw updateError
  return data
}

async function updateStatus(id, status, resolvedByUserId) {
  const terminal = ['resolved', 'rejected'].includes(status)
  const updates = {
    status,
    updated_at: new Date().toISOString(),
    resolved_at: terminal ? new Date().toISOString() : null,
    resolved_by_user_id: terminal ? resolvedByUserId : null,
  }
  if (terminal) updates.awaiting_role = null
  const { data, error } = await supabase
    .from('follow_up_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

module.exports = {
  ACTIVE_STATUSES,
  getCaseAccess,
  createRequest,
  listByCase,
  getRequest,
  addMessage,
  updateStatus,
}
