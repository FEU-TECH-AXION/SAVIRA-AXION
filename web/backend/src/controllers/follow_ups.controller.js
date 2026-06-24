const { randomUUID } = require('crypto')
const supabase = require('../config/supabase')
const FollowUps = require('../models/follow_ups.model')
const { FIELD_TO_COLUMN } = require('../models/case_field_changes')

const TERMINAL_CASE_STATUSES = new Set([10, 11, 12, 13])
const ALLOWED_TYPES = new Set(['user_change_request', 'officer_clarification_request'])
const ALLOWED_REASONS = new Set(['Correction needed', 'Additional info', 'Other'])
const ALLOWED_STATUS_UPDATES = new Set(['open', 'resolved', 'rejected', 'cancelled'])
const ATTACHMENT_BUCKET = 'case-evidence'
const EVIDENCE_FIELD = 'evidence.files'
const RESOLUTION_MESSAGES = {
  open: 'This follow-up has been reopened by the case team. You may continue the conversation in this thread.',
  resolved: 'The follow-up has been reviewed and the necessary action has been completed. This request is now marked as resolved.',
  rejected: 'The follow-up has been reviewed, but the requested action could not be approved. This request is now closed.',
  cancelled: 'This request has been cancelled by the person who submitted it.',
}

function actorId(req) {
  return req.user?.id || req.user?.user_id
}

function roleFor(access, type) {
  if (type === 'user_change_request') return 'user'
  return access.roleName === 'admin' ? 'admin' : 'officer'
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (_) {
    return fallback
  }
}

function normalizeRequestedFields(value) {
  const fields = parseJson(value, [])
  if (!Array.isArray(fields)) throw new Error('Invalid fields requested.')
  const unique = [...new Set(fields)]
  if (unique.some((field) => !FIELD_TO_COLUMN.has(field) && field !== EVIDENCE_FIELD)) {
    throw new Error('One or more requested fields cannot be amended.')
  }
  return unique
}

