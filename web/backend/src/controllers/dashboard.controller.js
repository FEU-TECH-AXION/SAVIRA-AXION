const supabase = require('../config/supabase')

const CACHE_TTL_MS = 45 * 1000
const dashboardCache = new Map()

const CASE_STATUS = {
  FOR_VERIFICATION: 2,
  VERIFIED_TRUE: 4,
  UNDER_CASE_EVALUATION: 6,
}
const LEGAL_STATUS_IDS = [4, 6, 7, 8, 9, 10, 11, 12]
const LEGAL_STATUS_NAMES = {
  4: 'Verified - True',
  6: 'Under Case Evaluation',
  7: 'Case Filed',
  8: 'Investigation Ongoing',
  9: 'Hearing Ongoing',
  10: 'Dismissed',
  11: 'Perpetrator Convicted',
  12: 'Resolved',
}

function getRole(req) {
  return String(req.user?.role || req.user?.role_name || '').toLowerCase()
}

function getUserId(req) {
  return req.user?.user_id || req.user?.id || null
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function samePerson(a, b) {
  return Boolean(normalizeText(a) && normalizeText(a) === normalizeText(b))
}

function dateOnly(value) {
  if (!value) return ''
  return String(value).split('T')[0]
}

function parseDate(value) {
  const only = dateOnly(value)
  if (!only) return null
  const date = new Date(`${only}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUpcoming(value) {
  const date = parseDate(value)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

function computeProjectStatus(project) {
  if (['Postponed', 'Cancelled'].includes(project?.project_status)) return project.project_status
  const start = parseDate(project?.start_date)
  const end = parseDate(project?.end_date) || start
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!start) return 'Upcoming'
  if (end && end < today) return 'Completed'
  if (start > today) return 'Upcoming'
  return 'Active'
}

function formatDeadlineDate(value, time) {
  const date = parseDate(value)
  if (!date) return String(value || '')
  const formatted = date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return time ? `${formatted} at ${String(time).slice(0, 5)}` : formatted
}

function makeDeadline({ icon, title, dateValue, time, type }) {
  const date = parseDate(dateValue)
  if (!date || !isUpcoming(dateValue)) return null
  return {
    icon,
    title,
    date: formatDeadlineDate(dateValue, time),
    dateValue: dateOnly(dateValue),
    sortTime: date.getTime(),
    type,
  }
}

function limitDeadlines(deadlines, limit = 3) {
  const seen = new Set()
  return (deadlines || [])
    .filter(Boolean)
    .sort((a, b) => a.sortTime - b.sortTime || a.title.localeCompare(b.title))
    .filter((deadline) => {
      const key = `${deadline.type || ''}-${deadline.title}-${deadline.dateValue}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

function getCache(key) {
  const cached = dashboardCache.get(key)
  if (!cached || cached.expiresAt < Date.now()) {
    dashboardCache.delete(key)
    return null
  }
  return cached.value
}

function setCache(key, value) {
  dashboardCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

async function respondCached(req, res, key, producer) {
  const cached = getCache(key)
  if (cached) return res.json({ data: cached, cache: 'hit' })
  const value = await producer()
  setCache(key, value)
  return res.json({ data: value, cache: 'miss' })
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
    if (role === 'case officer' || role === 'staff') next = next.eq('interviewer_user_id', userId)
    return next
  })
}

async function getConfirmedInterviewDeadlines({ userId = null, limit = 20 } = {}) {
  let query = supabase
    .from('interviews')
    .select(`
      interview_id,
      case_report_id,
      interviewer_user_id,
      status,
      slot:interview_slots(slot_date, slot_time)
    `)
    .eq('type', 'case_report')
    .eq('status', 'confirmed')
    .limit(limit)
  if (userId) query = query.eq('interviewer_user_id', userId)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((interview) => makeDeadline({
    icon: 'interview',
    title: `Confirmed interview: ${interview.case_report_id ? `Case #${interview.case_report_id}` : 'Case interview'}`,
    dateValue: interview.slot?.slot_date,
    time: interview.slot?.slot_time,
    type: 'interview',
  }))
}

async function getProjectDeadlines({ actorName = null, limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('projects')
    .select('event_name, due_date, end_date, project_status, project_officers, project_committee_members')
    .limit(limit)
  if (error) throw error

  return (data || [])
    .filter((project) => {
      if (!actorName) return true
      const officers = Array.isArray(project.project_officers) ? project.project_officers : [project.project_officers].filter(Boolean)
      const members = Array.isArray(project.project_committee_members) ? project.project_committee_members : [project.project_committee_members].filter(Boolean)
      return [...officers, ...members].some((name) => samePerson(name, actorName))
    })
    .map((project) => makeDeadline({
      icon: 'project',
      title: project.event_name || 'Project deadline',
      dateValue: project.due_date || project.end_date,
      type: 'project',
    }))
}

async function getProjectTaskDeadlines({ userId = null, actorName = null, committeeName = null, includeCommittee = false, limit = 40 } = {}) {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      title,
      due_date,
      status,
      projects ( event_name ),
      staff!project_tasks_assigned_to_fkey (
        user_id,
        committees ( committee_name ),
        users ( first_name, last_name )
      )
    `)
    .not('due_date', 'is', null)
    .limit(limit)
  if (error) throw error

  return (data || [])
    .filter((task) => !['completed', 'cancelled', 'canceled'].includes(normalizeText(task.status)))
    .filter((task) => {
      if (!userId && !actorName && !committeeName) return true
      const assigneeName = `${task.staff?.users?.first_name || ''} ${task.staff?.users?.last_name || ''}`.trim()
      const mine = task.staff?.user_id === userId || samePerson(assigneeName, actorName)
      const committeeMatch = includeCommittee && committeeName &&
        normalizeText(task.staff?.committees?.committee_name) === normalizeText(committeeName)
      return mine || committeeMatch
    })
    .map((task) => makeDeadline({
      icon: 'task',
      title: task.projects?.event_name ? `${task.title} (${task.projects.event_name})` : task.title || 'Project task',
      dateValue: task.due_date,
      type: 'project-task',
    }))
}

function splitDateValues(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(splitDateValues)
  const text = String(value)
  const matches = [
    ...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g),
    ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g),
    ...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi),
  ].map((match) => match[0])
  if (matches.length > 0) return matches
  return Number.isNaN(new Date(text).getTime()) ? [] : [text]
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

function addDateEvents(events, { type, label, value }) {
  splitDateValues(value).forEach((dateValue) => {
    events.push({ type: type || eventTypeFromLabel(label), label, value: dateValue })
  })
}

function addObjectDateEvents(events, object) {
  Object.entries(object || {}).forEach(([key, value]) => {
    const keyText = key.toLowerCase()
    if (keyText.includes('date') || keyText.includes('schedule') || keyText.includes('hearing')) {
      addDateEvents(events, { label: titleFromKey(key), value })
    }
  })
}

function legalEventsForCase({ report, review, history }) {
  const events = []
  addObjectDateEvents(events, review?.endorsement_details)
  for (const row of history || []) {
    const status = row.case_status?.case_status_name || LEGAL_STATUS_NAMES[row.case_status_id] || 'Status'
    addDateEvents(events, { type: 'status', label: `${status} update`, value: row.approved_at || row.created_at })
    addObjectDateEvents(events, row.form_data || {})
  }
  if (review?.paralegal_record) {
    addDateEvents(events, { type: 'paralegal', label: 'Paralegal support recorded', value: review.paralegal_record.date })
    addDateEvents(events, { type: 'paralegal', label: 'Ready for lawyer review', value: review.paralegal_record.readyAt })
  }
  if (review?.lawyer_record) {
    addDateEvents(events, { type: 'consultation', label: 'Lawyer consultation', value: review.lawyer_record.date })
    for (const consultation of review.lawyer_record.consultations || []) {
      addDateEvents(events, {
        type: 'consultation',
        label: `${consultation.consultationType || 'Lawyer'} consultation`,
        value: consultation.date || consultation.consultationDate,
      })
    }
  }
  for (const entry of review?.monitoring_log || []) {
    addDateEvents(events, { type: 'monitoring', label: 'Monitoring follow-up', value: entry.date })
  }
  for (const document of review?.document_repository || []) {
    addDateEvents(events, {
      type: 'document',
      label: `Document added${document.label ? `: ${document.label}` : ''}`,
      value: document.addedAt,
    })
  }

  const caseId = report.public_id ? `CASE-${String(report.public_id).slice(0, 8).toUpperCase()}` : 'Case'
  return events.map((event) => makeDeadline({
    icon: event.type || 'legal',
    title: `${event.label}: ${caseId}`,
    dateValue: event.value,
    type: `legal-${event.type || 'date'}`,
  }))
}

async function getLegalDeadlines({ userId = null, limit = 50 } = {}) {
  let scopedCaseIds = null
  if (userId) scopedCaseIds = await getAssignedCaseIdsForLegal(userId)
  if (Array.isArray(scopedCaseIds) && scopedCaseIds.length === 0) return []

  let reportQuery = supabase
    .from('case_reports')
    .select('case_report_id, public_id, case_status_id, created_at')
    .eq('is_current', true)
    .in('case_status_id', LEGAL_STATUS_IDS)
  if (Array.isArray(scopedCaseIds)) reportQuery = reportQuery.in('case_report_id', scopedCaseIds)

  const { data: reports, error: reportsError } = await reportQuery
  if (reportsError) throw reportsError

  const caseIds = (reports || []).map((report) => report.case_report_id)
  if (caseIds.length === 0) return []

  const [reviewsResult, historyResult] = await Promise.all([
    supabase
      .from('legal_reviews')
      .select('*')
      .in('case_report_id', caseIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('case_status_history')
      .select('case_report_id, case_status_id, form_data, approved_at, created_at, case_status ( case_status_name )')
      .in('case_report_id', caseIds)
      .order('created_at', { ascending: true }),
  ])
  if (reviewsResult.error) throw reviewsResult.error
  if (historyResult.error) throw historyResult.error

  const latestReviewByCase = {}
  for (const review of reviewsResult.data || []) {
    if (!latestReviewByCase[review.case_report_id]) latestReviewByCase[review.case_report_id] = review
  }
  const historyByCase = (historyResult.data || []).reduce((map, row) => {
    if (!map[row.case_report_id]) map[row.case_report_id] = []
    map[row.case_report_id].push(row)
    return map
  }, {})

  return limitDeadlines((reports || []).flatMap((report) =>
    legalEventsForCase({
      report,
      review: latestReviewByCase[report.case_report_id],
      history: historyByCase[report.case_report_id] || [],
    })
  ), limit)
}

async function getStaffContext(userId) {
  const { data, error } = await supabase
    .from('staff')
    .select('committee_id, committees ( committee_name ), users ( first_name, last_name )')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const name = `${data?.users?.first_name || ''} ${data?.users?.last_name || ''}`.trim()
  return {
    committeeId: data?.committee_id || null,
    committeeName: data?.committees?.committee_name || '',
    actorName: name,
  }
}

async function getStaffWorkCounts({ userId, actorName, committeeName }) {
  const [projectsResult, tasksResult] = await Promise.all([
    supabase
      .from('projects')
      .select('project_status, start_date, due_date, end_date, project_officers, project_committee_members'),
    supabase
      .from('project_tasks')
      .select(`
        status,
        due_date,
        staff!project_tasks_assigned_to_fkey (
          user_id,
          committees ( committee_name ),
          users ( first_name, last_name )
        )
      `),
  ])
  if (projectsResult.error) throw projectsResult.error
  if (tasksResult.error) throw tasksResult.error

  const scopedProjects = (projectsResult.data || []).filter((project) => {
    const officers = Array.isArray(project.project_officers) ? project.project_officers : [project.project_officers].filter(Boolean)
    const members = Array.isArray(project.project_committee_members) ? project.project_committee_members : [project.project_committee_members].filter(Boolean)
    return [...officers, ...members].some((name) => samePerson(name, actorName))
  })
  const scopedTasks = (tasksResult.data || []).filter((task) => {
    const assigneeName = `${task.staff?.users?.first_name || ''} ${task.staff?.users?.last_name || ''}`.trim()
    const mine = task.staff?.user_id === userId || samePerson(assigneeName, actorName)
    const committeeMatch = committeeName &&
      normalizeText(task.staff?.committees?.committee_name) === normalizeText(committeeName)
    return mine || committeeMatch
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    activeProjects: scopedProjects.filter((project) => computeProjectStatus(project) === 'Active').length,
    upcomingEvents: scopedProjects.filter((project) => {
      const status = normalizeText(computeProjectStatus(project))
      const date = parseDate(project.start_date || project.due_date || project.end_date)
      return !['completed', 'postponed', 'cancelled'].includes(status) && date && date >= today
    }).length,
    openProjectTasks: scopedTasks.filter((task) => !['completed', 'cancelled', 'canceled'].includes(normalizeText(task.status))).length,
    overdueTasks: scopedTasks.filter((task) => {
      const dueDate = parseDate(task.due_date)
      return dueDate && dueDate < today && !['completed', 'cancelled', 'canceled'].includes(normalizeText(task.status))
    }).length,
  }
}

async function buildAdminSummary(req) {
  const [cases, volunteers, interviewsCount, usersTotal, projectsTotal, interviewDeadlines, projectDeadlines, taskDeadlines, legalDeadlines] = await Promise.all([
    getCaseCountsForRole(req),
    getVolunteerCounts({ role: 'admin' }),
    getInterviewCount(req),
    countRows('users', 'user_id'),
    countRows('projects', 'project_id'),
    getConfirmedInterviewDeadlines({ limit: 50 }),
    getProjectDeadlines({ limit: 50 }),
    getProjectTaskDeadlines({ limit: 50 }),
    getLegalDeadlines({ limit: 50 }),
  ])
  return {
    counts: {
      totalProjects: projectsTotal,
      totalUsers: usersTotal,
      totalCases: cases.total,
      unassignedCases: cases.unassigned,
      underVerification: cases.forVerification,
      newApplicationsToday: volunteers.newToday,
      reviewApplications: volunteers.reviewApplications,
    },
    cases,
    volunteers,
    interviews: { total: interviewsCount },
    users: { total: usersTotal },
    projects: { total: projectsTotal },
    deadlines: limitDeadlines([...interviewDeadlines, ...projectDeadlines, ...taskDeadlines, ...legalDeadlines], 12),
  }
}

async function buildCaseOfficerSummary(req) {
  const userId = getUserId(req)
  const [cases, interviewDeadlines] = await Promise.all([
    getCaseCountsForRole(req),
    getConfirmedInterviewDeadlines({ userId, limit: 20 }),
  ])
  return {
    counts: {
      forVerification: cases.forVerification,
      totalAssignedCases: cases.assignedToMe,
    },
    cases,
    deadlines: limitDeadlines(interviewDeadlines, 3),
  }
}

async function buildLegalSummary(req) {
  const userId = getUserId(req)
  const [cases, legalDeadlines] = await Promise.all([
    getCaseCountsForRole(req),
    getLegalDeadlines({ userId, limit: 30 }),
  ])
  return {
    counts: {
      pendingReview: cases.pendingLegalReview,
      totalAssignedCases: cases.assignedToMe,
    },
    cases,
    deadlines: limitDeadlines(legalDeadlines, 3),
  }
}

async function buildStaffSummary(req) {
  const userId = getUserId(req)
  const context = await getStaffContext(userId)
  const isMembershipStaff = Number(context.committeeId) === 2
  const [volunteers, interviewDeadlines, projectDeadlines, taskDeadlines, workCounts] = await Promise.all([
    isMembershipStaff ? getVolunteerCounts({ role: 'staff', userId }) : Promise.resolve({ total: 0, newToday: 0, reviewApplications: 0 }),
    isMembershipStaff ? getConfirmedInterviewDeadlines({ userId, limit: 20 }) : Promise.resolve([]),
    getProjectDeadlines({ actorName: context.actorName, limit: 40 }),
    getProjectTaskDeadlines({
      userId,
      actorName: context.actorName,
      committeeName: context.committeeName,
      includeCommittee: Boolean(context.committeeName),
      limit: 40,
    }),
    getStaffWorkCounts({ userId, actorName: context.actorName, committeeName: context.committeeName }),
  ])

  return {
    counts: {
      newApplicationsToday: volunteers.newToday,
      reviewApplications: volunteers.reviewApplications,
      activeProjects: workCounts.activeProjects,
      openProjectTasks: workCounts.openProjectTasks,
      upcomingEvents: workCounts.upcomingEvents,
      overdueTasks: workCounts.overdueTasks,
    },
    volunteers,
    staff: { committeeId: context.committeeId, committeeName: context.committeeName, isMembershipStaff },
    deadlines: limitDeadlines([...projectDeadlines, ...taskDeadlines, ...interviewDeadlines], 3),
  }
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

async function getAdminSummary(req, res) {
  try {
    return await respondCached(req, res, 'dashboard:admin', () => buildAdminSummary(req))
  } catch (err) {
    console.error('[dashboard.getAdminSummary]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function getCaseOfficerSummary(req, res) {
  try {
    const userId = getUserId(req)
    return await respondCached(req, res, `dashboard:case-officer:user:${userId}`, () => buildCaseOfficerSummary(req))
  } catch (err) {
    console.error('[dashboard.getCaseOfficerSummary]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function getLegalSummary(req, res) {
  try {
    const userId = getUserId(req)
    return await respondCached(req, res, `dashboard:legal:user:${userId}`, () => buildLegalSummary(req))
  } catch (err) {
    console.error('[dashboard.getLegalSummary]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function getStaffSummary(req, res) {
  try {
    const userId = getUserId(req)
    const committeeId = req.user?.committee_id || 'unknown'
    return await respondCached(req, res, `dashboard:staff:user:${userId}:committee:${committeeId}`, () => buildStaffSummary(req))
  } catch (err) {
    console.error('[dashboard.getStaffSummary]', err)
    return res.status(500).json({ error: err.message })
  }
}

module.exports = {
  getSummaryCounts,
  getAdminSummary,
  getCaseOfficerSummary,
  getLegalSummary,
  getStaffSummary,
}
