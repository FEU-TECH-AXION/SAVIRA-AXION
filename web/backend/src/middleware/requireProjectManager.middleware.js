const supabase = require('../config/supabase')

const PROJECT_MANAGER_ROLES = new Set(['Admin', 'Project Officer'])

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

function requireProjectManager(source = 'project') {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
      if (PROJECT_MANAGER_ROLES.has(req.user.role)) return next()

      const projectId = await getProjectId(req, source)
      if (!projectId) return res.status(404).json({ error: 'Project not found.' })

      const staffId = await getStaffId(req.user.id || req.user.user_id)
      if (!staffId) return res.status(403).json({ error: 'Forbidden' })

      const { data: assignment, error } = await supabase
        .from('project_assignments')
        .select('assignment_id')
        .eq('project_id', projectId)
        .eq('staff_id', staffId)
        .eq('project_role', 'officer')
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error
      if (assignment) {
        return next()
      }

      return res.status(403).json({ error: 'Forbidden' })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

module.exports = requireProjectManager
