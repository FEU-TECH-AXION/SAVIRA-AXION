const supabase = require('../config/supabase')

const CASE_STATUS = {
  FOR_VERIFICATION: 2,
  VERIFIED_TRUE: 4,
  UNDER_CASE_EVALUATION: 6,
}

function getRole(req) {
  return String(req.user?.role || req.user?.role_name || '').toLowerCase()
}

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null
}

async function countRows(table, column = 'id', apply = (query) => query) {
  const { count, error } = await apply(
    supabase.from(table).select(column, { count: 'exact', head: true })
  )
  if (error) throw error
  return count || 0
}

async function getCaseOfficerId(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('case_officers')
    .select('case_officer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.case_officer_id || null
}

async function getLegalPersonnelId(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.legal_personnel_id || null
}

async function getAssignedCaseIdsForOfficer(userId) {
  const officerId = await getCaseOfficerId(userId)
  if (!officerId) return []

  const { data, error } = await supabase
    .from('case_assignments')
    .select('case_report_id')
    .eq('case_officer_id', officerId)
    .eq('is_active', true)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id).filter(Boolean))]
}

async function getAssignedCaseIdsForLegal(userId) {
  const legalPersonnelId = await getLegalPersonnelId(userId)
  if (!legalPersonnelId) return []

  const { data, error } = await supabase
    .from('legal_case_assignments')
    .select('case_report_id')
    .eq('legal_personnel_id', legalPersonnelId)
    .eq('is_active', true)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.case_report_id).filter(Boolean))]
}

async function countCurrentCases(apply = (query) => query) {
  return countRows('case_reports', 'case_report_id', (query) =>
    apply(query.eq('is_current', true))
  )
}

async function countCurrentCasesByIds(caseIds, apply = (query) => query) {
  if (!caseIds?.length) return 0
  return countCurrentCases((query) => apply(query.in('case_report_id', caseIds)))
}

async function getUnassignedCaseCount() {
  const { data, error } = await supabase
    .from('case_assignments')
    .select('case_report_id')
    .eq('is_active', true)
  if (error) throw error

  const assignedIds = [...new Set((data || []).map((row) => row.case_report_id).filter(Boolean))]
  return countCurrentCases((query) => {
    if (assignedIds.length === 0) return query
    return query.not('case_report_id', 'in', `(${assignedIds.join(',')})`)
  })
}

async function getAssignedVolunteerApplicationIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('volunteer_application_assignments')
    .select('volunteer_application_id')
    .eq('assessor_id', userId)
    .eq('is_active', true)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.volunteer_application_id).filter(Boolean))]
}

async function getVolunteerCounts({ role, userId } = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const assignedIds = role === 'staff' ? await getAssignedVolunteerApplicationIds(userId) : null
  const applyScope = (query) => {
    if (!Array.isArray(assignedIds)) return query
    if (assignedIds.length === 0) return query.eq('volunteer_application_id', -1)
    return query.in('volunteer_application_id', assignedIds)
  }

  const [total, newToday, reviewApplications] = await Promise.all([
    countRows('volunteer_applications', 'volunteer_application_id', applyScope),
    countRows('volunteer_applications', 'volunteer_application_id', (query) =>
      applyScope(query).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString())
    ),
    countRows('volunteer_applications', 'volunteer_application_id', (query) =>
      applyScope(query).in('application_status', ['pending', 'under_review', 'reviewing', 'for_review'])
    ),
  ])

  return { total, newToday, reviewApplications }
}

async function getCaseCountsForRole(req) {
  const role = getRole(req)
  const userId = getUserId(req)

  if (role === 'case officer') {
    const caseIds = await getAssignedCaseIdsForOfficer(userId)
    const [assignedToMe, forVerification] = await Promise.all([
      countCurrentCasesByIds(caseIds),
      countCurrentCasesByIds(caseIds, (query) => query.eq('case_status_id', CASE_STATUS.FOR_VERIFICATION)),
    ])
    return {
      total: assignedToMe,
      forVerification,
      unassigned: 0,
      assignedToMe,
      pendingLegalReview: 0,
      byStatus: { [CASE_STATUS.FOR_VERIFICATION]: forVerification },
    }
  }

  if (role === 'legal personnel') {
    const caseIds = await getAssignedCaseIdsForLegal(userId)
    const [assignedToMe, pendingLegalReview] = await Promise.all([
      countCurrentCasesByIds(caseIds),
      countCurrentCasesByIds(caseIds, (query) =>
        query.in('case_status_id', [CASE_STATUS.VERIFIED_TRUE, CASE_STATUS.UNDER_CASE_EVALUATION])
      ),
    ])
    return {
      total: assignedToMe,
      forVerification: 0,
      unassigned: 0,
      assignedToMe,
      pendingLegalReview,
      byStatus: {
        [CASE_STATUS.VERIFIED_TRUE]: pendingLegalReview,
        [CASE_STATUS.UNDER_CASE_EVALUATION]: pendingLegalReview,
      },
    }
  }

  const [total, forVerification, unassigned] = await Promise.all([
    countCurrentCases(),
    countCurrentCases((query) => query.eq('case_status_id', CASE_STATUS.FOR_VERIFICATION)),
    getUnassignedCaseCount(),
  ])

  return {
    total,
    forVerification,
    unassigned,
    assignedToMe: 0,
    pendingLegalReview: 0,
    byStatus: { [CASE_STATUS.FOR_VERIFICATION]: forVerification },
  }
}

async function getInterviewCount(req) {
  const role = getRole(req)
  const userId = getUserId(req)

  return countRows('interviews', 'interview_id', (query) => {
    let next = query.eq('type', 'case_report')
    if (role === 'case officer' || role === 'staff') {
      next = next.eq('interviewer_user_id', userId)
    }
    return next
  })
}

async function getSummaryCounts(req, res) {
  try {
    const role = getRole(req)
    const [cases, volunteers, interviews, usersTotal, projectsTotal] = await Promise.all([
      getCaseCountsForRole(req),
      role === 'admin' || role === 'staff'
        ? getVolunteerCounts({ role, userId: getUserId(req) })
        : Promise.resolve({ total: 0, newToday: 0, reviewApplications: 0 }),
      getInterviewCount(req),
      role === 'admin' ? countRows('users', 'user_id') : Promise.resolve(0),
      role === 'admin' ? countRows('projects', 'project_id') : Promise.resolve(0),
    ])

    return res.json({
      data: {
        cases,
        volunteers,
        interviews: { total: interviews },
        users: { total: usersTotal },
        projects: { total: projectsTotal },
      },
    })
  } catch (err) {
    console.error('[dashboard.getSummaryCounts]', err)
    return res.status(500).json({ error: err.message })
  }
}

module.exports = { getSummaryCounts }
