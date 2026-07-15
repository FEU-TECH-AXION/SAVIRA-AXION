const LegalReviews = require('../models/legal_reviews.model')
const LegalPersonnels = require('../models/legal_personnels.model')
const {
  getAllReports,
  getReportsForLegal,
  getLegalManagementReports,
} = require('../models/case_reports.model')
const supabase = require('../config/supabase')
const {
  fireAndForget,
  notifyCaseOwner,
} = require('../services/notificationService')

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

function toManagementPayload(review) {
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
const ENDORSEMENT_ELIGIBLE_STATUS_IDS = new Set([6, 7, 8, 9, 10, 11, 12])
const STATUS_NAME_BY_ID = {
  4: 'Verified - True',
  6: 'Under Case Evaluation',
  7: 'Case Filed',
  8: 'Investigation Ongoing',
  9: 'Hearing Ongoing',
  10: 'Dismissed',
  11: 'Perpetrator Convicted',
  12: 'Resolved',
}

const ENDORSEMENT_DETAIL_SCHEMAS = {
  DSWD: {
    endorsement_date: 'date',
    receiving_office: 'text',
    receiving_person: 'text',
    referral_reference_no: 'text',
    next_follow_up_date: 'date',
    survivor_contacted: 'boolean',
    services_provided: 'boolean',
  },
  'PNP Women and Children Protection Desk': {
    station_name: 'text',
    desk_details: 'text',
    blotter_reference_no: 'text',
    assigned_investigator: 'text',
    sworn_statement_taken: 'boolean',
    medico_legal_advised: 'boolean',
    forwarded_to_prosecutor: 'boolean',
  },
  'BSP/GSP Mechanism': {
    chapter_council_unit: 'text',
    receiving_official: 'text',
    fact_finding_started: 'boolean',
    interim_safety_measures: 'text',
    sanctions_or_inaction: 'text',
    closure_report: 'text',
  },
  'School/Workplace CODI': {
    complaint_receipt_confirmed: 'boolean',
    codi_focal_person: 'text',
    hearing_schedule_date: 'date',
    last_status_update_date: 'date',
    anti_retaliation_confirmed: 'boolean',
    final_administrative_decision: 'text',
  },
  'Court (with lawyer)': {
    case_number: 'text',
    court_branch: 'text',
    filing_date: 'date',
    prosecutor_counsel: 'text',
    hearing_dates: 'array',
    postponements: 'array',
    witness_prep_needs: 'text',
    final_judgment: 'text',
  },
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateDateString(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  return !Number.isNaN(Date.parse(value))
}

function validateEndorsementDetails(endorsedTo, details) {
  const schema = ENDORSEMENT_DETAIL_SCHEMAS[endorsedTo]
  if (!schema) return { error: `Unsupported endorsement institution: ${endorsedTo}` }
  if (!isPlainObject(details)) {
    return { error: 'endorsement_details must be an object matching the selected endorsement institution.' }
  }

  const normalized = {}
  for (const [field, type] of Object.entries(schema)) {
    const value = details[field]
    if (type === 'boolean') {
      if (typeof value !== 'boolean') return { error: `${field} must be true or false.` }
      normalized[field] = value
    } else if (type === 'array') {
      if (!Array.isArray(value) || value.filter(Boolean).length === 0) {
        return { error: `${field} must include at least one item.` }
      }
      normalized[field] = value.map((item) => String(item).trim()).filter(Boolean)
    } else if (type === 'date') {
      if (!validateDateString(value)) return { error: `${field} must be a valid date.` }
      normalized[field] = String(value).trim()
    } else {
      if (typeof value !== 'string' || !value.trim()) return { error: `${field} is required.` }
      normalized[field] = value.trim()
    }
  }

  return { value: normalized }
}
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

function getRequesterUserId(req) {
  return req.user?.user_id || req.user?.id || null
}

function splitDateValues(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(splitDateValues)
  if (value instanceof Date) return [value]

  const text = String(value)
  const matches = [
    ...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g),
    ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g),
    ...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi),
  ].map((match) => match[0])

  if (matches.length > 0) return matches
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? [] : [text]
}

