const supabase = require('../config/supabase')
const { mergeApprovedFieldChanges } = require('./case_field_changes')
const { normalizeScoreForFields } = require('../services/duplicateCases.service')

const STATUS_NAME_BY_ID = {
  1: 'Submitted',
  2: 'For Verification',
  3: 'Undergoing Review',
  4: 'Verified - True',
  5: 'Verified - False',
  6: 'Under Case Evaluation',
  7: 'Case Filed',
  8: 'Investigation Ongoing',
  9: 'Hearing Ongoing',
  10: 'Dismissed',
  11: 'Perpetrator Convicted',
  12: 'Resolved',
  13: 'Withdrawn',
}

const STATUS_ID_BY_NAME = Object.fromEntries(
  Object.entries(STATUS_NAME_BY_ID).map(([id, name]) => [name.toLowerCase(), Number(id)])
)

const CASE_LIST_SELECT = `
  case_report_id,
  public_id,
  case_code,
  complainant_id,
  age,
  gender_identity,
  incident_description,
  incident_city,
  incident_province,
  incident_location_type,
  incident_location,
  incident_date,
  perpetrator_relationship,
  perpetrator_occupation,
  perpetrator_gender,
  case_status_id,
  created_at,
  is_current,
  case_assignments (
    assignment_id,
    case_officer_id,
    is_active
  ),
  legal_case_assignments (
    legal_case_assignment_id,
    legal_personnel_id,
    assignment_role,
    is_active
  )
`

const DEFAULT_CASE_PAGE = 1
const DEFAULT_CASE_LIMIT = 10
const MAX_CASE_LIMIT = 100

const CASE_SORT_COLUMNS = {
  caseId: 'case_report_id',
  id: 'case_report_id',
  reporterId: 'complainant_id',
  status: 'case_status_id',
  dateSubmitted: 'created_at',
  created_at: 'created_at',
  region: 'incident_province',
  incident_city: 'incident_city',
  city: 'incident_city',
}

const ALLOWED_FIELDS = [
  'case_type',
  'case_category',
  'also_involves',
  'referral_required',
  'referral_body',
  'assigned_paralegal',
  'endorsement_status',
  'internal_notes',
  'assigned_officer',
]

function mergeAssessmentReferralFields(merged, row) {
  if (!merged.__hasReferralRequired && row.referral_required !== null && row.referral_required !== undefined) {
    merged.referral_required = row.referral_required
    merged.__hasReferralRequired = true
  }
  if (!merged.__hasReferralBody && row.referral_body !== undefined) {
    merged.referral_body = row.referral_body || null
    merged.__hasReferralBody = true
  }
}

function stripAssessmentMergeFlags(merged) {
  if (!merged) return merged
  delete merged.__hasReferralRequired
  delete merged.__hasReferralBody
  return merged
}

const getAll = async () => {
  const { data, error } = await supabase.from('case_reports').select('*')
  if (error) throw error
  return normalizeSubmittedReportStatuses(data)
}

const create = async (payload) => {
  const { data, error } = await supabase
    .from('case_reports')
    .insert([payload])
    .select()
  if (error) throw error
  return data[0]
}

async function normalizeSubmittedReportStatus(report) {
  if (!report || Number(report.case_status_id) !== 1) return report

  const { error } = await supabase
    .from('case_reports')
    .update({ case_status_id: 2 })
    .eq('case_report_id', report.case_report_id)
  if (error) throw error

  return { ...report, case_status_id: 2 }
}

async function normalizeSubmittedReportStatuses(reports = []) {
  const submittedIds = reports
    .filter((report) => Number(report.case_status_id) === 1)
    .map((report) => report.case_report_id)

  if (submittedIds.length > 0) {
    const { error } = await supabase
      .from('case_reports')
      .update({ case_status_id: 2 })
      .in('case_report_id', submittedIds)
    if (error) throw error
  }

  return reports.map((report) =>
    Number(report.case_status_id) === 1 ? { ...report, case_status_id: 2 } : report
  )
}

async function getApprovedFieldChangesForCase(caseReportId) {
  const { data: resolvedFollowUps, error: resolvedFollowUpsError } = await supabase
    .from('follow_up_requests')
    .select('id, resolved_at')
    .eq('case_id', caseReportId)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: true })

  if (resolvedFollowUpsError) {
    console.warn('[getCaseById] Approved follow-up metadata unavailable:', resolvedFollowUpsError.message)
    return []
  }
  if (!resolvedFollowUps?.length) return []

  const requestOrder = new Map(
    resolvedFollowUps.map((request, index) => [request.id, index])
  )
  const { data: approvedChanges, error: approvedChangesError } = await supabase
    .from('field_changes')
    .select('follow_up_request_id, field_key, previous_value, new_value, changed_at')
    .in('follow_up_request_id', resolvedFollowUps.map((request) => request.id))
    .order('changed_at', { ascending: true })

  if (approvedChangesError) {
    console.warn('[getCaseById] Approved field changes unavailable:', approvedChangesError.message)
    return []
  }

  return [...(approvedChanges || [])].sort((a, b) => {
    const requestDifference =
      requestOrder.get(a.follow_up_request_id) - requestOrder.get(b.follow_up_request_id)
    if (requestDifference !== 0) return requestDifference
    return new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  })
}

