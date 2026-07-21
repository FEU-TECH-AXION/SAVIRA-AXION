const supabase = require('../config/supabase')
const { isUuid } = require('./casePublicIds')

function getResolvedVolunteerApplicationId(req) {
  return (
    req.resolvedVolunteerApplicationId ||
    req.volunteerApplicationId ||
    req.params?.volunteerApplicationId ||
    req.params?.applicationId ||
    req.params?.id ||
    req.body?.volunteer_application_id ||
    req.body?.application_id ||
    req.query?.volunteer_application_id ||
    req.query?.application_id
  )
}

async function getVolunteerApplicationByPublicId(publicId) {
  if (!isUuid(publicId)) return null

  const { data, error } = await supabase
    .from('volunteer_applications')
    .select('volunteer_application_id, public_id, volunteer_applicant_id, email')
    .eq('public_id', String(publicId).trim())
    .maybeSingle()

  if (error) throw error
  return data || null
}

function attachResolvedVolunteerApplication(req, application) {
  req.resolvedVolunteerApplicationId = application.volunteer_application_id
  req.volunteerApplicationId = application.volunteer_application_id
  req.volunteerApplicationPublicId = application.public_id
  req.volunteerApplication = application
}

function resolveVolunteerApplicationParam(paramName) {
  return async (req, res, next) => {
    try {
      const application = await getVolunteerApplicationByPublicId(req.params[paramName])
      if (!application) return res.status(404).json({ error: 'Application not found.' })

      attachResolvedVolunteerApplication(req, application)
      req.params[paramName] = String(application.volunteer_application_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveVolunteerApplicationQuery(queryName) {
  return async (req, res, next) => {
    try {
      const raw = req.query?.[queryName]
      if (!raw) return next()

      const application = await getVolunteerApplicationByPublicId(raw)
      if (!application) return res.status(404).json({ error: 'Application not found.' })

      attachResolvedVolunteerApplication(req, application)
      req.query[queryName] = String(application.volunteer_application_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveVolunteerApplicationBody(bodyName) {
  return async (req, res, next) => {
    try {
      const raw = req.body?.[bodyName]
      if (!raw) return next()

      const application = await getVolunteerApplicationByPublicId(raw)
      if (!application) return res.status(404).json({ error: 'Application not found.' })

      attachResolvedVolunteerApplication(req, application)
      req.body[bodyName] = application.volunteer_application_id
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveVolunteerApplicationBodyArray(bodyName) {
  return async (req, res, next) => {
    try {
      const values = req.body?.[bodyName]
      if (!Array.isArray(values) || values.length === 0) return next()

      const applications = await Promise.all(values.map((value) => getVolunteerApplicationByPublicId(value)))
      if (applications.some((application) => !application)) {
        return res.status(404).json({ error: 'Application not found.' })
      }

      req.body[bodyName] = applications.map((application) => application.volunteer_application_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function publicVolunteerApplicationRef(publicId) {
  if (!publicId) return 'APP'
  return `APP-${String(publicId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function exposeVolunteerApplicationPublicId(row) {
  if (!row || typeof row !== 'object') return row
  if (!row.public_id) return row

  const copy = {
    ...row,
    volunteer_application_id: row.public_id,
    application_id: row.public_id,
    id: row.public_id,
    application_ref: publicVolunteerApplicationRef(row.public_id),
  }
  delete copy.public_id
  return copy
}

function exposeVolunteerApplicationPublicIds(payload) {
  if (Array.isArray(payload)) return payload.map(exposeVolunteerApplicationPublicIds)
  if (!payload || typeof payload !== 'object') return payload

  const shaped = exposeVolunteerApplicationPublicId(payload)
  for (const [key, value] of Object.entries(shaped)) {
    shaped[key] = exposeVolunteerApplicationPublicIds(value)
  }
  return shaped
}

function replaceVolunteerApplicationId(payload, publicId) {
  if (Array.isArray(payload)) return payload.map((item) => replaceVolunteerApplicationId(item, publicId))
  if (!payload || typeof payload !== 'object') return payload

  const shaped = { ...payload }
  if (Object.prototype.hasOwnProperty.call(shaped, 'volunteer_application_id')) {
    shaped.volunteer_application_id = publicId || ''
  }
  if (Object.prototype.hasOwnProperty.call(shaped, 'application_id')) {
    shaped.application_id = publicId || ''
  }

  for (const [key, value] of Object.entries(shaped)) {
    shaped[key] = replaceVolunteerApplicationId(value, publicId)
  }
  return shaped
}

async function getPublicIdByVolunteerApplicationId(applicationId) {
  if (!applicationId) return null
  const { data, error } = await supabase
    .from('volunteer_applications')
    .select('public_id')
    .eq('volunteer_application_id', applicationId)
    .maybeSingle()
  if (error) throw error
  return data?.public_id || null
}

async function replaceVolunteerApplicationIdsFromDatabase(payload) {
  const rows = Array.isArray(payload) ? payload : [payload]
  const ids = [...new Set(rows.map((row) => row?.volunteer_application_id || row?.application_id).filter(Boolean))]
  if (ids.length === 0) return payload

  const { data, error } = await supabase
    .from('volunteer_applications')
    .select('volunteer_application_id, public_id')
    .in('volunteer_application_id', ids)
  if (error) throw error

  const publicIdsByInternalId = Object.fromEntries(
    (data || []).map((row) => [row.volunteer_application_id, row.public_id])
  )
  const shaped = rows.map((row) =>
    replaceVolunteerApplicationId(row, publicIdsByInternalId[row?.volunteer_application_id || row?.application_id])
  )
  return Array.isArray(payload) ? shaped : shaped[0]
}

module.exports = {
  exposeVolunteerApplicationPublicIds,
  getPublicIdByVolunteerApplicationId,
  getResolvedVolunteerApplicationId,
  publicVolunteerApplicationRef,
  replaceVolunteerApplicationId,
  replaceVolunteerApplicationIdsFromDatabase,
  resolveVolunteerApplicationBody,
  resolveVolunteerApplicationBodyArray,
  resolveVolunteerApplicationParam,
  resolveVolunteerApplicationQuery,
}
