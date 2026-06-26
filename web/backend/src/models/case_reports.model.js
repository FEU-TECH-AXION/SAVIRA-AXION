const supabase = require('../config/supabase')
const { mergeApprovedFieldChanges } = require('./case_field_changes')

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

async function getCaseById(caseReportId) {
  // Step 1: Get the case report
  const { data: report, error } = await supabase
    .from('case_reports')
    .select('*')
    .eq('case_report_id', caseReportId)
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  if (!report) return null
  let normalizedReport = await normalizeSubmittedReportStatus(report)

  const { data: resolvedFollowUps, error: resolvedFollowUpsError } = await supabase
    .from('follow_up_requests')
    .select('id, resolved_at')
    .eq('case_id', caseReportId)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: true })
  if (resolvedFollowUpsError) {
    console.warn('[getCaseById] Approved follow-up metadata unavailable:', resolvedFollowUpsError.message)
  } else if (resolvedFollowUps?.length) {
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
    } else {
      const orderedChanges = [...(approvedChanges || [])].sort((a, b) => {
        const requestDifference =
          requestOrder.get(a.follow_up_request_id) - requestOrder.get(b.follow_up_request_id)
        if (requestDifference !== 0) return requestDifference
        return new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
      })
      normalizedReport = mergeApprovedFieldChanges(normalizedReport, orderedChanges)
    }
  }

  // Step 2: Get the complainant's user_id
  const { data: complainant, error: complainantError } = await supabase
    .from('complainants')
    .select('user_id')
    .eq('complainant_id', normalizedReport.complainant_id)
    .maybeSingle()
  if (complainantError) throw complainantError

  // Step 3: Get all assessments and merge latest non-null values per field
  const { data: assessments, error: assessmentError } = await supabase
    .from('case_assessments')
    .select(`
      case_type,
      primary_category,
      additional_categories,
      referral_required,
      referral_body,
      endorsement
    `)
    .eq('case_report_id', caseReportId)
    .order('created_at', { ascending: false })
  if (assessmentError) throw assessmentError

  const merged = {
    case_type:             null,
    primary_category:      null,
    additional_categories: null,
    referral_required:     false,
    referral_body:         null,
    endorsement:           null,
  }
  for (const row of assessments || []) {
    if (!merged.case_type && row.case_type?.length > 0)
      merged.case_type = row.case_type
    if (!merged.primary_category && row.primary_category)
      merged.primary_category = row.primary_category
    if (!merged.additional_categories && row.additional_categories?.length > 0)
      merged.additional_categories = row.additional_categories
    if (!merged.referral_required && row.referral_required)
      merged.referral_required = row.referral_required
    if (!merged.referral_body && row.referral_body)
      merged.referral_body = row.referral_body
    if (!merged.endorsement && row.endorsement)
      merged.endorsement = row.endorsement
  }

  // Step 4: Get active case officer assignment
  const { data: assignments, error: assignmentError } = await supabase
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
  if (assignmentError) throw assignmentError

  const officerNames = (assignments || [])
    .map((assignment) => assignment.case_officers?.users)
    .filter(Boolean)
    .map((user) => `${user.first_name || ''} ${user.last_name || ''}`.trim())
    .filter(Boolean)
  const officerName = officerNames.length > 0 ? officerNames.join(', ') : null

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from('evidences')
    .select('*')
    .eq('case_report_id', caseReportId)
  if (evidenceError) {
    console.warn('[getCaseById] Evidence metadata unavailable:', evidenceError.message)
  }

  let evidences = evidenceRows || []
  const evidencePaths = evidences.map((item) => item.file_path).filter(Boolean)
  if (evidencePaths.length > 0) {
    const { data: signedRows, error: signedError } = await supabase.storage
      .from('case-evidence')
      .createSignedUrls(evidencePaths, 60 * 60)
    if (signedError) {
      console.warn('[getCaseById] Evidence URLs unavailable:', signedError.message)
    } else {
      const urlByPath = new Map((signedRows || []).map((item) => [item.path, item.signedUrl]))
      evidences = evidences.map((item) => ({
        ...item,
        url: urlByPath.get(item.file_path) || null,
      }))
    }
  }

  const followUpSummary = await getFollowUpSummary([caseReportId])
  const duplicateMatches = await getDuplicateMatches([caseReportId])
  const { data: withdrawalRequest, error: withdrawalError } = await supabase
    .from('case_withdrawal_requests')
    .select('id, status, requested_at, reviewed_at')
    .eq('case_report_id', caseReportId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (withdrawalError && !['42P01', '42501'].includes(withdrawalError.code)) {
    console.warn('[getCaseById] Withdrawal metadata unavailable:', withdrawalError.message)
  }

  return {
    ...normalizedReport,
    complainant_user_id: complainant?.user_id || null,
    assigned_officer:    officerName,
    evidences,
    follow_up_summary:    followUpSummary[caseReportId] || null,
    withdrawal_request:   withdrawalRequest || null,
    possible_duplicates:  duplicateMatches[caseReportId] || [],
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

async function getAllReports() {
  // Step 1: Fetch case reports with their assignments
  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
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
      if (!merged.referral_required && row.referral_required)
        merged.referral_required = row.referral_required
      if (!merged.referral_body && row.referral_body)
        merged.referral_body = row.referral_body
      if (!merged.endorsement && row.endorsement)
        merged.endorsement = row.endorsement
      assessmentMap[row.case_report_id] = merged
    }
  }

  // Step 3: Merge officer name and legal names into each report
  const duplicateMatches = await getDuplicateMatches(reportIds)
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

    return {
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
    }
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
  return (data || []).reduce((map, item) => {
    if (!map[item.case_report_id]) map[item.case_report_id] = []
    map[item.case_report_id].push(item)
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
    .select('case_report_id, incident_city, case_status_id, gender_identity, perpetrator_gender')
    .eq('is_current', true)
  if (error) {
    console.error('[getHeatmapReports] Supabase error:', error.message)
    throw error
  }
  return normalizeSubmittedReportStatuses(data)
}

async function getReportsByAssignedOfficer(userId) {
  // Step 1: Find the case_officer_id for this user
  const { data: officer, error: officerError } = await supabase
    .from('case_officers')
    .select('case_officer_id')
    .eq('user_id', userId)  // adjust if your FK column name differs
    .maybeSingle()
  if (officerError) throw officerError
  if (!officer) return [] // user has no officer profile, return empty

  const caseOfficerId = officer.case_officer_id

  // Step 2: Get only cases assigned to this officer
  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
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
    if (!merged.referral_required && row.referral_required) merged.referral_required = row.referral_required
    if (!merged.referral_body && row.referral_body) merged.referral_body = row.referral_body
    if (!merged.endorsement && row.endorsement) merged.endorsement = row.endorsement
    assessmentMap[row.case_report_id] = merged
  }

  const duplicateMatches = await getDuplicateMatches(reportIds)

  return normalizedReports.map(report => ({
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
  }))
}

async function getReportsForLegal() {
  const LEGAL_VISIBLE_STATUS_IDS = [4, 6, 7, 8, 9, 10, 11, 12];
  // 4=Verified-True, 6=Under Case Evaluation, 7=Case Filed,
  // 8=Investigation Ongoing, 9=Hearing Ongoing, 10=Dismissed,
  // 11=Perpetrator Convicted, 12=Resolved

  const { data: reports, error: reportsError } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
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

module.exports = { getAll, create, getComplainantId, createReport, getReportsByUserId, getAllReports, getCaseById, update, getHeatmapReports, getReportsByAssignedOfficer, getReportsForLegal, getReportsByAssignedLegal }
