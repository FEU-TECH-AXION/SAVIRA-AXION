const supabase = require('../config/supabase')

const PROJECT_MANAGER_ROLES = new Set(['Admin', 'Project Officer'])
const PROJECT_EDIT_MESSAGE = 'Only admins and assigned project officers can update project information.'
const TASK_EDIT_MESSAGE = 'Only admins, project officers, assigned project officers, or the assigned staff member can update this task.'

async function getProjectId(req, source) {
  if (source === 'project') return req.params.projectId || req.params.id
  if (source === 'task') {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('project_id')
      .eq('task_id', req.params.taskId)
      .maybeSingle()

    if (error) throw error
    return data?.project_id
  }
  return null
}

async function getStaffId(userId) {
  if (!userId) return ''
  const { data, error } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.staff_id || null
}

async function getTask(taskId) {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('task_id, project_id, assigned_to, status')
    .eq('task_id', taskId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function hasProjectOfficerAssignment(projectId, staffId) {
  if (!projectId || !staffId) return false
  const { data, error } = await supabase
    .from('project_assignments')
    .select('assignment_id')
    .eq('project_id', projectId)
    .eq('staff_id', staffId)
    .eq('project_role', 'officer')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

function forbidden(res, message = PROJECT_EDIT_MESSAGE) {
  return res.status(403).json({
    error: message,
    code: 'PROJECT_PERMISSION_DENIED',
  })
}

function requireProjectManager(source = 'project') {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
      if (PROJECT_MANAGER_ROLES.has(req.user.role)) return next()

      const projectId = await getProjectId(req, source)
      if (!projectId) return res.status(404).json({ error: 'Project not found.' })

      const staffId = await getStaffId(req.user.id || req.user.user_id)
      if (!staffId) return forbidden(res)

      if (await hasProjectOfficerAssignment(projectId, staffId)) {
        return next()
      }

      return forbidden(res)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

function requireProjectTaskEditor() {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

      const task = await getTask(req.params.taskId)
      if (!task) return res.status(404).json({ error: 'Task not found.' })

      if (PROJECT_MANAGER_ROLES.has(req.user.role)) {
        req.projectTaskAccess = 'manager'
        req.projectTask = task
        return next()
      }

      const staffId = await getStaffId(req.user.id || req.user.user_id)
      if (!staffId) return forbidden(res, TASK_EDIT_MESSAGE)

      if (await hasProjectOfficerAssignment(task.project_id, staffId)) {
        req.projectTaskAccess = 'manager'
        req.projectTask = task
        return next()
      }

      if (String(task.assigned_to || '') === String(staffId)) {
        if (task.status === 'Cancelled') {
          return forbidden(res, 'Cancelled tasks can only be changed by admins and project officers.')
        }
        req.projectTaskAccess = 'assignee'
        req.projectTask = task
        return next()
      }

      return forbidden(res, TASK_EDIT_MESSAGE)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

module.exports = requireProjectManager
module.exports.requireProjectTaskEditor = requireProjectTaskEditor
