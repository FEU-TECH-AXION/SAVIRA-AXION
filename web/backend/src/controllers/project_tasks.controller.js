const ProjectTasks = require('../models/project_tasks.model')

const actorId = (req) => req.user?.id || req.user?.user_id
const ASSIGNEE_UPDATE_FIELDS = new Set(['description', 'status'])
const ASSIGNEE_STATUSES = new Set(['Pending', 'In Progress', 'Completed'])

function assignedTaskPayload(payload = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([key]) => ASSIGNEE_UPDATE_FIELDS.has(key))
  )
  if (cleaned.status && !ASSIGNEE_STATUSES.has(cleaned.status)) {
    const err = new Error('Assigned staff can only set task status to Pending, In Progress, or Completed.')
    err.status = 400
    throw err
  }
  return cleaned
}

async function list(req, res) {
  try {
    res.json({ data: await ProjectTasks.listByProject(req.params.projectId) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function listAll(req, res) {
  try {
    res.json({ data: await ProjectTasks.listAll() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function create(req, res) {
  try {
    if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Task title is required.' })
    const data = await ProjectTasks.create(req.params.projectId, req.body, actorId(req))
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function update(req, res) {
  try {
    const payload = req.projectTaskAccess === 'assignee'
      ? assignedTaskPayload(req.body)
      : req.body
    if (Object.keys(payload || {}).length === 0) {
      return res.status(400).json({ error: 'No permitted task fields were provided.' })
    }
    res.json({ data: await ProjectTasks.update(req.params.taskId, payload, actorId(req)) })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function cancel(req, res) {
  try {
    res.json({ data: await ProjectTasks.cancel(req.params.taskId, actorId(req)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function activity(req, res) {
  try {
    res.json({ data: await ProjectTasks.listActivity(req.params.taskId) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listAll, list, create, update, cancel, activity }