async function getCaseAssessmentDetails(caseReportId) {
  const { data: assessments, error } = await supabase
    .from('case_assessments')
    .select(`
      *,
      case_status_history (
        display_id,
        approval_status,
        approved_at,
        case_status ( case_status_name )
      )
    `)
    .eq('case_report_id', caseReportId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const merged = {
    case_type: null,
    primary_category: null,
    additional_categories: null,
    referral_required: false,
    referral_body: null,
    endorsement: null,
  }

  for (const row of assessments || []) {
    if (!merged.case_type && row.case_type?.length > 0) merged.case_type = row.case_type
    if (!merged.primary_category && row.primary_category) merged.primary_category = row.primary_category
    if (!merged.additional_categories && row.additional_categories?.length > 0) merged.additional_categories = row.additional_categories
    mergeAssessmentReferralFields(merged, row)
    if (!merged.endorsement && row.endorsement) merged.endorsement = row.endorsement
  }

  return { merged: stripAssessmentMergeFlags(merged), assessmentHistory: assessments || [] }
}

async function getCaseAssignmentsForDetail(caseReportId) {
  const { data: assignments, error } = await supabase
    .from('case_assignments')
    .select(`
      case_officer_id,
      case_officers (
        users (
          first_name,
          last_name
        )
      )
    `)
    .eq('case_report_id', caseReportId)
    .eq('is_active', true)
  if (error) throw error

  const officerNames = (assignments || [])
    .map((assignment) => assignment.case_officers?.users)
    .filter(Boolean)
    .map((user) => `${user.first_name || ''} ${user.last_name || ''}`.trim())
    .filter(Boolean)

  return officerNames.length > 0 ? officerNames.join(', ') : null
}

async function getCaseEvidencesWithUrls(caseReportId) {
  const { data: evidenceRows, error } = await supabase
    .from('evidences')
    .select('*')
    .eq('case_report_id', caseReportId)

  if (error) {
    console.warn('[getCaseById] Evidence metadata unavailable:', error.message)
    return []
  }

  let evidences = evidenceRows || []
  const evidencePaths = evidences.map((item) => item.file_path).filter(Boolean)
  if (evidencePaths.length === 0) return evidences

  const { data: signedRows, error: signedError } = await supabase.storage
    .from('case-evidence')
    .createSignedUrls(evidencePaths, 60 * 60)

  if (signedError) {
    console.warn('[getCaseById] Evidence URLs unavailable:', signedError.message)
    return evidences
  }

  const urlByPath = new Map((signedRows || []).map((item) => [item.path, item.signedUrl]))
  return evidences.map((item) => ({
    ...item,
    url: urlByPath.get(item.file_path) || null,
  }))
}

async function getLatestWithdrawalRequest(caseReportId) {
  const { data, error } = await supabase
    .from('case_withdrawal_requests')
    .select('id, status, requested_at, reviewed_at')
    .eq('case_report_id', caseReportId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && !['42P01', '42501'].includes(error.code)) {
    console.warn('[getCaseById] Withdrawal metadata unavailable:', error.message)
  }

  return data || null
}

async function getCaseById(caseReportId) {
  const { data: report, error } = await supabase
    .from('case_reports')
    .select('*')
    .eq('case_report_id', caseReportId)
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  if (!report) return null
  let normalizedReport = await normalizeSubmittedReportStatus(report)

  const [
    approvedChanges,
    complainantResult,
    assessmentDetails,
    officerName,
    evidences,
    followUpSummary,
    duplicateMatches,
    statusHistoryMap,
    withdrawalRequest,
  ] = await Promise.all([
    getApprovedFieldChangesForCase(caseReportId),
    supabase
      .from('complainants')
      .select('user_id')
      .eq('complainant_id', normalizedReport.complainant_id)
      .maybeSingle(),
    getCaseAssessmentDetails(caseReportId),
    getCaseAssignmentsForDetail(caseReportId),
    getCaseEvidencesWithUrls(caseReportId),
    getFollowUpSummary([caseReportId]),
    getDuplicateMatches([caseReportId]),
    getStatusHistoryMap([caseReportId], { staffView: true }),
    getLatestWithdrawalRequest(caseReportId),
  ])

  if (complainantResult.error) throw complainantResult.error
  if (approvedChanges.length > 0) {
    normalizedReport = mergeApprovedFieldChanges(normalizedReport, approvedChanges)
  }

  return {
    ...normalizedReport,
    complainant_user_id: complainantResult.data?.user_id || null,
    assigned_officer:    officerName,
    evidences,
    follow_up_summary:    followUpSummary[caseReportId] || null,
    withdrawal_request:   withdrawalRequest || null,
    possible_duplicates:  duplicateMatches[caseReportId] || [],
    status_history:       statusHistoryMap[caseReportId] || [],
    assessment_history:   assessmentDetails.assessmentHistory,
    ...assessmentDetails.merged,
  }
}

async function getCaseSummaryById(caseReportId) {
  const { data: report, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      complainant_id,
      name,
      email,
      contact_number,
      incident_date,
      incident_city,
      incident_province,
      incident_location,
      incident_description,
      case_status_id,
      created_at,
      is_current
    `)
    .eq('case_report_id', caseReportId)
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  if (!report) return null

  const { merged } = await getCaseAssessmentDetails(caseReportId)
  return {
    ...report,
    ...merged,
  }
}

async function getComplainantId(userId) {
  const { data, error } = await supabase
    .from("complainants")
    .select("complainant_id")
    .eq("user_id", userId)
    .single()
  if (data) return data.complainant_id

  const { data: newComplainant, error: insertError } = await supabase
    .from("complainants")
    .insert([{ user_id: userId }])
    .select("complainant_id")
    .single()
  if (insertError) throw insertError
  return newComplainant.complainant_id
}

async function createReport(payload) {
  const { data, error } = await supabase
    .from("case_reports")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return normalizeSubmittedReportStatus(data)
}

async function getReportsByUserId(complainantId) {
  const { data, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      incident_description,
      incident_city,
      incident_date,
      case_status_id,
      created_at
    `)
    .eq('complainant_id', complainantId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  const normalized = await normalizeSubmittedReportStatuses(data)
  const reportIds = normalized.map((report) => report.case_report_id)
  const assignedOfficerByReport = {}

  if (reportIds.length > 0) {
    const { data: assignments, error: assignmentError } = await supabase
      .from('case_assignments')
      .select(`
        case_report_id,
        is_active,
        case_officers (
          users (
            first_name,
            last_name
          )
        )
      `)
      .in('case_report_id', reportIds)
      .eq('is_active', true)

    if (assignmentError) {
      console.warn('[getReportsByUserId] Assignment metadata unavailable:', assignmentError.message)
    } else {
      for (const assignment of assignments || []) {
        const user = assignment.case_officers?.users
        const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
        if (name) assignedOfficerByReport[assignment.case_report_id] = name
      }
    }
  }

  const followUpSummary = await getFollowUpSummary(normalized.map((report) => report.case_report_id))

  // For terminal-status reports, look up the last approved status recorded
  // *before* the terminal entry so the front-end can show it as the middle
  // step-dot instead of a hardcoded label.
  const TERMINAL_STATUS_IDS = new Set([10, 11, 12, 13]) // Dismissed, Perpetrator Convicted, Resolved, Withdrawn
  const terminalReportIds = normalized
    .filter((report) => TERMINAL_STATUS_IDS.has(Number(report.case_status_id)))
    .map((report) => report.case_report_id)

  const previousStatusByReport = {}
  if (terminalReportIds.length > 0) {
    const { data: historyRows, error: historyError } = await supabase
      .from('case_status_history')
      .select('case_report_id, case_status_id, created_at, case_status ( case_status_name )')
      .in('case_report_id', terminalReportIds)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })

    if (historyError) {
      console.warn('[getReportsByUserId] Previous status lookup unavailable:', historyError.message)
    } else {
      // For each terminal report, find the first history row whose status_id is
      // NOT itself terminal — that is the status just before the outcome.
      for (const row of historyRows || []) {
        const id = row.case_report_id
        if (previousStatusByReport[id]) continue // already found for this report
        if (!TERMINAL_STATUS_IDS.has(Number(row.case_status_id))) {
          previousStatusByReport[id] = row.case_status?.case_status_name || null
        }
      }
    }
  }

  return normalized.map((report) => ({
    ...report,
    assigned_officer: assignedOfficerByReport[report.case_report_id] || null,
    follow_up_summary: followUpSummary[report.case_report_id] || null,
    previous_status_name: previousStatusByReport[report.case_report_id] || null,
  }))
}

