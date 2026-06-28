const supabase = require('../config/supabase')

const STAFF_CASE_ROLES = new Set(['Admin', 'Case Officer', 'Legal Personnel'])

const getCaseReportId = (req) =>
  req.params.caseReportId || req.params.caseId || req.params.id || req.body?.case_report_id

const requireCaseReportAccess = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    if (STAFF_CASE_ROLES.has(req.user.role)) return next()

    const caseReportId = getCaseReportId(req)
    if (!caseReportId) return res.status(400).json({ error: 'Case report id is required.' })

    const { data: report, error: reportError } = await supabase
      .from('case_reports')
      .select('case_report_id, complainant_id')
      .eq('case_report_id', caseReportId)
      .maybeSingle()

    if (reportError || !report) return res.status(404).json({ error: 'Case not found.' })

    const { data: complainant, error: complainantError } = await supabase
      .from('complainants')
      .select('user_id')
      .eq('complainant_id', report.complainant_id)
      .maybeSingle()

    if (complainantError || !complainant) return res.status(404).json({ error: 'Case not found.' })

    const ownerId = complainant.user_id
    if (String(ownerId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = requireCaseReportAccess
