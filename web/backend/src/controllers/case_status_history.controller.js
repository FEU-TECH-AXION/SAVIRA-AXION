const CaseStatusHistory = require('../models/case_status_history.model')
const CaseAssessments   = require('../models/case_assessments.model')
const supabase          = require('../config/supabase')

const getHistory = async (req, res) => {
  try {
    const { caseReportId } = req.params
    const staffView = req.query.staffView === 'true'
    const data = await CaseStatusHistory.getByCaseReport(caseReportId, { staffView })

    const shaped = data.map((h) => ({
      historyId:       h.history_id,
      displayId:       h.display_id,
      status:          h.case_status?.case_status_name,
      date:            new Date(h.approved_at || h.created_at).toLocaleDateString('en-PH'),
      by:              h.changed_by_role,
      notes:           h.notes,
      approvalStatus:  h.approval_status,
      rejectionReason: h.rejection_reason,
    }))

    res.json({ data: shaped })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const submitStatusChange = async (req, res) => {
  try {
    const {
      case_report_id,
      proposed_status,
      changed_by_id,
      changed_by_role,
      notes,
      form_data,
      assessment_type,
      findings,
      recommendation,
    } = req.body

    // Validate required fields
    // if (!case_report_id || !proposed_status || !changed_by_id || !changed_by_role) {
    //   return res.status(400).json({
    //     error: 'case_report_id, proposed_status, changed_by_id, and changed_by_role are required.'
    //   })
    // }

    // Look up numeric status ID
    const caseStatusId = CaseStatusHistory.STATUS_ID_MAP[proposed_status]
    if (!caseStatusId) {
      return res.status(400).json({ error: `Unknown status: ${proposed_status}` })
    }

    // Step 1 — Insert history row as immediately approved
    const historyRow = await CaseStatusHistory.create({
      caseReportId:   case_report_id,
      caseStatusId,
      changedById:    changed_by_id,
      changedByRole:  changed_by_role,
      notes,
      formData:       form_data,
      approvalStatus: 'approved',
      approvedAt:     new Date().toISOString(),
      approvedById:   changed_by_id,
    })

    // Step 2 — Update case_reports.case_status_id immediately
    const { error: caseErr } = await supabase
      .from('case_reports')
      .update({ case_status_id: caseStatusId })
      .eq('case_report_id', case_report_id)
    if (caseErr) throw caseErr

    // Step 3 — Insert assessment row as approved
    const assessment = await CaseAssessments.create({
      case_report_id,
      case_officer_id:    changed_by_id,
      legal_personnel_id: changed_by_role === 'legal_personnel' ? changed_by_id : null,
      status_history_id:  historyRow.history_id,
      assessment_type:    assessment_type || proposed_status,
      assessment_stage:   proposed_status,
      assessment_status:  'approved',
      findings:           findings || notes,
      recommendation:     recommendation || null,
      changed_by_id,
      changed_by_role,
    })

    res.status(201).json({
      message:          'Status updated successfully.',
      historyRow,
      assessment,
      requiresApproval: false,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const approveStatusChange = async (req, res) => {
  try {
    const { historyId } = req.params
    const { approved_by_id } = req.body
    if (!approved_by_id) {
      return res.status(400).json({ error: 'approved_by_id is required.' })
    }
    const historyRow = await CaseStatusHistory.approve(Number(historyId), approved_by_id)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'approved')
    res.json({ message: 'Status change approved and case updated.', historyRow })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const rejectStatusChange = async (req, res) => {
  try {
    const { historyId } = req.params
    const { approved_by_id, rejection_reason } = req.body
    if (!approved_by_id || !rejection_reason) {
      return res.status(400).json({ error: 'approved_by_id and rejection_reason are required.' })
    }
    const historyRow = await CaseStatusHistory.reject(Number(historyId), approved_by_id, rejection_reason)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'rejected')
    res.json({ message: 'Status change rejected.', historyRow })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getHistory, submitStatusChange, approveStatusChange, rejectStatusChange }