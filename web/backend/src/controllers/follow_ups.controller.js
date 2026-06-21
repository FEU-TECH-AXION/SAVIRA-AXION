const { randomUUID } = require('crypto')
const supabase = require('../config/supabase')
const FollowUps = require('../models/follow_ups.model')

const TERMINAL_CASE_STATUSES = new Set([10, 11, 12, 13])
const ALLOWED_TYPES = new Set(['user_change_request', 'officer_clarification_request'])
const ALLOWED_REASONS = new Set(['Correction needed', 'Additional info', 'Other'])
const ALLOWED_STATUS_UPDATES = new Set(['resolved', 'rejected'])
const ATTACHMENT_BUCKET = 'case-evidence'

function actorId(req) {
  return req.user?.id || req.user?.user_id
}

function roleFor(access, type) {
  if (type === 'user_change_request') return 'user'
  return access.roleName === 'admin' ? 'admin' : 'officer'
}

async function uploadAttachment(caseId, requestId, file) {
  if (!file) return {}
  const extension = file.originalname.includes('.')
    ? `.${file.originalname.split('.').pop()}`
    : ''
  const path = `${caseId}/follow-ups/${requestId || 'new'}/${randomUUID()}${extension}`
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
  if (error) throw error
  return {
    attachment_path: path,
    attachment_name: file.originalname,
    attachment_mime_type: file.mimetype,
  }
}

async function addSignedUrls(requests) {
  const paths = []
  for (const request of requests) {
    if (request.attachment_path) paths.push(request.attachment_path)
    for (const message of request.follow_up_messages || []) {
      if (message.attachment_path) paths.push(message.attachment_path)
    }
  }
  if (paths.length === 0) return requests

  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(paths, 60 * 60)
  const urlByPath = new Map((data || []).map((item) => [item.path, item.signedUrl]))
  return requests.map((request) => ({
    ...request,
    attachment_url: urlByPath.get(request.attachment_path) || null,
    follow_up_messages: (request.follow_up_messages || []).map((message) => ({
      ...message,
      attachment_url: urlByPath.get(message.attachment_path) || null,
    })),
  }))
}

async function createFollowUp(req, res) {
  try {
    const caseId = Number(req.params.id)
    const userId = actorId(req)
    const { type, reason_category, message, blocks_processing } = req.body
    if (!Number.isInteger(caseId) || !userId) return res.status(400).json({ error: 'Invalid request.' })
    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ error: 'Invalid follow-up type.' })
    if (!String(message || '').trim()) return res.status(400).json({ error: 'A message is required.' })
    if (String(message).trim().length > 4000) return res.status(400).json({ error: 'Message is too long.' })
    if (type === 'user_change_request' && !ALLOWED_REASONS.has(reason_category)) {
      return res.status(400).json({ error: 'Select a valid reason.' })
    }

    const access = await FollowUps.getCaseAccess(caseId, userId)
    if (!access) return res.status(404).json({ error: 'Case not found.' })
    if (TERMINAL_CASE_STATUSES.has(Number(access.report.case_status_id))) {
      return res.status(409).json({ error: 'Follow-ups are not available for this case status.' })
    }
    if (type === 'user_change_request' && !access.isOwner) {
      return res.status(403).json({ error: 'Only the complainant can request a change.' })
    }
    if (type === 'officer_clarification_request' && !access.canManageFollowUps) {
      return res.status(403).json({ error: 'Only authorized staff can request clarification.' })
    }

    const attachment = await uploadAttachment(caseId, null, req.file)
    const request = await FollowUps.createRequest({
      case_id: caseId,
      initiated_by_user_id: userId,
      initiated_by_role: roleFor(access, type),
      type,
      reason_category: type === 'user_change_request' ? reason_category : null,
      message: String(message).trim(),
      awaiting_role: type === 'officer_clarification_request' ? 'user' : 'officer',
      blocks_processing: type === 'officer_clarification_request' &&
        String(blocks_processing) === 'true',
      ...attachment,
    })

    return res.status(201).json({ data: request })
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A follow-up of this type is already in progress.' })
    }
    console.error('[createFollowUp]', error.message)
    return res.status(500).json({ error: 'Failed to create follow-up.' })
  }
}

async function listFollowUps(req, res) {
  try {
    const caseId = Number(req.params.id)
    const access = await FollowUps.getCaseAccess(caseId, actorId(req))
    if (!access || (!access.isStaff && !access.isOwner)) {
      return res.status(403).json({ error: 'You cannot view follow-ups for this case.' })
    }
    const requests = await addSignedUrls(await FollowUps.listByCase(caseId))
    return res.json({ data: requests })
  } catch (error) {
    console.error('[listFollowUps]', error.message)
    return res.status(500).json({ error: 'Failed to load follow-ups.' })
  }
}

async function replyToFollowUp(req, res) {
  try {
    const id = Number(req.params.id)
    const request = await FollowUps.getRequest(id)
    if (!request) return res.status(404).json({ error: 'Follow-up not found.' })
    if (!FollowUps.ACTIVE_STATUSES.includes(request.status)) {
      return res.status(409).json({ error: 'This follow-up is already closed.' })
    }
    const access = await FollowUps.getCaseAccess(request.case_id, actorId(req))
    if (!access || (!access.isStaff && !access.isOwner)) {
      return res.status(403).json({ error: 'You cannot reply to this follow-up.' })
    }
    if (!String(req.body.message || '').trim()) return res.status(400).json({ error: 'A message is required.' })

    const attachment = await uploadAttachment(request.case_id, id, req.file)
    const message = await FollowUps.addMessage(
      {
        follow_up_request_id: id,
        sender_user_id: actorId(req),
        message: String(req.body.message).trim(),
        ...attachment,
      },
      access.isStaff ? 'user' : 'officer'
    )
    return res.status(201).json({ data: message })
  } catch (error) {
    console.error('[replyToFollowUp]', error.message)
    return res.status(500).json({ error: 'Failed to send reply.' })
  }
}

async function updateFollowUp(req, res) {
  try {
    const id = Number(req.params.id)
    const { status } = req.body
    if (!ALLOWED_STATUS_UPDATES.has(status)) return res.status(400).json({ error: 'Invalid status.' })
    const request = await FollowUps.getRequest(id)
    if (!request) return res.status(404).json({ error: 'Follow-up not found.' })
    const access = await FollowUps.getCaseAccess(request.case_id, actorId(req))
    if (!access?.canManageFollowUps) return res.status(403).json({ error: 'Only case officers or admins can close follow-ups.' })

    const updated = await FollowUps.updateStatus(id, status, actorId(req))
    return res.json({ data: updated })
  } catch (error) {
    console.error('[updateFollowUp]', error.message)
    return res.status(500).json({ error: 'Failed to update follow-up.' })
  }
}

module.exports = { createFollowUp, listFollowUps, replyToFollowUp, updateFollowUp }