async function getFollowUpSummary(caseIds) {
  if (!caseIds?.length) return {}
  const { data, error } = await supabase
    .from('follow_up_requests')
    .select('id, case_id, type, status, awaiting_role, updated_at, created_at')
    .in('case_id', caseIds)
    .order('updated_at', { ascending: false })
  if (error) {
    // Follow-up metadata is optional. A missing or partially applied migration
    // must never prevent the main case list/detail endpoints from loading.
    console.warn('[getFollowUpSummary] Follow-up metadata unavailable:', error.message)
    return {}
  }

  const summary = {}
  for (const item of data || []) {
    const current = summary[item.case_id]
    const itemIsActive = ['open', 'responded'].includes(item.status)
    const currentIsActive = ['open', 'responded'].includes(current?.status)
    const itemHasPriority = itemIsActive &&
      item.awaiting_role === 'user' &&
      current?.awaiting_role !== 'user'
    if (!current || (itemIsActive && !currentIsActive) || itemHasPriority) {
      summary[item.case_id] = item
    }
  }
  return summary
}

async function getStatusHistoryMap(caseIds, { staffView = true } = {}) {
  if (!caseIds?.length) return {}

  let query = supabase
    .from('case_status_history')
    .select(`
      history_id,
      display_id,
      case_report_id,
      case_status_id,
      changed_by_id,
      changed_by_role,
      notes,
      form_data,
      approval_status,
      approved_at,
      rejection_reason,
      created_at,
      case_status ( case_status_name )
    `)
    .in('case_report_id', caseIds)
    .order('created_at', { ascending: true })

  if (!staffView) query = query.eq('approval_status', 'approved')

  const { data, error } = await query
  if (error) {
    console.warn('[getStatusHistoryMap] Status history unavailable:', error.message)
    return {}
  }

  const userIds = [...new Set((data || []).map((row) => row.changed_by_id).filter(Boolean))]
  const actorById = await getHistoryActorMap(userIds)

  return (data || []).reduce((map, row) => {
    const actor = actorById[row.changed_by_id]
    if (!map[row.case_report_id]) map[row.case_report_id] = []
    map[row.case_report_id].push({
      historyId: row.history_id,
      displayId: row.display_id,
      status: row.case_status?.case_status_name || STATUS_NAME_BY_ID[row.case_status_id] || null,
      date: new Date(row.approved_at || row.created_at).toLocaleDateString('en-PH'),
      by: formatHistoryActor(actor, row.changed_by_role),
      actorName: formatHistoryActorName(actor),
      actorRole: actor?.roles?.role_name || row.changed_by_role || null,
      changed_by_role: actor?.roles?.role_name || row.changed_by_role || null,
      notes: row.notes,
      formData: row.form_data,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
    })
    return map
  }, {})
}

async function getHistoryActorMap(userIds) {
  if (!userIds?.length) return {}

  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, middle_name, last_name, extension_name, roles(role_name)')
    .in('user_id', userIds)

  if (error) {
    console.warn('[getHistoryActorMap] Actor metadata unavailable:', error.message)
    return {}
  }

  return (data || []).reduce((map, user) => {
    map[user.user_id] = user
    return map
  }, {})
}

function formatHistoryActor(user, fallbackRole) {
  const role = user?.roles?.role_name || fallbackRole || ''
  const name = formatHistoryActorName(user)

  if (name && role) return `${name} - ${role}`
  return name || role || 'System'
}

function formatHistoryActorName(user) {
  return user
    ? [user.first_name, user.middle_name, user.last_name, user.extension_name]
        .filter(Boolean)
        .join(' ')
        .trim()
    : ''
}

function withStatusHistory(report, statusHistoryMap) {
  return {
    ...report,
    status_history: statusHistoryMap[report.case_report_id] || [],
  }
}

function normalizeCaseListOptions(options = {}) {
  const page = Math.max(Number.parseInt(options.page, 10) || DEFAULT_CASE_PAGE, 1)
  const requestedLimit = Number.parseInt(options.limit, 10) || DEFAULT_CASE_LIMIT
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_CASE_LIMIT)
  const sortBy = CASE_SORT_COLUMNS[options.sortBy] ? options.sortBy : 'dateSubmitted'
  const sortDir = String(options.sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

  return {
    ...options,
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortDir,
    sortColumn: CASE_SORT_COLUMNS[sortBy],
  }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function getStatusId(value) {
  const text = normalizeText(value)
  if (!text || text === 'All') return null
  const numeric = Number.parseInt(text, 10)
  if (Number.isFinite(numeric) && STATUS_NAME_BY_ID[numeric]) return numeric
  return STATUS_ID_BY_NAME[text.toLowerCase()] || null
}

function getDateRangeFilter(value) {
  const text = normalizeText(value)
  if (!text) return null

  const today = new Date()
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  const current = startOfDay(today)

  if (text === 'today' || text === 'Today') return { start: current, end: endOfDay(today) }
  if (text === 'thisWeek' || text === 'This Week') {
    const start = new Date(current)
    start.setDate(current.getDate() - current.getDay())
    const end = endOfDay(new Date(start))
    end.setDate(start.getDate() + 6)
    return { start, end }
  }
  if (text === 'thisMonth' || text === 'This Month') {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }
  if (text === 'thisYear' || text === 'This Year') {
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
    }
  }
  if (text === 'last30Days') {
    const start = new Date(current)
    start.setDate(current.getDate() - 30)
    return { start, end: endOfDay(today) }
  }
  if (text.startsWith('custom|')) {
    const [, fromDate, toDate] = text.split('|')
    if (fromDate && toDate) {
      return {
        start: startOfDay(new Date(`${fromDate}T00:00:00`)),
        end: endOfDay(new Date(`${toDate}T00:00:00`)),
      }
    }
  }

  return null
}

function intersectCaseIds(currentIds, nextIds) {
  const next = [...new Set((nextIds || []).filter(Boolean))]
  if (currentIds === null) return next
  const allowed = new Set(next.map(String))
  return currentIds.filter((id) => allowed.has(String(id)))
}