function normalizeChanges(value, allowedFields) {
  const changes = parseJson(value, [])
  if (!Array.isArray(changes)) throw new Error('Invalid field changes.')
  const seen = new Set()
  return changes.map((change) => {
    const fieldKey = String(change?.field_key || '')
    if (!FIELD_TO_COLUMN.has(fieldKey) || !allowedFields.includes(fieldKey) || seen.has(fieldKey)) {
      throw new Error('One or more field changes are invalid.')
    }
    seen.add(fieldKey)
    let newValue = change.new_value
    if (['incident.perpetratorKnown', 'incident.witnesses', 'incident.toldAnyone', 'incident.toldPolice'].includes(fieldKey)) {
      if (!['Yes', 'No', true, false].includes(newValue)) throw new Error('Select Yes or No for amended choice fields.')
      newValue = newValue === 'Yes' || newValue === true
    }
    if (fieldKey === 'incident.outcome') {
      if (!Array.isArray(newValue)) throw new Error('Requested outcomes must be a list.')
      // case_reports.action_requested is a text column in the current schema.
      // Store the selected outcomes as a readable comma-separated value.
      newValue = newValue.map((item) => String(item).trim()).filter(Boolean).join(', ')
    } else if (typeof newValue === 'string') {
      newValue = newValue.trim()
      if (newValue.length > 10000) throw new Error('An amended value is too long.')
    }
    return {
      field_key: fieldKey,
      column_name: FIELD_TO_COLUMN.get(fieldKey),
      new_value: newValue === '' ? null : newValue,
    }
  })
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

async function recordCaseEvidence(caseId, userId, file, attachment) {
  if (!file || !attachment?.attachment_path) return null
  const evidenceType = file.mimetype === 'application/pdf'
    ? 'document'
    : file.mimetype.startsWith('image/')
      ? 'photo'
      : file.mimetype.startsWith('video/')
        ? 'video'
        : 'other'
  const { data, error } = await supabase
    .from('evidences')
    .insert([{
      case_report_id: caseId,
      evidence_type: evidenceType,
      file_path: attachment.attachment_path,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by_id: userId,
    }])
    .select()
    .single()
  if (error) throw error
  return data
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
    if (
      type === 'user_change_request' &&
      reason_category === 'Other' &&
      String(message).trim() === 'I have another request regarding my case:'
    ) {
      return res.status(400).json({ error: 'Describe your request before submitting.' })
    }
    const fieldsRequested = normalizeRequestedFields(req.body.fields_requested)
    if (
      type === 'user_change_request' &&
      ['Correction needed', 'Additional info'].includes(reason_category) &&
      fieldsRequested.length === 0
    ) {
      return res.status(400).json({
        error: reason_category === 'Correction needed'
          ? 'Select at least one field to correct.'
          : 'Select the information or evidence you want to add.',
      })
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
    const activeRequest = await FollowUps.getActiveRequest(caseId, type)
    if (activeRequest) {
      return res.status(409).json({
        error: 'A follow-up of this type is already open. Continue in the existing thread.',
      })
    }

    const evidenceRequested = fieldsRequested.includes(EVIDENCE_FIELD)
    if (req.file && !evidenceRequested) {
      return res.status(400).json({ error: 'Attachments are only allowed when evidence is selected.' })
    }
    if (type === 'user_change_request' && evidenceRequested && !req.file) {
      return res.status(400).json({ error: 'Attach at least one evidence file.' })
    }
    const attachment = await uploadAttachment(caseId, null, req.file)
    if (evidenceRequested && req.file) {
      await recordCaseEvidence(caseId, userId, req.file, attachment)
    }
    const changes = type === 'user_change_request'
      ? normalizeChanges(req.body.field_changes, fieldsRequested)
      : []
    const submittedFields = type === 'user_change_request'
      ? [
          ...new Set([
            ...changes.map((change) => change.field_key),
            ...(evidenceRequested ? [EVIDENCE_FIELD] : []),
          ]),
        ]
      : fieldsRequested
    const requestPayload = {
      case_id: caseId,
      initiated_by_user_id: userId,
      initiated_by_role: roleFor(access, type),
      type,
      reason_category: type === 'user_change_request' ? reason_category : null,
      message: String(message).trim(),
      awaiting_role: type === 'officer_clarification_request' ? 'user' : 'officer',
      blocks_processing: type === 'officer_clarification_request' &&
        String(blocks_processing) === 'true',
      fields_requested: submittedFields,
      ...attachment,
    }
    if (
      type === 'user_change_request' &&
      fieldsRequested.some((field) => field !== EVIDENCE_FIELD) &&
      changes.length === 0
    ) {
      return res.status(400).json({ error: 'Change at least one selected field.' })
    }
    const request = changes.length > 0
      ? await FollowUps.createRequestWithChanges(requestPayload, changes)
      : await FollowUps.createRequest(requestPayload)

    return res.status(201).json({ data: request })
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'This closed follow-up is still covered by an outdated database uniqueness rule. Apply the follow-up lifecycle migration, then try again.',
      })
    }
    if ([
      'Invalid fields requested.',
      'One or more requested fields cannot be amended.',
      'Invalid field changes.',
      'One or more field changes are invalid.',
      'Select Yes or No for amended choice fields.',
      'Requested outcomes must be a list.',
      'An amended value is too long.',
    ].includes(error.message)) {
      return res.status(400).json({ error: error.message })
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
    const requests = (await addSignedUrls(await FollowUps.listByCase(caseId)))
      .map((request) => ({ ...request, report_data: access.report }))
    return res.json({ data: requests })
  } catch (error) {
    console.error('[listFollowUps]', error.message)
    return res.status(500).json({
      error: `Failed to load follow-ups: ${error.message}`,
    })
  }
}

async function amendCaseFields(req, res) {
  try {
    const caseId = Number(req.params.id)
    const requestId = Number(req.body.follow_up_request_id)
    const userId = actorId(req)
    if (!Number.isInteger(caseId) || !Number.isInteger(requestId) || !userId) {
      return res.status(400).json({ error: 'Invalid amendment request.' })
    }
    const request = await FollowUps.getRequest(requestId)
    if (!request || Number(request.case_id) !== caseId) {
      return res.status(404).json({ error: 'Follow-up not found.' })
    }
    const isActive = FollowUps.ACTIVE_STATUSES.includes(request.status)
    if (request.type !== 'officer_clarification_request' || request.awaiting_role !== 'user') {
      return res.status(409).json({ error: 'This follow-up is not awaiting a complainant correction.' })
    }
    const access = await FollowUps.getCaseAccess(caseId, userId)
    if (!access?.isOwner) return res.status(403).json({ error: 'Only the complainant can amend this case.' })

    const fieldsRequested = normalizeRequestedFields(request.fields_requested)
    const changes = normalizeChanges(req.body.changes, fieldsRequested)
    const evidenceRequested = fieldsRequested.includes(EVIDENCE_FIELD)
    if (req.file && !evidenceRequested) {
      return res.status(400).json({ error: 'Attachments are only allowed when evidence is requested.' })
    }
    if (evidenceRequested && !req.file) {
      return res.status(400).json({ error: 'Attach at least one evidence file.' })
    }
    if (!changes.length && !evidenceRequested) {
      return res.status(400).json({ error: 'Change at least one requested field.' })
    }
    const labels = changes.map((change) =>
      change.field_key.split('.').pop().replace(/([A-Z])/g, ' $1').trim()
    )
    if (changes.length) {
      await FollowUps.applyFieldChanges(
        requestId,
        caseId,
        userId,
        changes,
        `Updated ${labels.join(', ')}.`
      )
    }
    if (req.file) {
      const attachment = await uploadAttachment(caseId, requestId, req.file)
      await recordCaseEvidence(caseId, userId, req.file, attachment)
      const payload = {
        follow_up_request_id: requestId,
        sender_user_id: userId,
        message: changes.length ? 'Attached supporting evidence.' : 'Submitted the requested evidence.',
        ...attachment,
      }
      if (changes.length) await FollowUps.addMessageRecord(payload)
      else await FollowUps.addMessage(payload, 'officer')
    }
    return res.json({
      data: {
        request_id: requestId,
        changes_applied: changes.length,
        evidence_attached: Boolean(req.file),
      },
    })
  } catch (error) {
    console.error('[amendCaseFields]', error.message)
    return res.status(400).json({ error: error.message || 'Failed to amend case fields.' })
  }
}

