const supabase = require('../config/supabase')
const { resolveActors } = require('../utils/actor')
const { randomUUID } = require('crypto')
const { matchNamesToStaff } = require('../utils/projectPersonnelMatching')

const ALLOWED_FIELDS = [
  'event_name',
  'event_tagline',
  'description',
  'category',
  'activity_mode',
  'venue',
  'online_platform',
  'online_link',
  'start_date',
  'end_date',
  'start_time',
  'end_time',
  'due_date',
  'logistical_requirement',
  'financial_requirement',
  'operational_requirement',
  'target_participants',
  'partner_organization',
  'project_status',
  'visibility',
  'approval_status',
  'image',
  'project_officers',
  'project_committee_members',
]

// Strip ISO timestamp suffix so HTML <input type="date"> gets plain YYYY-MM-DD
const toDateStr = (val) => (val ? String(val).split('T')[0] : null)
const toTimeStr = (val) => (val ? String(val).slice(0, 5) : '')
const UNAVAILABLE_ASSIGNMENT_STATUSES = ['On Leave', 'Out of Office']
const PROJECT_PERSONNEL_FIELDS = [
  'projectOfficerIds',
  'projectCommitteeMemberIds',
  'projectOfficers',
  'projectCommitteeMembers',
  'project_officers',
  'project_committee_members',
]

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(`${String(value).split('T')[0]}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const computeProjectStatus = (row) => {
  if (['Postponed', 'Cancelled'].includes(row?.project_status)) return row.project_status
  const start = parseDate(row?.start_date)
  const end = parseDate(row?.end_date) || start
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!start) return 'Upcoming'
  if (end && end < today) return 'Completed'
  if (start > today) return 'Upcoming'
  return 'Active'
}

const toFrontend = (row, creatorActor = null) => {
  if (!row) return null
  return {
    id: row.project_id,
    title: row.event_name,
    tagline: row.event_tagline,
    description: row.description || '',
    category: row.category || '',
    activityMode: row.activity_mode,
    venue: row.venue,
    onlinePlatform: row.online_platform || '',
    onlineLink: row.online_link || '',
    dateStart: toDateStr(row.start_date),
    dateEnd: toDateStr(row.end_date),
    startTime: toTimeStr(row.start_time),
    endTime: toTimeStr(row.end_time),
    dueDate: toDateStr(row.due_date),
    logisticalRequirements: row.logistical_requirement,
    financialRequirements: row.financial_requirement,
    operationalRequirements: row.operational_requirement,
    targetParticipants: row.target_participants,
    partnerOrganizations: row.partner_organization,
    status: computeProjectStatus(row),
    statusOverride: ['Postponed', 'Cancelled'].includes(row.project_status) ? row.project_status : '',
    visibility: row.visibility,
    approvalStatus: row.approval_status,
    image: row.image || null,
    slug: row.slug || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdById: row.created_by_id || null,
    createdByName: creatorActor?.actorName || null,
    createdByRole: row.created_by_role || null,
    projectOfficers: Array.isArray(row.project_officers) ? row.project_officers : (row.project_officers ? [row.project_officers] : ['']),
    projectCommitteeMembers: Array.isArray(row.project_committee_members) ? row.project_committee_members : (row.project_committee_members ? [row.project_committee_members] : ['']),
    projectOfficerIds: row.projectOfficerIds || [],
    projectCommitteeMemberIds: row.projectCommitteeMemberIds || [],
  }
}

const toFrontendWithCreators = async (rows = []) => {
  const projectIds = rows.map((row) => row.project_id).filter(Boolean)
  const assignmentsByProject = {}
  if (projectIds.length > 0) {
    const { data: assignments, error } = await supabase
      .from('project_assignments')
      .select('project_id, staff_id, project_role')
      .in('project_id', projectIds)
      .eq('is_active', true)
    if (error) throw error
    for (const assignment of assignments || []) {
      if (!assignmentsByProject[assignment.project_id]) {
        assignmentsByProject[assignment.project_id] = {
          projectOfficerIds: [],
          projectCommitteeMemberIds: [],
        }
      }
      if (assignment.project_role === 'officer') {
        assignmentsByProject[assignment.project_id].projectOfficerIds.push(assignment.staff_id)
      } else if (assignment.project_role === 'committee_member') {
        assignmentsByProject[assignment.project_id].projectCommitteeMemberIds.push(assignment.staff_id)
      }
    }
  }
  const actorsById = await resolveActors(rows.map((row) => row.created_by_id))
  return rows.map((row) => toFrontend({
    ...row,
    ...(assignmentsByProject[row.project_id] || {}),
  }, actorsById[row.created_by_id]))
}

const toDbPayload = (payload) => {
  const isValidValue = (value) => value !== undefined && value !== null && value !== ''
  const entries = Object.entries({
    event_name: payload.title,
    event_tagline: payload.tagline,
    description: payload.description,
    category: payload.category,
    activity_mode: payload.activityMode,
    venue: payload.venue,
    online_platform: payload.onlinePlatform,
    online_link: payload.onlineLink,
    start_date: payload.dateStart,
    end_date: payload.dateEnd,
    start_time: payload.startTime,
    end_time: payload.endTime,
    due_date: payload.dueDate,
    logistical_requirement: payload.logisticalRequirements,
    financial_requirement: payload.financialRequirements,
    operational_requirement: payload.operationalRequirements,
    target_participants: payload.targetParticipants,
    partner_organization: payload.partnerOrganizations,
    project_status: Object.prototype.hasOwnProperty.call(payload, 'statusOverride')
      ? (payload.statusOverride || null)
      : (['Postponed', 'Cancelled'].includes(payload.status) ? payload.status : undefined),
    visibility: payload.visibility,
    approval_status: payload.approvalStatus,
    image: payload.image,
    project_officers: Array.isArray(payload.projectOfficers)
      ? payload.projectOfficers.filter(Boolean)
      : undefined,
    project_committee_members: Array.isArray(payload.projectCommitteeMembers)
      ? payload.projectCommitteeMembers.filter(Boolean)
      : undefined,
  })

  // Ensure only serializable/simple values are passed to the DB.
  // Skip `image` when it's a File/Object (frontend file uploads should be handled via storage).
  const filtered = entries.filter(([key, value]) => {
    if (key === 'image' && value && typeof value !== 'string') return false
    if (key === 'project_status' && value === null) return true
    // Arrays are valid even if empty
    if (Array.isArray(value)) return true
    return isValidValue(value)
  })

  return Object.fromEntries(filtered)
}

const sanitize = (payload) => {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([key, value]) =>
      ALLOWED_FIELDS.includes(key) && value !== undefined
    )
  )
}

const hasPersonnelPayload = (payload = {}) =>
  PROJECT_PERSONNEL_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(payload, field))

const getPersonnelNamesByRole = (payload = {}) => ({
  officer: Array.isArray(payload.projectOfficers)
    ? payload.projectOfficers
    : (Array.isArray(payload.project_officers) ? payload.project_officers : []),
  committee_member: Array.isArray(payload.projectCommitteeMembers)
    ? payload.projectCommitteeMembers
    : (Array.isArray(payload.project_committee_members) ? payload.project_committee_members : []),
})

const hasPersonnelIdPayload = (payload = {}) =>
  Object.prototype.hasOwnProperty.call(payload, 'projectOfficerIds') ||
  Object.prototype.hasOwnProperty.call(payload, 'projectCommitteeMemberIds')

const getPersonnelIdsByRole = (payload = {}) => ({
  officer: Array.isArray(payload.projectOfficerIds) ? payload.projectOfficerIds : [],
  committee_member: Array.isArray(payload.projectCommitteeMemberIds) ? payload.projectCommitteeMemberIds : [],
})

const staffFullName = (staff) =>
  `${staff.users?.first_name || ''} ${staff.users?.last_name || ''}`.trim()

const loadActiveStaff = async () => {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      staff_id,
      user_id,
      users (
        user_id,
        first_name,
        last_name,
        availability_status,
        is_active
      )
    `)

  if (error) throw error

  return (data || [])
    .filter((row) => row.users?.is_active !== false)
    .map((row) => ({
      staff_id: row.staff_id,
      user_id: row.user_id || row.users?.user_id,
      name: staffFullName(row),
      availability_status: row.users?.availability_status || 'Available',
    }))
    .filter((staff) => staff.staff_id && staff.name)
}