async function getAssessmentFilteredCaseIds(filters = {}) {
  const caseType = normalizeText(filters.caseType)
  const primaryCategory = normalizeText(filters.primaryCategory)
  if ((!caseType || caseType === 'All') && (!primaryCategory || primaryCategory === 'All')) return null

  let query = supabase
    .from('case_assessments')
    .select('case_report_id')

  if (caseType && caseType !== 'All') query = query.contains('case_type', [caseType])
  if (primaryCategory && primaryCategory !== 'All') query = query.eq('primary_category', primaryCategory)

  const { data, error } = await query
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id))]
}

async function getAssignedOfficerFilteredCaseIds(assignedOfficer) {
  const text = normalizeText(assignedOfficer)
  if (!text || text === 'All') return null

  const { data: officers, error: officerError } = await supabase
    .from('case_officers')
    .select('case_officer_id, users!inner(first_name, last_name)')
  if (officerError) throw officerError

  const officerIds = (officers || [])
    .filter((officer) => {
      const name = `${officer.users?.first_name || ''} ${officer.users?.last_name || ''}`.trim()
      return name.toLowerCase().includes(text.toLowerCase())
    })
    .map((officer) => officer.case_officer_id)

  if (officerIds.length === 0) return []

  const { data, error } = await supabase
    .from('case_assignments')
    .select('case_report_id')
    .in('case_officer_id', officerIds)
    .eq('is_active', true)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id))]
}

async function getAssignedLegalFilteredCaseIds(assignedLegal, roles = []) {
  const text = normalizeText(assignedLegal)
  if (!text || text === 'All') return null

  const { data: personnels, error: personnelError } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id, users!inner(first_name, last_name)')
  if (personnelError) throw personnelError

  const personnelIds = (personnels || [])
    .filter((personnel) => {
      const name = `${personnel.users?.first_name || ''} ${personnel.users?.last_name || ''}`.trim()
      return name.toLowerCase().includes(text.toLowerCase())
    })
    .map((personnel) => personnel.legal_personnel_id)

  if (personnelIds.length === 0) return []

  let query = supabase
    .from('legal_case_assignments')
    .select('case_report_id')
    .in('legal_personnel_id', personnelIds)
    .eq('is_active', true)

  if (roles.length > 0) query = query.in('assignment_role', roles)

  const { data, error } = await query
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id))]
}

async function getPreFilteredCaseIds(filters = {}) {
  const [
    assessmentIds,
    assignedOfficerIds,
    assignedLegalOfficerIds,
    assignedParalegalIds,
  ] = await Promise.all([
    getAssessmentFilteredCaseIds(filters),
    getAssignedOfficerFilteredCaseIds(filters.assignedOfficer),
    getAssignedLegalFilteredCaseIds(filters.assignedLegalOfficer, ['lawyer', 'legal_officer']),
    getAssignedLegalFilteredCaseIds(filters.assignedParalegal, ['paralegal']),
  ])

  let caseIds = null
  if (assessmentIds !== null) caseIds = intersectCaseIds(caseIds, assessmentIds)
  if (assignedOfficerIds !== null) caseIds = intersectCaseIds(caseIds, assignedOfficerIds)
  if (assignedLegalOfficerIds !== null) caseIds = intersectCaseIds(caseIds, assignedLegalOfficerIds)
  if (assignedParalegalIds !== null) caseIds = intersectCaseIds(caseIds, assignedParalegalIds)
  return caseIds
}

function applyCaseReportFilters(query, options = {}) {
  let nextQuery = query.eq('is_current', true)

  const statusId = getStatusId(options.status)
  const scopedStatusIds = Array.isArray(options.statusIds) ? options.statusIds.map(Number) : []
  if (statusId && scopedStatusIds.length > 0) {
    nextQuery = scopedStatusIds.includes(statusId)
      ? nextQuery.eq('case_status_id', statusId)
      : nextQuery.eq('case_status_id', -1)
  } else if (statusId) nextQuery = nextQuery.eq('case_status_id', statusId)
  else if (scopedStatusIds.length > 0) {
    nextQuery = nextQuery.in('case_status_id', scopedStatusIds)
  }

  const city = normalizeText(options.incident_city || options.city)
  if (city && city !== 'All') nextQuery = nextQuery.ilike('incident_city', city)

  const dateRange = getDateRangeFilter(options.dateSubmitted)
  if (dateRange) {
    nextQuery = nextQuery
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
  }

  const search = normalizeText(options.search)
  if (search) {
    const clauses = [
      `incident_province.ilike.%${search}%`,
      `incident_city.ilike.%${search}%`,
    ]
    const numericMatch = search.match(/\d+/g)
    const lastNumber = numericMatch?.length ? Number.parseInt(numericMatch[numericMatch.length - 1], 10) : NaN
    if (Number.isFinite(lastNumber)) {
      clauses.push(`case_report_id.eq.${lastNumber}`)
      clauses.push(`complainant_id.eq.${lastNumber}`)
    }
    nextQuery = nextQuery.or(clauses.join(','))
  }

  return nextQuery
}

async function getAssessmentMap(reportIds) {
  if (!reportIds?.length) return {}

  const { data: assessments, error } = await supabase
    .from('case_assessments')
    .select(`
      case_report_id,
      case_type,
      primary_category,
      additional_categories,
      referral_required,
      referral_body,
      endorsement,
      created_at
    `)
    .in('case_report_id', reportIds)
    .order('created_at', { ascending: false })
  if (error) throw error

  const assessmentMap = {}
  for (const row of assessments || []) {
    const merged = assessmentMap[row.case_report_id] || {
      case_type: null,
      primary_category: null,
      additional_categories: null,
      referral_required: false,
      referral_body: null,
      endorsement: null,
    }
    if (!merged.case_type && row.case_type?.length > 0) merged.case_type = row.case_type
    if (!merged.primary_category && row.primary_category) merged.primary_category = row.primary_category
    if (!merged.additional_categories && row.additional_categories?.length > 0) merged.additional_categories = row.additional_categories
    mergeAssessmentReferralFields(merged, row)
    if (!merged.endorsement && row.endorsement) merged.endorsement = row.endorsement
    assessmentMap[row.case_report_id] = merged
  }
  Object.values(assessmentMap).forEach(stripAssessmentMergeFlags)
  return assessmentMap
}

async function getOfficerMap() {
  const { data, error } = await supabase
    .from('case_officers')
    .select('case_officer_id, users!inner(user_id, first_name, last_name, email)')
  if (error) throw error

  return (data || []).reduce((map, officer) => {
    if (officer.users) {
      map[officer.case_officer_id] = `${officer.users.first_name || ''} ${officer.users.last_name || ''}`.trim()
    }
    return map
  }, {})
}

