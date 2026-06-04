const CaseStatusHistory = require('../models/case_status_history.model')
const CaseAssessments   = require('../models/case_assessments.model')

// GET /api/case_status_history/:caseReportId
// Returns the full status timeline for a case.
// staffView=true is passed as a query param by staff — complainants
// only ever see approved entries
const getHistory = async (req, res) => {
  try {
    const { caseReportId } = req.params
    const staffView = req.query.staffView === 'true'
    const data = await CaseStatusHistory.getByCaseReport(caseReportId, { staffView })

    // Shape each row to match what StatusHistorySection expects:
    // { status, date, by, notes }
    const shaped = data.map((h) => ({
      historyId:      h.history_id,
      displayId:      h.display_id,
      status:         h.case_status?.case_status_name,
      date:           new Date(h.approved_at || h.created_at).toLocaleDateString('en-PH'),
      by:             h.changed_by_role,
      notes:          h.notes,
      approvalStatus: h.approval_status,
      rejectionReason: h.rejection_reason,
    }))

    res.json({ data: shaped })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/case_status_history
// Called by submitForApproval() in the frontend.
// Creates BOTH the history row and the assessment row in one request
// so the frontend only needs one API call per modal submission.
const submitStatusChange = async (req, res) => {
  try {
    const {
      case_report_id,
      proposed_status,     // string e.g. "Undergoing Review"
      changed_by_id,
      changed_by_role,
      notes,
      form_data,           // full modal form dump (JSONB)
      // assessment-specific fields from the modal
      assessment_type,
      findings,
      recommendation,
    } = req.body

    // Block if there's already a pending approval for this case
    const existing = await CaseStatusHistory.getPending(case_report_id)
    if (existing) {
      return res.status(409).json({
        error: 'This case already has a pending status change awaiting admin approval.'
      })
    }

    // Look up the numeric status ID from the status name string
    const caseStatusId = CaseStatusHistory.STATUS_ID_MAP[proposed_status]
    if (!caseStatusId) {
      return res.status(400).json({ error: `Unknown status: ${proposed_status}` })
    }

    // 1. Insert the history row (approval_status = 'pending' by default)
    const historyRow = await CaseStatusHistory.create({
      caseReportId:  case_report_id,
      caseStatusId,
      changedById:   changed_by_id,
      changedByRole: changed_by_role,
      notes,
      formData:      form_data,
    })

    // 2. Insert the linked assessment row
    const assessment = await CaseAssessments.create({
      case_report_id,
      case_officer_id:    changed_by_role === 'case_officer' ? changed_by_id : null,
      legal_personnel_id: changed_by_role === 'legal_personnel' ? changed_by_id : null,
      status_history_id:  historyRow.history_id,
      assessment_type:    assessment_type || proposed_status,
      assessment_stage:   proposed_status,
      assessment_status:  'pending',
      findings:           findings || notes,
      recommendation,
      form_data,

      changed_by_id:   changed_by_id,
      changed_by_role: changed_by_role,   // 'admin' | 'case_officer' | 'legal_personnel'
    })

    res.status(201).json({
      message:    'Status change submitted for admin approval.',
      historyRow,
      assessment,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/case_status_history/:historyId/approve
// Admin approves — updates history row, updates case_reports.case_status_id,
// and marks the linked assessment as approved
const approveStatusChange = async (req, res) => {
  try {
    const { historyId } = req.params
    const { approved_by_id } = req.body

    if (!approved_by_id) {
      return res.status(400).json({ error: 'approved_by_id is required.' })
    }

    const historyRow = await CaseStatusHistory.approve(Number(historyId), approved_by_id)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'approved')

    res.json({
      message: 'Status change approved and case updated.',
      historyRow,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/case_status_history/:historyId/reject
// Admin rejects — history row is marked rejected, assessment stays pending
// until admin decides otherwise, case_reports is NOT updated
const rejectStatusChange = async (req, res) => {
  try {
    const { historyId } = req.params
    const { approved_by_id, rejection_reason } = req.body

    if (!approved_by_id || !rejection_reason) {
      return res.status(400).json({ error: 'approved_by_id and rejection_reason are required.' })
    }

    const historyRow = await CaseStatusHistory.reject(Number(historyId), approved_by_id, rejection_reason)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'rejected')

    res.json({
      message: 'Status change rejected.',
      historyRow,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getHistory, submitStatusChange, approveStatusChange, rejectStatusChange }