const supabase = require('../config/supabase')

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
  const normalizedReport = await normalizeSubmittedReportStatus(report)

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
  const { data: assignment, error: assignmentError } = await supabase
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
    .maybeSingle()
  if (assignmentError) throw assignmentError

  const officerName = assignment?.case_officers?.users
    ? `${assignment.case_officers.users.first_name} ${assignment.case_officers.users.last_name}`.trim()
    : null

  return {
    ...normalizedReport,
    complainant_user_id: complainant?.user_id || null,
    assigned_officer:    officerName,
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
      case_status_id
    `)
    .eq('complainant_id', complainantId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return normalizeSubmittedReportStatuses(data)
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

    if (report.legal_case_assignments?.length > 0) {
      const activeLegal = report.legal_case_assignments.filter(a => a.is_active)
      const officerAss = activeLegal.find(a => a.assignment_role === 'legal_officer')
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
      ...(assessmentMap[report.case_report_id] || {}),
      case_assignments:       undefined,
      legal_case_assignments: undefined,
    }
  })
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

module.exports = { getAll, create, getComplainantId, createReport, getReportsByUserId, getAllReports, getCaseById, update, getHeatmapReports }