async function getLegalMap() {
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id, users!inner(first_name, last_name)')
  if (error) throw error

  return (data || []).reduce((map, personnel) => {
    if (personnel.users) {
      map[personnel.legal_personnel_id] = `${personnel.users.first_name || ''} ${personnel.users.last_name || ''}`.trim()
    }
    return map
  }, {})
}

function emptyCasePage(options) {
  return {
    data: [],
    total: 0,
    page: options.page,
    limit: options.limit,
  }
}

async function getPaginatedCaseReports({
  options,
  scopeQuery,
  enrichReport,
  includeOfficerMap = true,
  includeLegalMap = true,
  includeAssessments = true,
  includeDuplicateMatches = true,
  includeStatusHistory = true,
}) {
  const normalizedOptions = normalizeCaseListOptions(options)
  const preFilteredCaseIds = await getPreFilteredCaseIds(normalizedOptions)
  let constrainedCaseIds = preFilteredCaseIds
  if (Array.isArray(normalizedOptions.caseIds)) {
    constrainedCaseIds = intersectCaseIds(constrainedCaseIds, normalizedOptions.caseIds)
  }

  if (Array.isArray(constrainedCaseIds) && constrainedCaseIds.length === 0) {
    return emptyCasePage(normalizedOptions)
  }

  let query = supabase
    .from('case_reports')
    .select(CASE_LIST_SELECT, { count: 'exact' })

  query = applyCaseReportFilters(query, normalizedOptions)
  if (constrainedCaseIds?.length) query = query.in('case_report_id', constrainedCaseIds)
  if (scopeQuery) query = scopeQuery(query)

  const { data: reports, error, count } = await query
    .order(normalizedOptions.sortColumn, { ascending: normalizedOptions.sortDir === 'asc' })
    .range(normalizedOptions.offset, normalizedOptions.offset + normalizedOptions.limit - 1)

  if (error) throw error

  const normalizedReports = await normalizeSubmittedReportStatuses(reports || [])
  const reportIds = normalizedReports.map((report) => report.case_report_id)

  const [
    officerMap,
    legalMap,
    assessmentMap,
    duplicateMatches,
    statusHistoryMap,
  ] = await Promise.all([
    includeOfficerMap ? getOfficerMap() : Promise.resolve({}),
    includeLegalMap ? getLegalMap() : Promise.resolve({}),
    includeAssessments ? getAssessmentMap(reportIds) : Promise.resolve({}),
    includeDuplicateMatches ? getDuplicateMatches(reportIds) : Promise.resolve({}),
    includeStatusHistory ? getStatusHistoryMap(reportIds, { staffView: true }) : Promise.resolve({}),
  ])

  return {
    data: normalizedReports.map((report) =>
      withStatusHistory(enrichReport({
        report,
        officerMap,
        legalMap,
        assessmentMap,
        duplicateMatches,
      }), statusHistoryMap)
    ),
    total: count || 0,
    page: normalizedOptions.page,
    limit: normalizedOptions.limit,
  }
}