const formatPersonnelProblem = (name, reason) => `${name} (${reason})`

const rejectPersonnelProblems = ({ unmatched, ambiguous, unavailable }) => {
  const problems = [
    ...unmatched.map((name) => formatPersonnelProblem(name, 'unmatched')),
    ...ambiguous.map((item) => formatPersonnelProblem(
      item.inputName,
      `ambiguous: matched ${item.staff_ids.length} staff records`
    )),
    ...unavailable.map((item) => formatPersonnelProblem(item.name, item.status)),
  ]

  if (problems.length === 0) return

  const err = new Error(`Cannot assign the following personnel: ${problems.join(', ')}`)
  err.status = 400
  throw err
}

const resolveProjectPersonnel = async (payload = {}) => {
  if (!hasPersonnelPayload(payload)) return null

  const activeStaff = await loadActiveStaff()
  const staffById = new Map(activeStaff.map((staff) => [staff.staff_id, staff]))
  if (hasPersonnelIdPayload(payload)) {
    return resolveProjectPersonnelByIds(payload, staffById)
  }
  const namesByRole = getPersonnelNamesByRole(payload)
  const rowsByKey = new Map()
  const canonicalNames = {
    officer: [],
    committee_member: [],
  }
  const problems = {
    unmatched: [],
    ambiguous: [],
    unavailable: [],
  }

  for (const [role, names] of Object.entries(namesByRole)) {
    const result = matchNamesToStaff(names, activeStaff)
    problems.unmatched.push(...result.unmatched)
    problems.ambiguous.push(...result.ambiguous)

    for (const match of result.matched) {
      const staff = staffById.get(match.staff_id)
      if (!staff) continue
      if (UNAVAILABLE_ASSIGNMENT_STATUSES.includes(staff.availability_status)) {
        problems.unavailable.push({
          name: staff.name,
          status: staff.availability_status,
        })
        continue
      }

      const rowKey = `${staff.staff_id}:${role}`
      if (!rowsByKey.has(rowKey)) {
        rowsByKey.set(rowKey, {
          staff_id: staff.staff_id,
          project_role: role,
          is_active: true,
        })
        canonicalNames[role].push(staff.name)
      }
    }
  }

  rejectPersonnelProblems(problems)

  return {
    assignmentRows: [...rowsByKey.values()],
    project_officers: canonicalNames.officer,
    project_committee_members: canonicalNames.committee_member,
  }
}