function titleFromKey(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function eventTypeFromLabel(label) {
  const text = String(label || '').toLowerCase()
  if (text.includes('hearing')) return 'hearing'
  if (text.includes('investigation')) return 'investigation'
  if (text.includes('referral') || text.includes('endorsement')) return 'referral'
  if (text.includes('filing') || text.includes('filed')) return 'filing'
  if (text.includes('consult')) return 'consultation'
  if (text.includes('monitor') || text.includes('follow')) return 'monitoring'
  if (text.includes('paralegal') || text.includes('lawyer review')) return 'paralegal'
  return 'legal'
}

function addDateEvents(events, { type, label, value, source }) {
  splitDateValues(value).forEach((dateValue) => {
    events.push({
      type: type || eventTypeFromLabel(label),
      label,
      value: dateValue,
      source,
    })
  })
}

function addObjectDateEvents(events, object, { source, prefix = '' } = {}) {
  Object.entries(object || {}).forEach(([key, value]) => {
    const label = `${prefix}${titleFromKey(key)}`
    const keyText = key.toLowerCase()
    if (keyText.includes('date') || keyText.includes('schedule') || keyText.includes('hearing')) {
      addDateEvents(events, { label, value, source })
    }
  })
}

function buildLegalDeadlinesForCase({ report, review, statusHistory = [] }) {
  const events = []
  const caseId = `${new Date(report.created_at).getFullYear()}-${String(report.case_report_id).padStart(3, '0')}`

  addObjectDateEvents(events, review?.endorsement_details, { source: 'endorsement' })

  for (const entry of statusHistory) {
    const status = entry.case_status?.case_status_name || STATUS_NAME_BY_ID[entry.case_status_id] || 'Status'
    const entryDate = entry.approved_at || entry.created_at
    addDateEvents(events, { type: 'status', label: `${status} update`, value: entryDate, source: 'status' })
    addObjectDateEvents(events, entry.form_data || {}, { source: 'status' })
  }

  const paralegal = review?.paralegal_record
  if (paralegal) {
    addDateEvents(events, { type: 'paralegal', label: 'Paralegal support recorded', value: paralegal.date, source: 'paralegal' })
    addDateEvents(events, { type: 'paralegal', label: 'Ready for lawyer review', value: paralegal.readyAt, source: 'paralegal' })
  }

  const lawyer = review?.lawyer_record
  if (lawyer) {
    addDateEvents(events, { type: 'consultation', label: 'Lawyer consultation', value: lawyer.date, source: 'lawyer' })
    addDateEvents(events, { type: 'consultation', label: 'Lawyer consultation saved', value: lawyer.savedAt, source: 'lawyer' })
    for (const consultation of lawyer.consultations || []) {
      addDateEvents(events, {
        type: 'consultation',
        label: `${consultation.consultationType || 'Lawyer'} consultation`,
        value: consultation.date || consultation.consultationDate,
        source: 'lawyer',
      })
      addDateEvents(events, { type: 'consultation', label: 'Lawyer consultation saved', value: consultation.savedAt, source: 'lawyer' })
    }
  }

  for (const entry of review?.monitoring_log || []) {
    addDateEvents(events, { type: 'monitoring', label: 'Monitoring follow-up', value: entry.date, source: 'monitoring' })
  }

  for (const document of review?.document_repository || []) {
    addDateEvents(events, {
      type: 'document',
      label: `Document added${document.label ? `: ${document.label}` : ''}`,
      value: document.addedAt,
      source: 'document',
    })
  }

  return events
    .filter((item) => item.value && !Number.isNaN(new Date(item.value).getTime()))
    .map((item, index) => ({
      ...item,
      id: `${report.case_report_id}-${item.type}-${item.value}-${index}`,
      caseReportId: report.case_report_id,
      caseId,
      status: STATUS_NAME_BY_ID[report.case_status_id] || null,
      date: new Date(item.value).toISOString(),
      dateKey: String(item.value).slice(0, 10),
    }))
}

async function getLegalScopeCaseIds(req) {
  if (getRequesterRole(req) !== 'legal personnel') return null

  const { data: personnel, error: personnelError } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', getRequesterUserId(req))
    .maybeSingle()
  if (personnelError) throw personnelError
  if (!personnel?.legal_personnel_id) return []

  const { data, error } = await supabase
    .from('legal_case_assignments')
    .select('case_report_id')
    .eq('legal_personnel_id', personnel.legal_personnel_id)
    .eq('is_active', true)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id).filter(Boolean))]
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
    const userId = getRequesterUserId(req)
    return options ? getReportsForLegal(userId, options) : getReportsForLegal(userId)
  }
  return []
}

