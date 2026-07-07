const LegalReviews = require('../models/legal_reviews.model')
const LegalPersonnels = require('../models/legal_personnels.model')
const {
  getAllReports,
  getReportsForLegal,
  getLegalManagementReports,
} = require('../models/case_reports.model')
const supabase = require('../config/supabase')

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

async function getLegalPersonnelType(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_type')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return String(data?.legal_personnel_type || '').toLowerCase()
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

function toCalendarPayload(review) {
  if (!review) return null
  return {
    endorsementDetails: review.endorsement_details || null,
    paralegalRecord: review.paralegal_record
      ? {
          date: review.paralegal_record.date || null,
          readyAt: review.paralegal_record.readyAt || null,
          readyForLawyerReview: review.paralegal_record.readyForLawyerReview || false,
        }
      : null,
    lawyerRecord: review.lawyer_record
      ? {
          date: review.lawyer_record.date || null,
          savedAt: review.lawyer_record.savedAt || null,
          consultationType: review.lawyer_record.consultationType || null,
          consultations: (review.lawyer_record.consultations || []).map((consultation) => ({
            date: consultation.date || consultation.consultationDate || null,
            savedAt: consultation.savedAt || null,
            consultationType: consultation.consultationType || null,
          })),
        }
      : null,
    monitoringLog: (review.monitoring_log || []).map((entry) => ({
      date: entry.date || null,
    })),
    documentRepository: (review.document_repository || []).map((entry) => ({
      addedAt: entry.addedAt || null,
    })),
  }
}

const LEGAL_STATUS_ID_VALUES = [4, 6, 7, 8, 9, 10, 11, 12]
const LEGAL_ACTIVE_STATUS_ID_VALUES = [4, 6, 7, 8, 9]
const LEGAL_STATUS_IDS = new Set(LEGAL_STATUS_ID_VALUES)
const LEGAL_MANAGEMENT_SORT_FIELDS = {
  caseId: 'caseId',
  id: 'caseId',
  status: 'status',
  dateReported: 'dateSubmitted',
  dateSubmitted: 'dateSubmitted',
  city: 'city',
  region: 'region',
}

function getRequesterRole(req) {
  return String(req.user?.role || req.user?.role_name || '').toLowerCase()
}

function hasPaginatedManagementQuery(req) {
  return req.query?.page !== undefined || req.query?.limit !== undefined
}

async function buildManagementCaseOptions(req) {
  const query = req.query || {}
  const endorsedCaseIds = await LegalReviews.getCaseIdsByEndorsedTo(query.endorsedTo)
  const sortBy = LEGAL_MANAGEMENT_SORT_FIELDS[query.sortBy] || 'dateSubmitted'

  return {
    page: query.page,
    limit: query.limit,
    sortBy,
    sortDir: query.sortDir,
    search: query.search,
    status: query.status,
    city: query.city,
    dateSubmitted: query.dateReported,
    caseType: query.caseType,
    primaryCategory: query.caseCategory,
    assignedLegalOfficer: query.assignedLegalOfficer,
    assignedParalegal: query.assignedParalegal,
    caseIds: endorsedCaseIds,
  }
}

async function getLegalReviewReports(req, options = null) {
  const role = getRequesterRole(req)
  if (role === 'admin') {
    return options
      ? getLegalManagementReports({ ...options, statusIds: LEGAL_STATUS_ID_VALUES })
      : getAllReports()
  }
  if (role === 'legal personnel') {
    return options ? getLegalManagementReports(options) : getReportsForLegal()
  }
  return []
}

async function getManagement(req, res) {
  try {
    const role = getRequesterRole(req)
    if (!['admin', 'legal personnel'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const usePagination = hasPaginatedManagementQuery(req)
    const options = usePagination ? await buildManagementCaseOptions(req) : null
    const [reportResult, legalPersonnels, stats] = await Promise.all([
      getLegalReviewReports(req, options),
      LegalPersonnels.getAll(),
      LegalReviews.getManagementStats({
        legalStatusIds: LEGAL_STATUS_ID_VALUES,
        activeStatusIds: LEGAL_ACTIVE_STATUS_ID_VALUES,
        underEvaluationStatusId: 6,
      }),
    ])

    const reports = usePagination ? reportResult.data : reportResult
    const legalReports = (reports || []).filter((report) =>
      LEGAL_STATUS_IDS.has(Number(report.case_status_id))
    )
    const caseIds = legalReports.map((report) => report.case_report_id)
    const [reviewsByCase, pendingHistoryByCase] = await Promise.all([
      LegalReviews.getLatestByCaseIds(caseIds),
      LegalReviews.getPendingStatusHistoryByCaseIds(caseIds),
    ])
    const logsByReview = await LegalReviews.getLogsByReviewIds(
      Object.values(reviewsByCase).map((review) => review?.legal_review_id)
    )

    const reviews = {}
    for (const caseId of caseIds) {
      const review = reviewsByCase[caseId]
      reviews[caseId] = toClientPayload(review, logsByReview[review?.legal_review_id] || [])
    }

    return res.json({
      data: {
        cases: legalReports.map((report) => ({
          ...report,
          status_history: pendingHistoryByCase[report.case_report_id] || report.status_history || [],
        })),
        legal_personnels: legalPersonnels,
        reviews,
        total: usePagination ? reportResult.total : legalReports.length,
        page: usePagination ? reportResult.page : 1,
        limit: usePagination ? reportResult.limit : legalReports.length,
        stats,
      },
    })
  } catch (err) {
    console.error('[legalReviews.getManagement]', err)
    return res.status(500).json({ error: missingColumnsMessage(err) || err.message })
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

async function getCalendarByCase(req, res) {
  try {
    const { caseReportId } = req.params
    const review = await LegalReviews.getLatestByCase(caseReportId)
    return res.json({ data: toCalendarPayload(review) })
  } catch (err) {
    console.error('[legalReviews.getCalendarByCase]', err)
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

    const requesterRole = String(req.user?.role || req.user?.role_name || '').toLowerCase()
    if (requesterRole === 'legal personnel') {
      const personnelType = await getLegalPersonnelType(req.user?.id || req.user?.user_id)
      const nonLawyerFields = [
        paralegal_record,
        endorsed_to,
        endorsement_details,
        monitoring_entry,
        document_repository,
        review_status,
      ]
      if (personnelType === 'lawyer' || personnelType === 'legal officer') {
        if (nonLawyerFields.some((value) => value !== undefined)) {
          return res.status(403).json({ error: 'Lawyers can only save lawyer consultation records.' })
        }
      } else if (personnelType === 'paralegal') {
        if (lawyer_record !== undefined) {
          return res.status(403).json({ error: 'Paralegals cannot save lawyer consultation records.' })
        }
      } else {
        return res.status(403).json({ error: 'Legal personnel type is required for this action.' })
      }
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

module.exports = { getManagement, getByCase, getCalendarByCase, updateByCase }
