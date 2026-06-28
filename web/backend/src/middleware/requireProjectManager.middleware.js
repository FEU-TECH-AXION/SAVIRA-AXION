const supabase = require('../config/supabase')

const PROJECT_MANAGER_ROLES = new Set(['Admin', 'Project Officer'])

const normalizeName = (value) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const fullName = (user) =>
  normalizeName(`${user?.first_name || ''} ${user?.last_name || ''}`)

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

async function getUserName(userId) {
  if (!userId) return ''
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return fullName(data)
}

function requireProjectManager(source = 'project') {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
      if (PROJECT_MANAGER_ROLES.has(req.user.role)) return next()

      const projectId = await getProjectId(req, source)
      if (!projectId) return res.status(404).json({ error: 'Project not found.' })

      const { data: project, error } = await supabase
        .from('projects')
        .select('project_officers')
        .eq('project_id', projectId)
        .maybeSingle()

      if (error) throw error
      if (!project) return res.status(404).json({ error: 'Project not found.' })

      const actorName = fullName(req.user) || await getUserName(req.user.id || req.user.user_id)
      const projectOfficers = Array.isArray(project.project_officers)
        ? project.project_officers
        : []

      if (actorName && projectOfficers.some((name) => normalizeName(name) === actorName)) {
        return next()
      }

      return res.status(403).json({ error: 'Forbidden' })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

module.exports = requireProjectManager
