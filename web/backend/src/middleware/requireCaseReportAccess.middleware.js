const supabase = require('../config/supabase')
const { getResolvedCaseReportId } = require('../utils/casePublicIds')

const getCaseReportId = (req) =>
  getResolvedCaseReportId(req) ||
  req.params.caseReportId ||
  req.params.caseId ||
  req.params.id ||
  req.body?.case_report_id ||
  req.body?.case_id ||
  req.query?.caseReportId ||
  req.query?.caseId

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/_/g, ' ')
}

async function getCaseOfficerIdForUser(userId) {
  const { data, error } = await supabase
    .from('case_officers')
    .select('case_officer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.case_officer_id || null
}

async function getLegalPersonnelIdForUser(userId) {
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.legal_personnel_id || null
}

async function isAssignedCaseOfficer(caseReportId, userId) {
  const caseOfficerId = await getCaseOfficerIdForUser(userId)
  if (!caseOfficerId) return false

  const { data, error } = await supabase
    .from('case_assignments')
    .select('assignment_id')
    .eq('case_report_id', caseReportId)
    .eq('case_officer_id', caseOfficerId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

async function isAssignedLegalPersonnel(caseReportId, userId) {
  const legalPersonnelId = await getLegalPersonnelIdForUser(userId)
  if (!legalPersonnelId) return false

  const { data, error } = await supabase
    .from('legal_case_assignments')
    .select('legal_case_assignment_id')
    .eq('case_report_id', caseReportId)
    .eq('legal_personnel_id', legalPersonnelId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

async function isCaseOwner(report, userId) {
  const { data: complainant, error: complainantError } = await supabase
    .from('complainants')
    .select('user_id')
    .eq('complainant_id', report.complainant_id)
    .maybeSingle()

  if (complainantError || !complainant) return false
  return String(complainant.user_id) === String(userId)
}

async function canAccessCaseReport({ caseReportId, user }) {
  if (!user) return { allowed: false, status: 401, error: 'Unauthorized' }
  if (!caseReportId) return { allowed: false, status: 400, error: 'Case report id is required.' }

  const { data: report, error: reportError } = await supabase
    .from('case_reports')
    .select('case_report_id, complainant_id')
    .eq('case_report_id', caseReportId)
    .maybeSingle()

  if (reportError || !report) return { allowed: false, status: 404, error: 'Case not found.' }

  const role = normalizeRole(user.role || user.role_name)
  const userId = user.id || user.user_id

  if (role === 'admin') return { allowed: true, report }
  if (role === 'staff') return { allowed: false, status: 403, error: 'Forbidden' }
  if (role === 'case officer') {
    const allowed = await isAssignedCaseOfficer(caseReportId, userId)
    return allowed ? { allowed: true, report } : { allowed: false, status: 403, error: 'Forbidden' }
  }
  if (role === 'legal personnel') {
    const allowed = await isAssignedLegalPersonnel(caseReportId, userId)
    return allowed ? { allowed: true, report } : { allowed: false, status: 403, error: 'Forbidden' }
  }

  const allowed = await isCaseOwner(report, userId)
  return allowed ? { allowed: true, report } : { allowed: false, status: 403, error: 'Forbidden' }
}

const requireCaseReportAccess = async (req, res, next) => {
  try {
    const caseReportId = getCaseReportId(req)
    const access = await canAccessCaseReport({ caseReportId, user: req.user })
    if (!access.allowed) return res.status(access.status).json({ error: access.error })

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

requireCaseReportAccess.canAccessCaseReport = canAccessCaseReport
requireCaseReportAccess.getCaseReportId = getCaseReportId
requireCaseReportAccess.getCaseOfficerIdForUser = getCaseOfficerIdForUser
requireCaseReportAccess.getLegalPersonnelIdForUser = getLegalPersonnelIdForUser
requireCaseReportAccess.normalizeRole = normalizeRole

module.exports = requireCaseReportAccess
