const supabase = require('../config/supabase')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value) {
  return UUID_PATTERN.test(String(value || '').trim())
}

function getResolvedCaseReportId(req) {
  return req.resolvedCaseReportId || req.caseReportId || req.params?.caseReportId || req.params?.caseId || req.params?.id
}

async function getCaseByPublicId(publicId) {
  if (!isUuid(publicId)) return null

  const { data, error } = await supabase
    .from('case_reports')
    .select('case_report_id, public_id, complainant_id')
    .eq('public_id', String(publicId).trim())
    .maybeSingle()

  if (error) throw error
  return data || null
}

function attachResolvedCase(req, report) {
  req.resolvedCaseReportId = report.case_report_id
  req.caseReportId = report.case_report_id
  req.casePublicId = report.public_id
  req.caseReport = report
}

function resolveCaseParam(paramName) {
  return async (req, res, next) => {
    try {
      const report = await getCaseByPublicId(req.params[paramName])
      if (!report) return res.status(404).json({ error: 'Case not found.' })

      attachResolvedCase(req, report)
      req.params[paramName] = String(report.case_report_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveCaseQuery(queryName) {
  return async (req, res, next) => {
    try {
      const raw = req.query?.[queryName]
      if (!raw) return next()

      const report = await getCaseByPublicId(raw)
      if (!report) return res.status(404).json({ error: 'Case not found.' })

      attachResolvedCase(req, report)
      req.query[queryName] = String(report.case_report_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveCaseQueryArray(queryName) {
  return async (req, res, next) => {
    try {
      const raw = req.query?.[queryName]
      if (!raw) return next()

      const values = Array.isArray(raw) ? raw : String(raw).split(',')
      const cleanValues = values.map((value) => String(value || '').trim()).filter(Boolean)
      if (cleanValues.length === 0) return next()

      const reports = await Promise.all(cleanValues.map((value) => getCaseByPublicId(value)))
      if (reports.some((report) => !report)) {
        return res.status(404).json({ error: 'Case not found.' })
      }

      req.query[queryName] = reports.map((report) => report.case_report_id).join(',')
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveCaseBody(bodyName) {
  return async (req, res, next) => {
    try {
      const raw = req.body?.[bodyName]
      if (!raw) return next()

      const report = await getCaseByPublicId(raw)
      if (!report) return res.status(404).json({ error: 'Case not found.' })

      attachResolvedCase(req, report)
      req.body[bodyName] = report.case_report_id
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function resolveCaseBodyArray(bodyName) {
  return async (req, res, next) => {
    try {
      const values = req.body?.[bodyName]
      if (!Array.isArray(values) || values.length === 0) return next()

      const reports = await Promise.all(values.map((value) => getCaseByPublicId(value)))
      if (reports.some((report) => !report)) {
        return res.status(404).json({ error: 'Case not found.' })
      }

      req.body[bodyName] = reports.map((report) => report.case_report_id)
      return next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

async function getPublicIdByCaseReportId(caseReportId) {
  if (!caseReportId) return null
  const { data, error } = await supabase
    .from('case_reports')
    .select('public_id')
    .eq('case_report_id', caseReportId)
    .maybeSingle()
  if (error) throw error
  return data?.public_id || null
}

function exposeCasePublicId(row) {
  if (!row || typeof row !== 'object') return row
  if (!row.public_id) return row

  const copy = { ...row, case_report_id: row.public_id, id: row.public_id }
  delete copy.public_id
  return copy
}

function exposeCasePublicIds(payload) {
  if (Array.isArray(payload)) return payload.map(exposeCasePublicIds)
  if (!payload || typeof payload !== 'object') return payload

  const shaped = exposeCasePublicId(payload)
  for (const [key, value] of Object.entries(shaped)) {
    shaped[key] = exposeCasePublicIds(value)
  }
  return shaped
}

module.exports = {
  exposeCasePublicIds,
  getPublicIdByCaseReportId,
  getResolvedCaseReportId,
  isUuid,
  resolveCaseBody,
  resolveCaseBodyArray,
  resolveCaseParam,
  resolveCaseQuery,
  resolveCaseQueryArray,
}
