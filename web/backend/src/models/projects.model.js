const supabase = require('../config/supabase')

const ALLOWED_FIELDS = [
  'event_name',
  'event_tagline',
  'activity_mode',
  'venue',
  'start_date',
  'end_date',
  'due_date',
  'logistical_requirement',
  'financial_requirement',
  'operational_requirement',
  'target_participants',
  'partner_organization',
  'project_status',
]

const toFrontend = (row) => {
  if (!row) return null
  return {
    id: row.project_id,
    title: row.event_name,
    tagline: row.event_tagline,
    activityMode: row.activity_mode,
    venue: row.venue,
    dateStart: row.start_date,
    dateEnd: row.end_date,
    dueDate: row.due_date,
    logisticalRequirements: row.logistical_requirement,
    financialRequirements: row.financial_requirement,
    operationalRequirements: row.operational_requirement,
    targetParticipants: row.target_participants,
    partnerOrganizations: row.partner_organization,
    status: row.project_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const toDbPayload = (payload) => {
  const isValidValue = (value) => value !== undefined && value !== null && value !== ''
  return Object.fromEntries(
    Object.entries({
      event_name: payload.title,
      event_tagline: payload.tagline,
      activity_mode: payload.activityMode,
      venue: payload.venue,
      start_date: payload.dateStart,
      end_date: payload.dateEnd,
      due_date: payload.dueDate,
      logistical_requirement: payload.logisticalRequirements,
      financial_requirement: payload.financialRequirements,
      operational_requirement: payload.operationalRequirements,
      target_participants: payload.targetParticipants,
      partner_organization: payload.partnerOrganizations,
      project_status: payload.status,
    }).filter(([_, value]) => isValidValue(value))
  )
}

const sanitize = (payload) => {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([key, value]) =>
      ALLOWED_FIELDS.includes(key) && value !== undefined
    )
  )
}

const getAll = async (filters = {}) => {
  let query = supabase.from('projects').select('*')

  if (filters.status) {
    query = query.eq('project_status', filters.status)
  }

  if (filters.search) {
    const q = `%${filters.search}%`
    query = query.or(`event_name.ilike.${q},event_tagline.ilike.${q}`)
  }

  if (filters.start_date) {
    query = query.gte('start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.lte('end_date', filters.end_date)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(toFrontend)
}

const getById = async (projectId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw error
  return toFrontend(data)
}

const create = async (payload) => {
  const dataToInsert = toDbPayload(payload)
  const { data, error } = await supabase
    .from('projects')
    .insert([dataToInsert])
    .select()

  if (error) throw error
  return toFrontend(data?.[0])
}

const updateById = async (projectId, payload) => {
  const dataToUpdate = toDbPayload(payload)
  const { data, error } = await supabase
    .from('projects')
    .update(dataToUpdate)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return toFrontend(data)
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
  if (!Array.isArray(ids) || ids.length === 0) return { count: 0 }
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .in('project_id', ids)

  if (error) throw error
  return data
}

module.exports = {
  getAll,
  getById,
  create,
  updateById,
  deleteById,
  deleteMany,
}