async function replyToFollowUp(req, res) {
  try {
    const id = Number(req.params.id)
    const request = await FollowUps.getRequest(id)
    if (!request) return res.status(404).json({ error: 'Follow-up not found.' })
    const isActive = FollowUps.ACTIVE_STATUSES.includes(request.status)
    if (!isActive) {
      return res.status(409).json({ error: 'This follow-up is already closed.' })
    }
    const access = await FollowUps.getCaseAccess(request.case_id, actorId(req))
    if (!access || (!access.isStaff && !access.isOwner)) {
      return res.status(403).json({ error: 'You cannot reply to this follow-up.' })
    }
    if (!String(req.body.message || '').trim()) return res.status(400).json({ error: 'A message is required.' })
    const fieldsRequested = normalizeRequestedFields(request.fields_requested)
    if (req.file && !fieldsRequested.includes(EVIDENCE_FIELD)) {
      return res.status(400).json({ error: 'Attachments are only allowed for evidence follow-ups.' })
    }

    const attachment = await uploadAttachment(request.case_id, id, req.file)
    const payload = {
      follow_up_request_id: id,
      sender_user_id: actorId(req),
      message: String(req.body.message).trim(),
      ...attachment,
    }
    const message = isActive
      ? await FollowUps.addMessage(payload, access.isStaff ? 'user' : 'officer')
      : await FollowUps.addMessageRecord(payload)
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
    const isActive = FollowUps.ACTIVE_STATUSES.includes(request.status)
    const userId = actorId(req)

    // The originator may cancel their own request; all other status changes
    // (open / resolved / rejected) are restricted to staff with canManageFollowUps.
    if (status === 'cancelled') {
      if (!isActive) {
        return res.status(409).json({ error: 'This follow-up is already closed.' })
      }
      const access = await FollowUps.getCaseAccess(request.case_id, userId)
      if (!access || (!access.isOwner && !access.isStaff)) {
        return res.status(403).json({ error: 'You cannot access this follow-up.' })
      }
      if (String(request.initiated_by_user_id) !== String(userId)) {
        return res.status(403).json({ error: 'Only the person who submitted this request can cancel it.' })
      }
      const updated = await FollowUps.updateStatusWithMessage(
        id,
        'cancelled',
        userId,
        RESOLUTION_MESSAGES.cancelled,
        null
      )
      return res.json({ data: updated })
    }

    if (status === 'open' && isActive) {
      return res.status(409).json({ error: 'This follow-up is already open.' })
    }
    if (status === 'open') {
      const activeRequest = await FollowUps.getActiveRequest(request.case_id, request.type)
      if (activeRequest && Number(activeRequest.id) !== id) {
        return res.status(409).json({
          error: 'Another follow-up of this type is already open. Close it before reopening this thread.',
        })
      }
    }
    if (status !== 'open' && !isActive) {
      return res.status(409).json({ error: 'This follow-up is already closed.' })
    }
    const access = await FollowUps.getCaseAccess(request.case_id, userId)
    if (!access?.canManageFollowUps) return res.status(403).json({ error: 'Only case officers or admins can close follow-ups.' })

    const updated = await FollowUps.updateStatusWithMessage(
      id,
      status,
      userId,
      RESOLUTION_MESSAGES[status],
      status === 'open'
        ? request.type === 'officer_clarification_request' ? 'user' : 'officer'
        : null
    )
    return res.json({ data: updated })
  } catch (error) {
    console.error('[updateFollowUp]', error.message)
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'Another follow-up of this type is already open.',
      })
    }
    return res.status(500).json({ error: 'Failed to update follow-up.' })
  }
}

module.exports = { amendCaseFields, createFollowUp, listFollowUps, replyToFollowUp, updateFollowUp }