const resolveProjectPersonnelByIds = (payload = {}, staffById = new Map()) => {
  const idsByRole = getPersonnelIdsByRole(payload)
  const rowsByKey = new Map()
  const canonicalNames = {
    officer: [],
    committee_member: [],
  }
  const invalid = []
  const unavailable = []

  for (const [role, ids] of Object.entries(idsByRole)) {
    const seenIds = new Set()
    for (const rawId of ids || []) {
      const staffId = Number(rawId)
      if (!Number.isInteger(staffId) || seenIds.has(staffId)) continue
      seenIds.add(staffId)

      const staff = staffById.get(staffId)
      if (!staff) {
        invalid.push(String(rawId))
        continue
      }
      if (UNAVAILABLE_ASSIGNMENT_STATUSES.includes(staff.availability_status)) {
        unavailable.push({
          name: staff.name,
          status: staff.availability_status,
        })
        continue
      }

      const rowKey = `${staff.staff_id}:${role}`
      if (!rowsByKey.has(rowKey)) {
        rowsByKey.set(rowKey, {
          staff_id: staff.staff_id,
          project_role: role,
          is_active: true,
        })
        canonicalNames[role].push(staff.name)
      }
    }
  }

  rejectPersonnelProblems({
    unmatched: invalid.map((id) => `staff_id ${id}`),
    ambiguous: [],
    unavailable,
  })

  return {
    assignmentRows: [...rowsByKey.values()],
    project_officers: canonicalNames.officer,
    project_committee_members: canonicalNames.committee_member,
  }
}

const applyResolvedPersonnelToPayload = (payload, resolvedPersonnel) => {
  if (!resolvedPersonnel) return payload
  return {
    ...payload,
    projectOfficers: resolvedPersonnel.project_officers,
    projectCommitteeMembers: resolvedPersonnel.project_committee_members,
    project_officers: resolvedPersonnel.project_officers,
    project_committee_members: resolvedPersonnel.project_committee_members,
  }
}