async function getAllReports(options = {}) {
  if (arguments.length > 0) {
    return getPaginatedCaseReports({
      options,
      enrichReport: ({ report, officerMap, legalMap, assessmentMap, duplicateMatches }) => {
        let assignedOfficer = null
        let assignedOfficerId = null
        if (report.case_assignments?.length > 0) {
          const active = report.case_assignments.find(a => a.is_active)
          if (active) {
            assignedOfficerId = active.case_officer_id
            assignedOfficer = officerMap[assignedOfficerId] || null
          }
        }

        let assignedLegalOfficer = null
        let assignedParalegal = null
        const activeLegal = (report.legal_case_assignments || []).filter(a => a.is_active)
        const officerAss = activeLegal.find(a => ['lawyer', 'legal_officer'].includes(a.assignment_role))
        if (officerAss) assignedLegalOfficer = legalMap[officerAss.legal_personnel_id] || null
        const paralegalAss = activeLegal.find(a => a.assignment_role === 'paralegal')
        if (paralegalAss) assignedParalegal = legalMap[paralegalAss.legal_personnel_id] || null

        return {
          ...report,
          assigned_officer: assignedOfficer,
          assigned_officer_id: assignedOfficerId,
          assigned_legal_officer: assignedLegalOfficer,
          assigned_paralegal: assignedParalegal,
          assigned_legal: activeLegal.map(assignment => ({
            legal_personnel_id: assignment.legal_personnel_id,
            assignment_role: assignment.assignment_role === 'legal_officer' ? 'lawyer' : assignment.assignment_role,
            name: legalMap[assignment.legal_personnel_id] || null,
          })),
          possible_duplicates: duplicateMatches[report.case_report_id] || [],
          ...(assessmentMap[report.case_report_id] || {}),
          case_assignments: undefined,
          legal_case_assignments: undefined,
        }
      },
    })
  }

  // Step 1: Fetch case reports with their assignments
  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      complainant_id,
      age,
      gender_identity,
      incident_description,
      incident_city,
      incident_province,
      incident_location_type,
      incident_date,
      perpetrator_gender,
      case_status_id,
      created_at,
      is_current,
      case_assignments (
        assignment_id,
        case_officer_id,
        is_active
      ),
      legal_case_assignments (
        legal_case_assignment_id,
        legal_personnel_id,
        assignment_role,
        is_active
      )
    `)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
  if (reportsError) {
    console.error('[getAllReports] reports query error:', JSON.stringify(reportsError, null, 2))
    throw reportsError
  }
  const normalizedReports = await normalizeSubmittedReportStatuses(reports)

  // Step 2: Fetch all officers with their user info
  const { data: officers, error: officersError } = await supabase
    .from('case_officers')
    .select(`
      case_officer_id,
      users!inner (
        user_id,
        first_name,
        last_name,
        email
      )
    `)
  if (officersError) {
    console.error('[getAllReports] officers query error:', JSON.stringify(officersError, null, 2))
    throw officersError
  }

  // Build lookup: case_officer_id → full name
  const officerMap = {}
  for (const o of officers || []) {
    if (o.users) {
      officerMap[o.case_officer_id] = `${o.users.first_name || ''} ${o.users.last_name || ''}`.trim()
    }
  }

  // Step 2b: Fetch all legal personnels with their user info
  const { data: legalPersonnels, error: legalError } = await supabase
    .from('legal_personnels')
    .select(`
      legal_personnel_id,
      users!inner (
        first_name,
        last_name
      )
    `)
  if (legalError) {
    console.error('[getAllReports] legal personnels query error:', JSON.stringify(legalError, null, 2))
    throw legalError
  }

  // Build lookup: legal_personnel_id → full name
  const legalMap = {}
  for (const lp of legalPersonnels || []) {
    if (lp.users) {
      legalMap[lp.legal_personnel_id] = `${lp.users.first_name || ''} ${lp.users.last_name || ''}`.trim()
    }
  }

  // Step 2c: Fetch assessments once and merge latest non-empty classification
  // values into every list row, matching getCaseById behavior.
  const assessmentMap = {}
  const reportIds = normalizedReports.map(report => report.case_report_id)
  if (reportIds.length > 0) {
    const { data: assessments, error: assessmentsError } = await supabase
      .from('case_assessments')
      .select(`
        case_report_id,
        case_type,
        primary_category,
        additional_categories,
        referral_required,
        referral_body,
        endorsement,
        created_at
      `)
      .in('case_report_id', reportIds)
      .order('created_at', { ascending: false })
    if (assessmentsError) {
      console.error('[getAllReports] assessments query error:', JSON.stringify(assessmentsError, null, 2))
      throw assessmentsError
    }

    for (const row of assessments || []) {
      const merged = assessmentMap[row.case_report_id] || {
        case_type:             null,
        primary_category:      null,
        additional_categories: null,
        referral_required:     false,
        referral_body:         null,
        endorsement:           null,
      }
      if (!merged.case_type && row.case_type?.length > 0)
        merged.case_type = row.case_type
      if (!merged.primary_category && row.primary_category)
        merged.primary_category = row.primary_category
      if (!merged.additional_categories && row.additional_categories?.length > 0)
        merged.additional_categories = row.additional_categories
      mergeAssessmentReferralFields(merged, row)
      if (!merged.endorsement && row.endorsement)
        merged.endorsement = row.endorsement
      assessmentMap[row.case_report_id] = merged
    }
    Object.values(assessmentMap).forEach(stripAssessmentMergeFlags)
  }

  // Step 3: Merge officer name and legal names into each report
  const [duplicateMatches, statusHistoryMap] = await Promise.all([
    getDuplicateMatches(reportIds),
    getStatusHistoryMap(reportIds, { staffView: true }),
  ])
  return normalizedReports.map(report => {
    let assignedOfficer = null
    let assignedOfficerId = null
    if (report.case_assignments?.length > 0) {
      const active = report.case_assignments.find(a => a.is_active)
      if (active) {
        assignedOfficerId = active.case_officer_id
        assignedOfficer = officerMap[assignedOfficerId] || null
      }
    }

    let assignedLegalOfficer = null
    let assignedLegalOfficerId = null
    let assignedParalegal = null
    let assignedParalegalId = null
    let activeLegal = []

    if (report.legal_case_assignments?.length > 0) {
      activeLegal = report.legal_case_assignments.filter(a => a.is_active)
      const officerAss = activeLegal.find(a => ['lawyer', 'legal_officer'].includes(a.assignment_role))
      if (officerAss) {
        assignedLegalOfficerId = officerAss.legal_personnel_id
        assignedLegalOfficer = legalMap[assignedLegalOfficerId] || null
      }
      const paralegalAss = activeLegal.find(a => a.assignment_role === 'paralegal')
      if (paralegalAss) {
        assignedParalegalId = paralegalAss.legal_personnel_id
        assignedParalegal = legalMap[assignedParalegalId] || null
      }
    }

    return withStatusHistory({
      ...report,
      assigned_officer:       assignedOfficer,
      assigned_officer_id:    assignedOfficerId,
      assigned_legal_officer: assignedLegalOfficer,
      assigned_paralegal:     assignedParalegal,
      assigned_legal: activeLegal.map(assignment => ({
        legal_personnel_id: assignment.legal_personnel_id,
        assignment_role: assignment.assignment_role === 'legal_officer' ? 'lawyer' : assignment.assignment_role,
        name: legalMap[assignment.legal_personnel_id] || null,
      })),
      possible_duplicates: duplicateMatches[report.case_report_id] || [],
      ...(assessmentMap[report.case_report_id] || {}),
      case_assignments:       undefined,
      legal_case_assignments: undefined,
    }, statusHistoryMap)
  })
}

async function getDuplicateMatches(caseIds) {
  if (!caseIds?.length) return {}
  const { data, error } = await supabase
    .from('case_duplicate_matches')
    .select('duplicate_match_id, case_report_id, matched_case_report_id, similarity_score, matched_fields, created_at')
    .in('case_report_id', caseIds)
    .is('dismissed_at', null)
    .order('similarity_score', { ascending: false })
  if (error) {
    console.warn('[getDuplicateMatches] duplicate metadata unavailable:', error.message)
    return {}
  }
  const matchedIds = [
    ...new Set((data || [])
      .flatMap((item) => [item.case_report_id, item.matched_case_report_id])
      .filter(Boolean)),
  ]
  let publicById = {}
  if (matchedIds.length > 0) {
    const { data: publicRows, error: publicError } = await supabase
      .from('case_reports')
      .select('case_report_id, public_id')
      .in('case_report_id', matchedIds)
    if (!publicError) {
      publicById = Object.fromEntries((publicRows || []).map((row) => [row.case_report_id, row.public_id]))
    }
  }
  return (data || [])
    .map((item) => ({
      ...item,
      similarity_score: normalizeScoreForFields(Number(item.similarity_score) || 0, item.matched_fields || []),
    }))
    .filter((item) => item.similarity_score >= 45)
    .reduce((map, item) => {
      if (!map[item.case_report_id]) map[item.case_report_id] = []
      map[item.case_report_id].push({
        ...item,
        case_report_id: publicById[item.case_report_id] || item.case_report_id,
        matched_case_report_id: publicById[item.matched_case_report_id] || item.matched_case_report_id,
      })
      return map
    }, {})
}

const update = async (caseReportId, payload) => {
  const filtered = Object.fromEntries(
    Object.entries(payload).filter(([key]) => ALLOWED_FIELDS.includes(key))
  )
  if (Object.keys(filtered).length === 0) {
    throw new Error('No valid fields to update')
  }
  const { data, error } = await supabase
    .from('case_reports')
    .update(filtered)
    .eq('case_report_id', caseReportId)
    .select()
    .single()
  if (error) throw error
  return data
}

async function getHeatmapReports() {
  const { data, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      incident_city,
      case_status_id,
      gender_identity,
      perpetrator_gender,
      case_assessments (
        case_type,
        created_at
      )
    `)
    .eq('is_current', true)
  if (error) {
    console.error('[getHeatmapReports] Supabase error:', error.message)
    throw error
  }
  const normalized = await normalizeSubmittedReportStatuses(data)
  return normalized.map((report) => {
    const latestAssessment = [...(report.case_assessments || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find((assessment) =>
        Array.isArray(assessment.case_type)
          ? assessment.case_type.length > 0
          : Boolean(assessment.case_type)
      )

    return {
      ...report,
      case_type: latestAssessment?.case_type || null,
    }
  })
}

async function getReportsByAssignedOfficer(userId, options = {}) {
  // Step 1: Find the case_officer_id for this user
  const { data: officer, error: officerError } = await supabase
    .from('case_officers')
    .select('case_officer_id')
    .eq('user_id', userId)  // adjust if your FK column name differs
    .maybeSingle()
  if (officerError) throw officerError
  if (!officer) {
    return arguments.length > 1 ? emptyCasePage(normalizeCaseListOptions(options)) : []
  } // user has no officer profile, return empty

  const caseOfficerId = officer.case_officer_id

  if (arguments.length > 1) {
    const { data: assignments, error: assignmentError } = await supabase
      .from('case_assignments')
      .select('case_report_id')
      .eq('case_officer_id', caseOfficerId)
      .eq('is_active', true)
    if (assignmentError) throw assignmentError

    const caseIds = [...new Set((assignments || []).map((assignment) => assignment.case_report_id))]

    return getPaginatedCaseReports({
      options: { ...options, caseIds },
      includeOfficerMap: false,
      enrichReport: ({ report, legalMap, assessmentMap, duplicateMatches }) => ({
        ...report,
        assigned_officer: null,
        assigned_officer_id: caseOfficerId,
        assigned_legal_officer: null,
        assigned_paralegal: null,
        assigned_legal: (report.legal_case_assignments || [])
          .filter(a => a.is_active)
          .map(a => ({
            legal_personnel_id: a.legal_personnel_id,
            assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
            name: legalMap[a.legal_personnel_id] || null,
          })),
        possible_duplicates: duplicateMatches[report.case_report_id] || [],
        ...(assessmentMap[report.case_report_id] || {}),
        case_assignments: undefined,
        legal_case_assignments: undefined,
      }),
    })
  }

  // Step 2: Get only cases assigned to this officer
  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      complainant_id,
      incident_description,
      incident_city,
      incident_province,
      incident_date,
      case_status_id,
      created_at,
      is_current,
      case_assignments (
        assignment_id,
        case_officer_id,
        is_active
      ),
      legal_case_assignments (
        legal_case_assignment_id,
        legal_personnel_id,
        assignment_role,
        is_active
      )
    `)
    .eq('is_current', true)
    .eq('case_assignments.case_officer_id', caseOfficerId)  // scope to this officer
    .eq('case_assignments.is_active', true)
    .order('created_at', { ascending: false })
  if (reportsError) throw reportsError

  // Step 3: Filter out reports where the join didn't match
  // (Supabase returns all reports but with empty case_assignments if no match)
  const assignedReports = (reports || []).filter(
    r => r.case_assignments?.some(a => a.case_officer_id === caseOfficerId && a.is_active)
  )

  const normalizedReports = await normalizeSubmittedReportStatuses(assignedReports)
  const reportIds = normalizedReports.map(r => r.case_report_id)
  if (reportIds.length === 0) return []

  // Step 4: Reuse the same assessment + duplicate enrichment from getAllReports
  const assessmentMap = {}
  const { data: assessments, error: assessmentsError } = await supabase
    .from('case_assessments')
    .select(`
      case_report_id,
      case_type,
      primary_category,
      additional_categories,
      referral_required,
      referral_body,
      endorsement,
      created_at
    `)
    .in('case_report_id', reportIds)
    .order('created_at', { ascending: false })
  if (assessmentsError) throw assessmentsError

  for (const row of assessments || []) {
    const merged = assessmentMap[row.case_report_id] || {
      case_type: null, primary_category: null, additional_categories: null,
      referral_required: false, referral_body: null, endorsement: null,
    }
    if (!merged.case_type && row.case_type?.length > 0) merged.case_type = row.case_type
    if (!merged.primary_category && row.primary_category) merged.primary_category = row.primary_category
    if (!merged.additional_categories && row.additional_categories?.length > 0) merged.additional_categories = row.additional_categories
    mergeAssessmentReferralFields(merged, row)
    if (!merged.endorsement && row.endorsement) merged.endorsement = row.endorsement
    assessmentMap[row.case_report_id] = merged
  }
  Object.values(assessmentMap).forEach(stripAssessmentMergeFlags)

  const [duplicateMatches, statusHistoryMap] = await Promise.all([
    getDuplicateMatches(reportIds),
    getStatusHistoryMap(reportIds, { staffView: true }),
  ])

  return normalizedReports.map(report => withStatusHistory({
    ...report,
    assigned_officer: null,       // they know it's their own cases
    assigned_officer_id: caseOfficerId,
    assigned_legal_officer: null,
    assigned_paralegal: null,
    assigned_legal: (report.legal_case_assignments || [])
      .filter(a => a.is_active)
      .map(a => ({
        legal_personnel_id: a.legal_personnel_id,
        assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
        name: null,
      })),
    possible_duplicates: duplicateMatches[report.case_report_id] || [],
    ...(assessmentMap[report.case_report_id] || {}),
    case_assignments: undefined,
    legal_case_assignments: undefined,
  }, statusHistoryMap))
}

async function getAssignedLegalCaseIdsForUser(userId) {
  const { data: legalPersonnel, error: legalPersonnelError } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (legalPersonnelError) throw legalPersonnelError
  if (!legalPersonnel?.legal_personnel_id) return []

  const { data: assignments, error: assignmentError } = await supabase
    .from('legal_case_assignments')
    .select('case_report_id')
    .eq('legal_personnel_id', legalPersonnel.legal_personnel_id)
    .eq('is_active', true)
  if (assignmentError) throw assignmentError

  return [...new Set((assignments || []).map((assignment) => assignment.case_report_id).filter(Boolean))]
}

async function getReportsForLegal(userId, options = {}) {
  const LEGAL_VISIBLE_STATUS_IDS = [4, 6, 7, 8, 9, 10, 11, 12];
  // 4=Verified-True, 6=Under Case Evaluation, 7=Case Filed,
  // 8=Investigation Ongoing, 9=Hearing Ongoing, 10=Dismissed,
  // 11=Perpetrator Convicted, 12=Resolved

  const assignedCaseIds = await getAssignedLegalCaseIdsForUser(userId)

  if (arguments.length > 1) {
    return getPaginatedCaseReports({
      options: { ...options, caseIds: assignedCaseIds },
      scopeQuery: (query) => query.in('case_status_id', LEGAL_VISIBLE_STATUS_IDS),
      includeOfficerMap: false,
      enrichReport: ({ report, legalMap, assessmentMap, duplicateMatches }) => {
        const activeLegal = (report.legal_case_assignments || []).filter(a => a.is_active)
        return {
          ...report,
          assigned_officer: null,
          assigned_legal: activeLegal.map(a => ({
            legal_personnel_id: a.legal_personnel_id,
            assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
            name: legalMap[a.legal_personnel_id] || null,
          })),
          possible_duplicates: duplicateMatches[report.case_report_id] || [],
          ...(assessmentMap[report.case_report_id] || {}),
          case_assignments: undefined,
          legal_case_assignments: undefined,
        }
      },
    })
  }

  if (assignedCaseIds.length === 0) return []

  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      complainant_id,
      incident_description,
      incident_city,
      incident_province,
      incident_date,
      case_status_id,
      created_at,
      is_current,
      case_assignments (
        assignment_id,
        case_officer_id,
        is_active
      ),
      legal_case_assignments (
        legal_case_assignment_id,
        legal_personnel_id,
        assignment_role,
        is_active
      )
    `)
    .eq('is_current', true)
    .in('case_status_id', LEGAL_VISIBLE_STATUS_IDS)
    .in('case_report_id', assignedCaseIds)
    .order('created_at', { ascending: false })

  if (reportsError) throw reportsError

  const normalizedReports = await normalizeSubmittedReportStatuses(reports)
  const reportIds = normalizedReports.map(r => r.case_report_id)
  if (reportIds.length === 0) return []

  // Fetch legal personnel names
  const { data: legalPersonnels, error: legalError } = await supabase
    .from('legal_personnels')
    .select(`legal_personnel_id, users!inner(first_name, last_name)`)
  if (legalError) throw legalError

  const legalMap = {}
  for (const lp of legalPersonnels || []) {
    if (lp.users) {
      legalMap[lp.legal_personnel_id] = `${lp.users.first_name || ''} ${lp.users.last_name || ''}`.trim()
    }
  }

  const [duplicateMatches, statusHistoryMap] = await Promise.all([
    getDuplicateMatches(reportIds),
    getStatusHistoryMap(reportIds, { staffView: true }),
  ])

  return normalizedReports.map(report => {
    const activeLegal = (report.legal_case_assignments || []).filter(a => a.is_active)
    return withStatusHistory({
      ...report,
      assigned_officer: null,
      assigned_legal: activeLegal.map(a => ({
        legal_personnel_id: a.legal_personnel_id,
        assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
        name: legalMap[a.legal_personnel_id] || null,
      })),
      possible_duplicates: duplicateMatches[report.case_report_id] || [],
      case_assignments: undefined,
      legal_case_assignments: undefined,
    }, statusHistoryMap)
  })
}

