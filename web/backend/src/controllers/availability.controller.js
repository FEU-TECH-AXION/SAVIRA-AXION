const AvailabilityModel = require('../models/availability.model')
const {
  fireAndForget,
  notifyRoleUsers,
} = require('../services/notificationService')

const STATUSES = ['Available', 'Busy', 'On Leave', 'Out of Office']
const REASSIGNMENT_STATUSES = ['On Leave', 'Out of Office']
const REASONS = ['Vacation', 'Sick Leave', 'Family/Emergency', 'Field Work', 'Training', 'Personal', 'Other']

function canAccessUser(req) {
  const isAdmin = Number(req.user?.role_id) === 3
  const isSelf = String(req.user?.id) === String(req.params.userId)
  return { isAdmin, isSelf, allowed: isAdmin || isSelf }
}

function validateAvailabilityReason(payload) {
  if (!payload || !REASSIGNMENT_STATUSES.includes(payload.availability_status)) return null
  if (!Object.prototype.hasOwnProperty.call(payload, 'availability_reason')) return null

  const reason = String(payload.availability_reason || '').trim()
  const detail = String(payload.availability_note || '').trim()

  if (!reason) return 'Availability reason is required for On Leave or Out of Office.'
  if (!REASONS.includes(reason)) return 'Invalid availability reason.'
  if (reason === 'Other' && !detail) return 'Please provide details when the availability reason is Other.'
  return null
}

function formatWorkParts(summary) {
  return [
    summary.cases > 0 ? `${summary.cases} ${summary.cases === 1 ? 'case' : 'cases'}` : null,
    summary.legal > 0 ? `${summary.legal} legal ${summary.legal === 1 ? 'assignment' : 'assignments'}` : null,
    summary.volunteer > 0 ? `${summary.volunteer} ${summary.volunteer === 1 ? 'review' : 'reviews'}` : null,
    summary.projects > 0 ? `${summary.projects} ${summary.projects === 1 ? 'project' : 'projects'}` : null,
  ].filter(Boolean)
}

async function notifyAdminsAboutReassignment(userId, newStatus) {
  const summary = await AvailabilityModel.getActiveWorkSummary(userId)
  if (summary.total <= 0) return

  const workParts = formatWorkParts(summary)
  await notifyRoleUsers(['Admin'], {
    title: 'Reassignment may be needed',
    body: `${summary.name} is now ${newStatus} with ${summary.total} active assignment${summary.total === 1 ? '' : 's'} (${workParts.join(', ')}). This work was not automatically reassigned.`,
    data: {
      type: 'availability_reassignment',
      user_id: userId,
      link: '/staffAvailability',
      priority: 'high',
    },
  })
}

const getItems = async (req, res) => {
  try {
    const data = await AvailabilityModel.getAll()
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getItem = async (req, res) => {
  try {
    const { allowed } = canAccessUser(req)
    if (!allowed) {
      return res.status(403).json({ error: 'You can only view your own availability.' })
    }

    const userId = req.params.userId
    const [record, activeWork] = await Promise.all([
      AvailabilityModel.getAvailabilityRecord(userId),
      AvailabilityModel.getActiveWorkSummary(userId),
    ])

    if (!record) return res.status(404).json({ error: 'Availability record not found.' })

    res.json({
      data: {
        availability_status: record.availability_status || 'Available',
        availability_note: record.availability_note || null,
        availability_reason: record.availability_reason || null,
        active_work: activeWork,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const { allowed } = canAccessUser(req)
    if (!allowed) {
      return res.status(403).json({ error: 'You can only update your own availability.' })
    }
    if (req.body.availability_status && !STATUSES.includes(req.body.availability_status)) {
      return res.status(400).json({ error: 'Invalid availability status.' })
    }
    const reasonError = validateAvailabilityReason(req.body)
    if (reasonError) return res.status(400).json({ error: reasonError })

    const userId = req.params.userId
    const hasStatusChange = Object.prototype.hasOwnProperty.call(req.body, 'availability_status')
    const newStatus = req.body.availability_status
    const shouldCheckTransition = hasStatusChange && REASSIGNMENT_STATUSES.includes(newStatus)
    const previousStatus = shouldCheckTransition
      ? await AvailabilityModel.getAvailabilityStatus(userId)
      : null

    const data = await AvailabilityModel.update(userId, req.body)

    if (shouldCheckTransition && previousStatus !== newStatus) {
      fireAndForget(
        notifyAdminsAboutReassignment(userId, newStatus),
        'availability reassignment notice'
      )
    }

    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getItems, getItem, updateItem }
