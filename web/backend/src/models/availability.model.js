const supabase = require('../config/supabase')

const ACTIVE_PROJECT_STATUSES = new Set(['Upcoming', 'Active'])

const increment = (map, key) => {
  if (key === null || key === undefined) return
  map[key] = (map[key] || 0) + 1
}

const normalizeName = (value) => String(value || '').trim().toLowerCase()

const getAll = async () => {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      user_id,
      first_name,
      last_name,
      email,
      role_id,
      is_active,
      availability_status,
      availability_note,
      availability_updated_at,
      max_active_cases,
      max_legal_assignments,
      max_volunteer_reviews,
      max_project_assignments,
      roles (role_name)
    `)
    .eq('is_active', true)
  if (usersError) throw usersError

  const relevantUsers = (users || []).filter((user) =>
    ['Staff', 'Case Officer', 'Legal Personnel'].includes(user.roles?.role_name)
  )
  const userIds = relevantUsers.map((user) => user.user_id)
  if (userIds.length === 0) return []

  const [
    caseOfficersResult,
    legalPersonnelResult,
    staffResult,
    conflictsResult,
    projectsResult,
    interviewsResult,
  ] = await Promise.all([
    supabase.from('case_officers').select('case_officer_id, user_id').in('user_id', userIds),
    supabase.from('legal_personnels').select('legal_personnel_id, user_id, legal_personnel_type').in('user_id', userIds),
    supabase.from('staff').select('staff_id, user_id, committee_id, committees(committee_name)').in('user_id', userIds),
    supabase.from('availability_events')
      .select('availability_event_id, user_id, module, event_type, title, starts_at, ends_at')
      .in('user_id', userIds)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true }),
    supabase.from('projects')
      .select('project_id, project_status, project_officers, project_committee_members'),
    supabase.from('interviews')
      .select(`
        interview_id,
        type,
        status,
        interviewer_user_id,
        case_report_id,
        volunteer_application_id,
        slot:interview_slots(slot_date, slot_time, duration_minutes)
      `)
      .in('interviewer_user_id', userIds)
      .not('status', 'in', '("completed","cancelled","rejected","expired")'),
  ])

  for (const result of [caseOfficersResult, legalPersonnelResult, staffResult, conflictsResult, projectsResult, interviewsResult]) {
    if (result.error) throw result.error
  }

  const caseOfficers = caseOfficersResult.data || []
  const legalPersonnel = legalPersonnelResult.data || []
  const staffRows = staffResult.data || []
  const caseOfficerIds = caseOfficers.map((row) => row.case_officer_id)
  const legalPersonnelIds = legalPersonnel.map((row) => row.legal_personnel_id)
  const staffIds = staffRows.map((row) => row.staff_id)

  const [caseAssignmentsResult, legalAssignmentsResult, reviewAssignmentsResult, taskAssignmentsResult] =
    await Promise.all([
      caseOfficerIds.length
        ? supabase.from('case_assignments').select('case_officer_id').in('case_officer_id', caseOfficerIds).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      legalPersonnelIds.length
        ? supabase.from('legal_case_assignments').select('legal_personnel_id').in('legal_personnel_id', legalPersonnelIds).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('volunteer_application_assignments').select('assessor_id').in('assessor_id', userIds).eq('is_active', true),
      staffIds.length
        ? supabase.from('project_tasks').select('assigned_to, status').in('assigned_to', staffIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  for (const result of [caseAssignmentsResult, legalAssignmentsResult, reviewAssignmentsResult, taskAssignmentsResult]) {
    if (result.error) throw result.error
  }

  const caseOfficerByUser = new Map(caseOfficers.map((row) => [row.user_id, row]))
  const legalByUser = new Map(legalPersonnel.map((row) => [row.user_id, row]))
  const staffByUser = new Map(staffRows.map((row) => [row.user_id, row]))
  const caseLoads = {}
  const legalLoads = {}
  const reviewLoads = {}
  const taskLoads = {}
  const projectLoads = {}

  for (const row of caseAssignmentsResult.data || []) increment(caseLoads, row.case_officer_id)
  for (const row of legalAssignmentsResult.data || []) increment(legalLoads, row.legal_personnel_id)
  for (const row of reviewAssignmentsResult.data || []) increment(reviewLoads, row.assessor_id)
  for (const row of taskAssignmentsResult.data || []) {
    if (!['Completed', 'Cancelled'].includes(row.status)) increment(taskLoads, row.assigned_to)
  }

  const usersByName = new Map(relevantUsers.map((user) => [
    normalizeName(`${user.first_name || ''} ${user.last_name || ''}`),
    user.user_id,
  ]))
  for (const project of projectsResult.data || []) {
    if (!ACTIVE_PROJECT_STATUSES.has(project.project_status)) continue
    const names = [...(project.project_officers || []), ...(project.project_committee_members || [])]
    for (const name of new Set(names.map(normalizeName).filter(Boolean))) {
      const userId = usersByName.get(name)
      if (userId) increment(projectLoads, userId)
    }
  }

  const conflictsByUser = {}
  for (const event of conflictsResult.data || []) {
    if (!conflictsByUser[event.user_id]) conflictsByUser[event.user_id] = []
    conflictsByUser[event.user_id].push(event)
  }
  for (const interview of interviewsResult.data || []) {
    if (!interview.slot?.slot_date || !interview.slot?.slot_time) continue
    const startsAt = new Date(`${interview.slot.slot_date}T${interview.slot.slot_time}`)
    if (Number.isNaN(startsAt.getTime()) || startsAt < new Date()) continue
    const endsAt = new Date(startsAt.getTime() + (interview.slot.duration_minutes || 60) * 60000)
    const event = {
      availability_event_id: `interview-${interview.interview_id}`,
      user_id: interview.interviewer_user_id,
      module: interview.type === 'volunteer' ? 'volunteer_applications' : 'case_management',
      event_type: 'interview',
      title: interview.type === 'volunteer' ? 'Volunteer interview' : 'Case interview',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    }
    if (!conflictsByUser[event.user_id]) conflictsByUser[event.user_id] = []
    conflictsByUser[event.user_id].push(event)
  }
  for (const userId of Object.keys(conflictsByUser)) {
    conflictsByUser[userId].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  }

  return relevantUsers.map((user) => {
    const caseOfficer = caseOfficerByUser.get(user.user_id)
    const legal = legalByUser.get(user.user_id)
    const staff = staffByUser.get(user.user_id)
    const loads = {
      cases: caseLoads[caseOfficer?.case_officer_id] || 0,
      legal: legalLoads[legal?.legal_personnel_id] || 0,
      volunteer: reviewLoads[user.user_id] || 0,
      projects: projectLoads[user.user_id] || 0,
      tasks: taskLoads[staff?.staff_id] || 0,
    }
    const limits = {
      cases: user.max_active_cases || 10,
      legal: user.max_legal_assignments || 10,
      volunteer: user.max_volunteer_reviews || 10,
      projects: user.max_project_assignments || 5,
    }

    let primaryLoad = loads.projects
    let primaryLimit = limits.projects
    if (user.roles?.role_name === 'Case Officer') {
      primaryLoad = loads.cases
      primaryLimit = limits.cases
    } else if (user.roles?.role_name === 'Legal Personnel') {
      primaryLoad = loads.legal
      primaryLimit = limits.legal
    } else if (staff?.committee_id === 2) {
      primaryLoad = loads.volunteer
      primaryLimit = limits.volunteer
    }

    const explicitStatus = user.availability_status || 'Available'
    const effectiveStatus = explicitStatus === 'Available' && primaryLoad >= primaryLimit
      ? 'Busy'
      : explicitStatus

    return {
      user_id: user.user_id,
      staff_id: staff?.staff_id || null,
      case_officer_id: caseOfficer?.case_officer_id || null,
      legal_personnel_id: legal?.legal_personnel_id || null,
      legal_personnel_type: legal?.legal_personnel_type || null,
      committee_id: staff?.committee_id || null,
      committee: staff?.committees?.committee_name || null,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email,
      role: user.roles?.role_name || 'Staff',
      availability_status: explicitStatus,
      effective_status: effectiveStatus,
      availability_note: user.availability_note || null,
      availability_updated_at: user.availability_updated_at || null,
      loads,
      limits,
      active_cases: loads.cases,
      active_legal_assignments: loads.legal,
      active_reviews: loads.volunteer,
      active_projects: loads.projects,
      active_tasks: loads.tasks,
      upcoming_conflicts: conflictsByUser[user.user_id] || [],
    }
  })
}

const update = async (userId, payload) => {
  const allowed = {
    availability_status: payload.availability_status,
    availability_note: payload.availability_note,
    max_active_cases: payload.max_active_cases,
    max_legal_assignments: payload.max_legal_assignments,
    max_volunteer_reviews: payload.max_volunteer_reviews,
    max_project_assignments: payload.max_project_assignments,
    availability_updated_at: new Date().toISOString(),
  }
  const changes = Object.fromEntries(
    Object.entries(allowed).filter(([, value]) => value !== undefined)
  )
  const { data, error } = await supabase
    .from('users')
    .update(changes)
    .eq('user_id', userId)
    .select(`
      user_id,
      availability_status,
      availability_note,
      availability_updated_at,
      max_active_cases,
      max_legal_assignments,
      max_volunteer_reviews,
      max_project_assignments
    `)
    .single()
  if (error) throw error
  return data
}

module.exports = { getAll, update }