async function getTimedManagementStats() {
  const startedAt = process.hrtime.bigint()
  try {
    return await LegalReviews.getManagementStats({
      legalStatusIds: LEGAL_STATUS_ID_VALUES,
      activeStatusIds: LEGAL_ACTIVE_STATUS_ID_VALUES,
      underEvaluationStatusId: 6,
    })
  } finally {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    console.info(`[legalReviews.getManagement] getManagementStats ${durationMs.toFixed(1)}ms`)
  }
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
      getTimedManagementStats(),
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

    const reviews = {}
    for (const caseId of caseIds) {
      const review = reviewsByCase[caseId]
      reviews[caseId] = toManagementPayload(review)
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

async function getDeadlines(req, res) {
  try {
    const role = getRequesterRole(req)
    if (!['admin', 'legal personnel'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const scopedCaseIds = await getLegalScopeCaseIds(req)
    if (Array.isArray(scopedCaseIds) && scopedCaseIds.length === 0) {
      return res.json({ data: [] })
    }

    let reportQuery = supabase
      .from('case_reports')
      .select('case_report_id, case_status_id, created_at')
      .eq('is_current', true)
      .in('case_status_id', LEGAL_STATUS_ID_VALUES)

    if (Array.isArray(scopedCaseIds)) reportQuery = reportQuery.in('case_report_id', scopedCaseIds)

    const { data: reports, error: reportsError } = await reportQuery
      .order('created_at', { ascending: false })
    if (reportsError) throw reportsError

    const caseIds = (reports || []).map((report) => report.case_report_id)
    if (caseIds.length === 0) return res.json({ data: [] })

    const [reviewsByCase, historyResult] = await Promise.all([
      LegalReviews.getLatestByCaseIds(caseIds),
      supabase
        .from('case_status_history')
        .select(`
          case_report_id,
          case_status_id,
          form_data,
          approved_at,
          created_at,
          case_status ( case_status_name )
        `)
        .in('case_report_id', caseIds)
        .order('created_at', { ascending: true }),
    ])
    if (historyResult.error) throw historyResult.error

    const historyByCase = (historyResult.data || []).reduce((map, row) => {
      if (!map[row.case_report_id]) map[row.case_report_id] = []
      map[row.case_report_id].push(row)
      return map
    }, {})

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
    const deadlines = (reports || [])
      .flatMap((report) => buildLegalDeadlinesForCase({
        report,
        review: reviewsByCase[report.case_report_id],
        statusHistory: historyByCase[report.case_report_id] || [],
      }))
      .filter((deadline) => new Date(deadline.date).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit)

    return res.json({ data: deadlines })
  } catch (err) {
    console.error('[legalReviews.getDeadlines]', err)
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
    const wasCreated = !review
    const previousReviewStatus = review?.review_status
    const endorsementTouched = endorsed_to !== undefined || endorsement_details !== undefined
    let normalizedEndorsementDetails = null

    if (endorsementTouched) {
      const targetEndorsedTo = endorsed_to !== undefined ? endorsed_to : review?.endorsed_to
      const targetDetails = endorsement_details !== undefined ? endorsement_details : review?.endorsement_details

      if (targetEndorsedTo) {
        const { data: report, error: reportError } = await supabase
          .from('case_reports')
          .select('case_report_id, case_status_id')
          .eq('case_report_id', caseReportId)
          .maybeSingle()
        if (reportError) throw reportError
        if (!report) return res.status(404).json({ error: 'Case report not found.' })
        if (!ENDORSEMENT_ELIGIBLE_STATUS_IDS.has(Number(report.case_status_id))) {
          return res.status(400).json({
            error: 'Case must reach Under Case Evaluation before it can be endorsed.',
          })
        }

        const validation = validateEndorsementDetails(targetEndorsedTo, targetDetails)
        if (validation.error) return res.status(400).json({ error: validation.error })
        normalizedEndorsementDetails = validation.value
      } else if (endorsement_details !== undefined && endorsement_details !== null) {
        return res.status(400).json({ error: 'endorsed_to is required when endorsement_details are provided.' })
      }
    }

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
    if (endorsed_to !== undefined) {
      patch.endorsed_to = endorsed_to || null
      if (!endorsed_to && endorsement_details === undefined) patch.endorsement_details = null
    }
    if (endorsement_details !== undefined) {
      patch.endorsement_details = normalizedEndorsementDetails
    }
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

    if (wasCreated) {
      fireAndForget(
        notifyCaseOwner(caseReportId, {
          title: 'Legal review update',
          body: 'Your case has been referred for legal review.',
          data: {
            type: 'legal_review',
            case_report_id: caseReportId,
            legal_review_id: review.legal_review_id,
            link: '/cases/history',
            priority: 'normal',
          },
        }),
        'Failed to notify case owner about legal review referral'
      )
    }

    if (
      !wasCreated &&
      review_status !== undefined &&
      String(previousReviewStatus || '') !== String(review.review_status || '')
    ) {
      fireAndForget(
        notifyCaseOwner(caseReportId, {
          title: 'Legal review update',
          body: 'There is an update on your legal review. Please check your account for details.',
          data: {
            type: 'legal_review',
            case_report_id: caseReportId,
            legal_review_id: review.legal_review_id,
            link: '/cases/history',
            priority: 'normal',
          },
        }),
        'Failed to notify case owner about legal review status update'
      )
    }

    const logs = await LegalReviews.getLogsByReview(review.legal_review_id)
    return res.json({ data: toClientPayload(review, logs) })
  } catch (err) {
    console.error('[legalReviews.updateByCase]', err)
    return res.status(500).json({ error: missingColumnsMessage(err) || err.message })
  }
}

module.exports = { getManagement, getDeadlines, getByCase, getCalendarByCase, updateByCase }