const syncProjectAssignments = async (projectId, resolvedPersonnel, assignedBy) => {
  if (!resolvedPersonnel) return

  const now = new Date().toISOString()
  const { error: deactivateError } = await supabase
    .from('project_assignments')
    .update({ is_active: false, updated_at: now })
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (deactivateError) throw deactivateError

  if (resolvedPersonnel.assignmentRows.length === 0) return

  const assignmentBatchId = randomUUID()
  const rows = resolvedPersonnel.assignmentRows.map((row) => ({
    project_id: projectId,
    staff_id: row.staff_id,
    project_role: row.project_role,
    is_active: true,
    assigned_by: assignedBy || null,
    assignment_batch_id: assignmentBatchId,
  }))

  const { error } = await supabase
    .from('project_assignments')
    .insert(rows)
    .select('assignment_id')

  if (error) throw error
}

const getAll = async (filters = {}) => {
  let query = supabase.from('projects').select('*')

  if (filters.search) {
    const q = `%${filters.search}%`
    query = query.or(`event_name.ilike.${q},event_tagline.ilike.${q}`)
  }

  if (filters.visibility) {
    query = query.eq('visibility', filters.visibility)
  }

  if (filters.approval_status) {
    query = query.eq('approval_status', filters.approval_status)
  }

  if (filters.start_date) {
    query = query.gte('start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.lte('end_date', filters.end_date)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  const rows = await toFrontendWithCreators(data || [])
  if (filters.status) {
    const target = String(filters.status).trim().toLowerCase()
    return rows.filter((project) => String(project.status || '').toLowerCase() === target)
  }
  return rows
}

const getById = async (projectId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw error
  const rows = await toFrontendWithCreators(data ? [data] : [])
  return rows[0] || null
}

const create = async (payload) => {
  const resolvedPersonnel = await resolveProjectPersonnel(payload)
  const dataToInsert = toDbPayload(applyResolvedPersonnelToPayload(payload, resolvedPersonnel))
  if (payload?.createdById !== undefined) dataToInsert.created_by_id = payload.createdById
  if (payload?.createdByRole !== undefined) dataToInsert.created_by_role = payload.createdByRole
  if (!dataToInsert || Object.keys(dataToInsert).length === 0) {
    const err = new Error('No valid project fields provided to insert')
    err.status = 400
    throw err
  }
  const { data, error } = await supabase
    .from('projects')
    .insert([dataToInsert])
    .select()

  if (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
  const project = data?.[0] || null
  if (project?.project_id) {
    try {
      await syncProjectAssignments(project.project_id, resolvedPersonnel, payload?.createdById)
    } catch (syncError) {
      console.error('Project assignment sync failed after project create:', {
        project_id: project.project_id,
        error: syncError,
      })
      const err = new Error('Project was saved, but project personnel assignments failed to sync. Please retry or contact support.')
      err.status = 500
      throw err
    }
  }
  const rows = await toFrontendWithCreators(data || [])
  return rows[0] || null
}

const updateById = async (projectId, payload) => {
  const resolvedPersonnel = await resolveProjectPersonnel(payload)
  const dataToUpdate = toDbPayload(applyResolvedPersonnelToPayload(payload, resolvedPersonnel))
  const { data, error } = await supabase
    .from('projects')
    .update(dataToUpdate)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  try {
    await syncProjectAssignments(projectId, resolvedPersonnel, payload?.updatedById || payload?.createdById)
  } catch (syncError) {
    console.error('Project assignment sync failed after project update:', {
      project_id: projectId,
      error: syncError,
    })
    const err = new Error('Project was saved, but project personnel assignments failed to sync. Please retry or contact support.')
    err.status = 500
    throw err
  }
  const rows = await toFrontendWithCreators(data ? [data] : [])
  return rows[0] || null
}

const deleteById = async (projectId) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('project_id', projectId)

  if (error) throw error
  return true
}

const deleteMany = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .in('project_id', ids)

  if (error) throw error
  return data || []
}

module.exports = {
  getAll,
  getById,
  create,
  updateById,
  deleteById,
  deleteMany,
  resolveProjectPersonnel,
}
