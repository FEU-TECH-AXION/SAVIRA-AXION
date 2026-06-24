const supabase = require('../config/supabase')

const TASK_FIELDS = [
  'assigned_to', 'title', 'description', 'status', 'priority', 'due_date',
]

const selectColumns = `
  *,
  projects (
    project_id,
    event_name,
    project_status,
    due_date
  ),
  staff!project_tasks_assigned_to_fkey (
    staff_id,
    user_id,
    committees (committee_id, committee_name),
    users (user_id, first_name, last_name, email)
  )
`

const normalize = (row) => {
  if (!row) return null
  const user = row.staff?.users
  const overdue = row.due_date &&
    row.status !== 'Completed' &&
    row.status !== 'Cancelled' &&
    new Date(`${row.due_date}T00:00:00`) < new Date(new Date().toDateString())
  return {
    ...row,
    display_status: overdue ? 'Overdue' : row.status,
    assignee: row.staff ? {
      staff_id: row.staff.staff_id,
      user_id: row.staff.user_id || user?.user_id,
      name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      email: user?.email || '',
      committee_id: row.staff.committees?.committee_id,
      committee_name: row.staff.committees?.committee_name || '',
    } : null,
    project: row.projects ? {
      id: row.projects.project_id,
      title: row.projects.event_name,
      status: row.projects.project_status,
      dueDate: row.projects.due_date,
    } : null,
    projects: undefined,
    staff: undefined,
  }
}

async function listAll() {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(selectColumns)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalize)
}

async function listByProject(projectId) {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(selectColumns)
    .eq('project_id', projectId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalize)
}

async function create(projectId, payload, userId) {
  const insert = Object.fromEntries(
    Object.entries(payload || {}).filter(([key]) => TASK_FIELDS.includes(key))
  )
  insert.project_id = Number(projectId)
  insert.created_by = userId
  const { data, error } = await supabase
    .from('project_tasks')
    .insert([insert])
    .select(selectColumns)
    .single()
  if (error) throw error
  await logActivity(data.task_id, userId, 'created', null, data.status, { title: data.title })
  return normalize(data)
}

async function update(taskId, payload, userId) {
  const { data: before, error: beforeError } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('task_id', taskId)
    .single()
  if (beforeError) throw beforeError

  const changes = Object.fromEntries(
    Object.entries(payload || {}).filter(([key]) => TASK_FIELDS.includes(key))
  )
  const { data, error } = await supabase
    .from('project_tasks')
    .update(changes)
    .eq('task_id', taskId)
    .select(selectColumns)
    .single()
  if (error) throw error

  await logActivity(
    taskId,
    userId,
    before.status !== data.status ? 'status_changed' : 'updated',
    before.status,
    data.status,
    changes
  )
  return normalize(data)
}

async function cancel(taskId, userId) {
  return update(taskId, { status: 'Cancelled' }, userId)
}

async function listActivity(taskId) {
  const { data, error } = await supabase
    .from('task_activity_log')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function logActivity(taskId, userId, action, oldStatus, newStatus, details) {
  const { error } = await supabase.from('task_activity_log').insert([{
    task_id: taskId,
    changed_by: userId || null,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    details: details || {},
  }])
  if (error) throw error
}

module.exports = { listAll, listByProject, create, update, cancel, listActivity }
