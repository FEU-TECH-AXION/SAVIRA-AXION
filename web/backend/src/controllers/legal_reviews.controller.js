const LegalReviews = require('../models/legal_reviews.model')

const PUBLIC_MESSAGE_REQUIRED = 'A public message is required when an update is marked visible to the complainant.'
const PUBLIC_MESSAGE_MAX_LENGTH = 280

function normalizePublicFields({ actionType, isPublic, publicMessage }) {
  if (actionType === 'internal_note') {
    return { isPublic: false, publicMessage: null }
  }

  const visible = isPublic === true
  const message = typeof publicMessage === 'string' ? publicMessage.trim() : ''
  if (visible && !message) return { error: PUBLIC_MESSAGE_REQUIRED }
  if (visible && message.length > PUBLIC_MESSAGE_MAX_LENGTH) {
    return { error: `Public message must be ${PUBLIC_MESSAGE_MAX_LENGTH} characters or fewer.` }
  }
  return { isPublic: visible, publicMessage: visible ? message : null }
}

function getActorUserId(req) {
  return (
    req.user?.user_id ||
    req.user?.id ||
    req.body?.performed_by_user_id ||
    req.query?.performed_by_user_id ||
    null
  )
}

function missingColumnsMessage(err) {
  const msg = err?.message || ''
  const knownMissingDetailColumn = [
    'paralegal_record',
    'lawyer_record',
    'endorsed_to',
    'endorsement_details',
    'monitoring_log',
    'document_repository',
  ].some((column) => msg.includes(column))
  if (!knownMissingDetailColumn) return null
  return 'Legal review detail columns are missing. Run the legal review improvements migration.'
}

function toClientPayload(review, logs = []) {
  if (!review) return null
  return {
    legal_review_id: review.legal_review_id,
    case_report_id: review.case_report_id,
    legal_personnel_id: review.legal_personnel_id,
    review_type: review.review_type,
    review_status: review.review_status,
    paralegal_record: review.paralegal_record || null,
    lawyer_record: review.lawyer_record || null,
    endorsed_to: review.endorsed_to || null,
    endorsement_details: review.endorsement_details || null,
    monitoring_log: review.monitoring_log || [],
    document_repository: review.document_repository || [],
    logs,
  }
}

async function getByCase(req, res) {
  try {
    const { caseReportId } = req.params
    const review = await LegalReviews.getLatestByCase(caseReportId)
    const logs = await LegalReviews.getLogsByReview(review?.legal_review_id)
    return res.json({ data: toClientPayload(review, logs) })
  } catch (err) {
    console.error('[legalReviews.getByCase]', err)
    return res.status(500).json({ error: missingColumnsMessage(err) || err.message })
  }
}

async function updateByCase(req, res) {
  try {
    const { caseReportId } = req.params
    const {
      action_type,
      remarks,
      legal_personnel_id,
      paralegal_record,
      lawyer_record,
      endorsed_to,
      endorsement_details,
      monitoring_entry,
      document_repository,
      review_status,
      is_public,
      public_message,
    } = req.body

    const performedByUserId = getActorUserId(req)
    if (!performedByUserId) {
      return res.status(400).json({ error: 'performed_by_user_id is required for legal review logs.' })
    }

    let review = await LegalReviews.getLatestByCase(caseReportId)
    if (!review) {
      const resolvedLegalPersonnelId = await LegalReviews.resolveLegalPersonnelId({
        caseReportId,
        legalPersonnelId: legal_personnel_id,
        performedByUserId,
      })
      if (!resolvedLegalPersonnelId) {
        return res.status(400).json({
          error: 'Assign legal personnel to this case first, or provide legal_personnel_id.',
        })
      }
      review = await LegalReviews.createForCase({
        caseReportId,
        legalPersonnelId: resolvedLegalPersonnelId,
      })
    }

    const patch = {}
    if (paralegal_record !== undefined) patch.paralegal_record = paralegal_record
    if (lawyer_record !== undefined) patch.lawyer_record = lawyer_record
    if (endorsed_to !== undefined) patch.endorsed_to = endorsed_to || null
    if (endorsement_details !== undefined) patch.endorsement_details = endorsement_details
    if (document_repository !== undefined) patch.document_repository = document_repository
    if (review_status !== undefined) patch.review_status = review_status
    if (monitoring_entry) {
      patch.monitoring_log = [...(review.monitoring_log || []), monitoring_entry]
    }

    if (Object.keys(patch).length > 0) {
      review = await LegalReviews.updateReview(review.legal_review_id, patch)
    }

    const publicFields = normalizePublicFields({
      actionType: action_type || 'legal_review_updated',
      isPublic: is_public,
      publicMessage: public_message,
    })
    if (publicFields.error) return res.status(400).json({ error: publicFields.error })

    await LegalReviews.logAction({
      legalReviewId: review.legal_review_id,
      caseReportId,
      actionType: action_type || 'legal_review_updated',
      remarks,
      performedByUserId,
      isPublic: publicFields.isPublic,
      publicMessage: publicFields.publicMessage,
    })

    const logs = await LegalReviews.getLogsByReview(review.legal_review_id)
    return res.json({ data: toClientPayload(review, logs) })
  } catch (err) {
    console.error('[legalReviews.updateByCase]', err)
    return res.status(500).json({ error: missingColumnsMessage(err) || err.message })
  }
}

module.exports = { getByCase, updateByCase }
