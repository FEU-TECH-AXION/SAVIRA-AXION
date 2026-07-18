const supabase = require('../config/supabase')
const { resolveActors } = require('../utils/actor')

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
const normalizeName = (value) => String(value || '').trim().toLowerCase()
const UNAVAILABLE_ASSIGNMENT_STATUSES = ['On Leave', 'Out of Office']

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
  }
}

const toFrontendWithCreators = async (rows = []) => {
  const actorsById = await resolveActors(rows.map((row) => row.created_by_id))
  return rows.map((row) => toFrontend(row, actorsById[row.created_by_id]))
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

const getProjectAssignmentNames = (payload = {}) => {
  const values = [
    ...(Array.isArray(payload.projectOfficers) ? payload.projectOfficers : []),
    ...(Array.isArray(payload.projectCommitteeMembers) ? payload.projectCommitteeMembers : []),
    ...(Array.isArray(payload.project_officers) ? payload.project_officers : []),
    ...(Array.isArray(payload.project_committee_members) ? payload.project_committee_members : []),
  ]

  const namesByKey = new Map()
  for (const value of values) {
    const name = String(value || '').trim()
    const key = normalizeName(name)
    if (key && !namesByKey.has(key)) namesByKey.set(key, name)
  }
  return [...namesByKey.values()]
}

const validateProjectPersonnelAvailability = async (payload = {}) => {
  const submittedNames = getProjectAssignmentNames(payload)
  if (submittedNames.length === 0) return

  const submittedNamesByKey = new Map(submittedNames.map((name) => [normalizeName(name), name]))
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      first_name,
      last_name,
      availability_status,
      is_active,
      roles (role_name)
    `)
    .eq('is_active', true)
    .in('availability_status', UNAVAILABLE_ASSIGNMENT_STATUSES)

  if (error) throw error

  const unavailable = []
  for (const user of users || []) {
    if (!['Staff', 'Case Officer', 'Legal Personnel'].includes(user.roles?.role_name)) continue
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    const submittedName = submittedNamesByKey.get(normalizeName(fullName))
    if (submittedName) {
      unavailable.push(`${submittedName} (${user.availability_status})`)
    }
  }

  if (unavailable.length > 0) {
    const err = new Error(
      `Cannot assign the following personnel - they are currently unavailable: ${unavailable.join(', ')}`
    )
    err.status = 400
    throw err
  }
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
  await validateProjectPersonnelAvailability(payload)
  const dataToInsert = toDbPayload(payload)
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
  const rows = await toFrontendWithCreators(data || [])
  return rows[0] || null
}

const updateById = async (projectId, payload) => {
  await validateProjectPersonnelAvailability(payload)
  const dataToUpdate = toDbPayload(payload)
  const { data, error } = await supabase
    .from('projects')
    .update(dataToUpdate)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
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
  validateProjectPersonnelAvailability,
}