async function getLegalManagementReports(options = {}) {
  const LEGAL_VISIBLE_STATUS_IDS = [4, 6, 7, 8, 9, 10, 11, 12]
  const statusIds = options.statusIds || LEGAL_VISIBLE_STATUS_IDS

  return getPaginatedCaseReports({
    options: { ...options, statusIds },
    scopeQuery: (query) => query.in('case_status_id', statusIds),
    includeOfficerMap: false,
    includeLegalMap: true,
    includeAssessments: true,
    includeDuplicateMatches: false,
    includeStatusHistory: false,
    enrichReport: ({ report, legalMap, assessmentMap }) => {
      const activeLegal = (report.legal_case_assignments || []).filter(a => a.is_active)
      return {
        ...report,
        assigned_officer: null,
        assigned_legal: activeLegal.map(a => ({
          legal_personnel_id: a.legal_personnel_id,
          assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
          name: legalMap[a.legal_personnel_id] || null,
        })),
        ...(assessmentMap[report.case_report_id] || {}),
        case_assignments: undefined,
        legal_case_assignments: undefined,
      }
    },
  })
}

async function getReportsByAssignedLegal(userId) {
  // Step 1: Find the legal_personnel_id for this user
  const { data: legalPersonnel, error: legalPersonnelError } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (legalPersonnelError) throw legalPersonnelError
  if (!legalPersonnel) return [] // user has no legal personnel profile

  const legalPersonnelId = legalPersonnel.legal_personnel_id

  // Step 2: Get only cases assigned to this legal personnel
  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      public_id,
      case_code,
      complainant_id,
      incident_description,
      incident_city,
      incident_province,
      incident_date,
      case_status_id,
      created_at,
      is_current,
      case_assignments (
        assignment_id,
        case_officer_id,
        is_active
      ),
      legal_case_assignments (
        legal_case_assignment_id,
        legal_personnel_id,
        assignment_role,
        is_active
      )
    `)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
  if (reportsError) throw reportsError

  // Step 3: Filter to only cases where this legal personnel is actively assigned
  const assignedReports = (reports || []).filter(r =>
    r.legal_case_assignments?.some(
      a => a.legal_personnel_id === legalPersonnelId && a.is_active
    )
  )

  const normalizedReports = await normalizeSubmittedReportStatuses(assignedReports)
  const reportIds = normalizedReports.map(r => r.case_report_id)
  if (reportIds.length === 0) return []

  // Step 4: Fetch legal personnel names for display
  const { data: legalPersonnels, error: legalError } = await supabase
    .from('legal_personnels')
    .select(`legal_personnel_id, users!inner(first_name, last_name)`)
  if (legalError) throw legalError

  const legalMap = {}
  for (const lp of legalPersonnels || []) {
    if (lp.users) {
      legalMap[lp.legal_personnel_id] = `${lp.users.first_name || ''} ${lp.users.last_name || ''}`.trim()
    }
  }

  const duplicateMatches = await getDuplicateMatches(reportIds)

  return normalizedReports.map(report => {
    const activeLegal = (report.legal_case_assignments || []).filter(a => a.is_active)
    return {
      ...report,
      assigned_officer: null,
      assigned_legal: activeLegal.map(a => ({
        legal_personnel_id: a.legal_personnel_id,
        assignment_role: a.assignment_role === 'legal_officer' ? 'lawyer' : a.assignment_role,
        name: legalMap[a.legal_personnel_id] || null,
      })),
      possible_duplicates: duplicateMatches[report.case_report_id] || [],
      case_assignments: undefined,
      legal_case_assignments: undefined,
    }
  })
}

module.exports = { getAll, create, getComplainantId, createReport, getReportsByUserId, getAllReports, getCaseById, getCaseSummaryById, update, getHeatmapReports, getReportsByAssignedOfficer, getReportsForLegal, getLegalManagementReports, getReportsByAssignedLegal }
