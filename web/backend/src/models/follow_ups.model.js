const supabase = require('../config/supabase')
const { buildApprovedFieldUpdate } = require('./case_field_changes')

const ACTIVE_STATUSES = ['open', 'responded']

async function getCaseAccess(caseId, userId) {
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('user_id, email, first_name, last_name, roles(role_name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (userError) {
    const fallback = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name, role_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (fallback.error) throw userError
    user = fallback.data
    if (user?.role_id) {
      const { data: role } = await supabase
        .from('roles')
        .select('role_name')
        .eq('role_id', user.role_id)
        .maybeSingle()
      user.roles = role || null
    }
    userError = null
  }
  if (userError) throw userError
  if (!user) return null

  const { data: report, error: reportError } = await supabase
    .from('case_reports')
    .select('*')
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

async function createRequestWithChanges(payload, changes) {
  const { data, error } = await supabase.rpc('create_follow_up_with_pending_field_changes_v2', {
    p_request: payload,
    p_changes: changes,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

async function applyFieldChanges(requestId, caseId, userId, changes, message) {
  const { data, error } = await supabase.rpc('record_case_field_changes_v2', {
    p_follow_up_request_id: requestId,
    p_case_id: caseId,
    p_changed_by_user_id: userId,
    p_changes: changes,
    p_system_message: message,
  })
  if (error) throw error
  return data
}

async function listByCase(caseId) {
  const { data, error } = await supabase
    .from('follow_up_requests')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const requestIds = (data || []).map((request) => request.id)
  const userIds = new Set()
  for (const request of data || []) {
    if (request.initiated_by_user_id) userIds.add(request.initiated_by_user_id)
    if (request.resolved_by_user_id) userIds.add(request.resolved_by_user_id)
  }

  let messages = []
  if (requestIds.length > 0) {
    try {
      const { data: messageRows, error: messageError } = await supabase
        .from('follow_up_messages')
        .select('*')
        .in('follow_up_request_id', requestIds)
        .order('created_at', { ascending: true })
      if (messageError) {
        console.warn('[listByCase] Follow-up messages unavailable:', messageError.message)
      } else {
        messages = messageRows || []
        for (const message of messages) {
          if (message.sender_user_id) userIds.add(message.sender_user_id)
        }
      }
    } catch (messageError) {
      console.warn('[listByCase] Follow-up messages unavailable:', messageError.message)
    }
  }

  let usersById = new Map()
  if (userIds.size > 0) {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', [...userIds])
      if (usersError) {
        console.warn('[listByCase] Follow-up participant names unavailable:', usersError.message)
      } else {
        usersById = new Map((users || []).map((user) => [user.user_id, user]))
      }
    } catch (usersError) {
      console.warn('[listByCase] Follow-up participant names unavailable:', usersError.message)
    }
  }

  const messagesByRequest = new Map()
  for (const message of messages) {
    const current = messagesByRequest.get(message.follow_up_request_id) || []
    current.push({
      ...message,
      sender: usersById.get(message.sender_user_id) || null,
    })
    messagesByRequest.set(message.follow_up_request_id, current)
  }

  const requests = (data || []).map((request) => ({
    ...request,
    initiator: usersById.get(request.initiated_by_user_id) || null,
    resolver: usersById.get(request.resolved_by_user_id) || null,
    follow_up_messages: messagesByRequest.get(request.id) || [],
    field_changes: [],
  }))

  if (requests.length === 0) return requests

  let changes = []
  try {
    const result = await supabase
      .from('field_changes')
      .select('id, follow_up_request_id, field_key, previous_value, new_value, changed_by_user_id, changed_at')
      .in('follow_up_request_id', requests.map((request) => request.id))
      .order('changed_at', { ascending: true })
    if (result.error) {
      console.warn('[listByCase] Field-change audit unavailable:', result.error.message)
      return requests
    }
    changes = result.data || []
  } catch (changesError) {
    console.warn('[listByCase] Field-change audit unavailable:', changesError.message)
    return requests
  }

  const changesByRequest = new Map()
  for (const change of changes) {
    const current = changesByRequest.get(change.follow_up_request_id) || []
    current.push(change)
    changesByRequest.set(change.follow_up_request_id, current)
  }

  return requests.map((request) => ({
    ...request,
    field_changes: changesByRequest.get(request.id) || [],
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

async function getActiveRequest(caseId, type) {
  const { data, error } = await supabase
    .from('follow_up_requests')
    .select('id, status')
    .eq('case_id', caseId)
    .eq('type', type)
    .in('status', ACTIVE_STATUSES)
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

async function addMessageRecord(payload) {
  const { data, error } = await supabase
    .from('follow_up_messages')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateStatus(id, status, resolvedByUserId) {
  // 'cancelled' is stored as 'rejected' in the DB (same CHECK constraint value)
  // but is distinguished from a staff rejection by the resolution message written to follow_up_messages.
  const dbStatus = status === 'cancelled' ? 'rejected' : status
  const terminal = ['resolved', 'rejected', 'cancelled'].includes(status)
  const updates = {
    status: dbStatus,
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

async function reconcileResolvedFieldChanges(requestId) {
  const request = await getRequest(requestId)
  if (!request) throw new Error('Follow-up not found.')

  const { data: report, error: reportError } = await supabase
    .from('case_reports')
    .select('*')
    .eq('case_report_id', request.case_id)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) throw new Error('Case report not found.')

  const { data: changes, error: changesError } = await supabase
    .from('field_changes')
    .select('field_key, new_value, changed_at')
    .eq('follow_up_request_id', requestId)
    .order('changed_at', { ascending: true })
  if (changesError) throw changesError

  const update = buildApprovedFieldUpdate(changes || [], report)
  if (Object.keys(update).length === 0) return null

  const { data, error } = await supabase
    .from('case_reports')
    .update(update)
    .eq('case_report_id', request.case_id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateStatusWithMessage(id, status, resolvedByUserId, message, awaitingRole = null) {
  const { data: messageRecord, error: messageError } = await supabase
    .from('follow_up_messages')
    .insert([{
      follow_up_request_id: id,
      sender_user_id: resolvedByUserId,
      message,
    }])
    .select()
    .single()
  if (messageError) throw messageError

  try {
    if (status === 'open') {
      const { data, error } = await supabase
        .from('follow_up_requests')
        .update({
          status: 'open',
          awaiting_role: awaitingRole,
          resolved_at: null,
          resolved_by_user_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    }
    if (status === 'resolved') {
      const { data, error } = await supabase.rpc('resolve_follow_up_field_changes', {
        p_follow_up_request_id: id,
        p_resolved_by_user_id: resolvedByUserId,
      })
      if (error) throw error
      try {
        await reconcileResolvedFieldChanges(id)
      } catch (reconcileError) {
        // The RPC remains the transactional source of truth. This second pass
        // repairs older/reopened requests whose audited values were not copied
        // to the current case row, but must not turn a committed resolution
        // into an apparent failure for the reviewer.
        console.warn(
          '[updateStatusWithMessage] Resolved field reconciliation unavailable:',
          reconcileError.message
        )
      }
      return Array.isArray(data) ? data[0] : data
    }
    return await updateStatus(id, status, resolvedByUserId)
  } catch (error) {
    const { error: cleanupError } = await supabase
      .from('follow_up_messages')
      .delete()
      .eq('id', messageRecord.id)
    if (cleanupError) {
      console.error('[updateStatusWithMessage] Failed to remove resolution message:', cleanupError.message)
    }
    throw error
  }
}

module.exports = {
  ACTIVE_STATUSES,
  getCaseAccess,
  createRequest,
  createRequestWithChanges,
  applyFieldChanges,
  listByCase,
  getRequest,
  getActiveRequest,
  addMessage,
  addMessageRecord,
  updateStatus,
  reconcileResolvedFieldChanges,
  updateStatusWithMessage,
}
