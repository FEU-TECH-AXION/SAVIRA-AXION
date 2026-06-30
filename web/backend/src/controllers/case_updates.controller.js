const caseStatusHistoryModel = require('../models/case_status_history.model')
const caseReportLogsModel = require('../models/case_report_logs.model')
const legalReviewsModel = require('../models/legal_reviews.model')

async function getPublicUpdates(req, res) {
  try {
    const caseReportId = req.params.id
    const [statusHistory, caseLogs, legalLogs] = await Promise.all([
      caseStatusHistoryModel.getByCaseReport(caseReportId, { staffView: false }),
      caseReportLogsModel.getPublicByCaseReport(caseReportId),
      legalReviewsModel.getPublicLogsByCase(caseReportId),
    ])

    const normalized = [
      ...statusHistory.map((h) => ({
        id: `status-${h.history_id}`,
        type: 'status',
        date: h.created_at,
        title: h.case_status?.case_status_name,
        description: null,
      })),
      ...caseLogs.map((l) => ({
        id: `case-${l.case_report_log_id}`,
        type: 'case_management',
        date: l.performed_at,
        title: actionTypeLabel(l.action_type),
        description: l.public_message,
      })),
      ...legalLogs.map((l) => ({
        id: `legal-${l.legal_review_log_id}`,
        type: 'legal_review',
        date: l.performed_at,
        title: actionTypeLabel(l.action_type),
        description: l.public_message,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    return res.json({ data: normalized })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function actionTypeLabel(actionType) {
  const labels = {
    endorsement_saved: 'Case Endorsed',
    referral_endorsed: 'Case Referred',
    monitoring_update_added: 'Monitoring Update',
    paralegal_record_saved: 'Legal Support Update',
    lawyer_consultation_saved: 'Lawyer Consultation',
  }
  return labels[actionType] || 'Case Update'
}

module.exports = { getPublicUpdates }
