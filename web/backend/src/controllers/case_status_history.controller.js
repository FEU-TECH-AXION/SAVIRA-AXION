const CaseStatusHistory = require('../models/case_status_history.model')
const CaseAssessments   = require('../models/case_assessments.model')
const supabase          = require('../config/supabase')
const {
  fireAndForget,
  notifyCaseOwner,
  notifyRoleUsers,
} = require('../services/notificationService')

function getStatusNameById(statusId) {
  return Object.entries(CaseStatusHistory.STATUS_ID_MAP)
    .find(([, id]) => Number(id) === Number(statusId))?.[0] || 'updated';
}

const TRANSITION_RULES = {
  'Submitted': {
    'case officer': ['For Verification'],
    admin: ['For Verification'],
  },
  'For Verification': {
    'case officer': ['Undergoing Review'],
    admin: ['Undergoing Review'],
  },
  'Undergoing Review': {
    'case officer': ['Verified - True', 'Verified - False'],
    admin: ['Verified - True', 'Verified - False'],
  },
  'Verified - True': {
    'case officer': ['Under Case Evaluation'],
    'legal personnel': ['Under Case Evaluation'],
    admin: ['Under Case Evaluation'],
  },
  'Verified - False': {
    'case officer': [],
    admin: [],
  },
  'Under Case Evaluation': {
    'legal personnel': ['Case Filed', 'Dismissed'],
    admin: ['Case Filed', 'Dismissed'],
  },
  'Case Filed': {
    'legal personnel': ['Investigation Ongoing'],
    admin: ['Investigation Ongoing'],
  },
  'Investigation Ongoing': {
    'legal personnel': ['Hearing Ongoing', 'Dismissed'],
    admin: ['Hearing Ongoing', 'Dismissed'],
  },
  'Hearing Ongoing': {
    'legal personnel': ['Dismissed', 'Perpetrator Convicted'],
    admin: ['Dismissed', 'Perpetrator Convicted'],
  },
  'Dismissed': {
    admin: [],
  },
  'Perpetrator Convicted': {
    'legal personnel': ['Resolved'],
    admin: ['Resolved'],
  },
  'Resolved': {
    admin: [],
  },
  'Withdrawn': {
    admin: [],
  },
}

function getAllowedTransitions(currentStatus, role) {
  if (role === 'admin') {
    return Object.keys(CaseStatusHistory.STATUS_ID_MAP).filter((status) => status !== currentStatus)
  }
  return TRANSITION_RULES[currentStatus]?.[role] || []
}

const getHistory = async (req, res) => {
  try {
    const { caseReportId } = req.params
    const staffView = req.query.staffView === 'true'
    const data = await CaseStatusHistory.getByCaseReport(caseReportId, { staffView })
    const actorById = await getHistoryActorMap(
      [...new Set(data.map((row) => row.changed_by_id).filter(Boolean))]
    )

    const shaped = data.map((h) => ({
      historyId:       h.history_id,
      displayId:       h.display_id,
      status:          h.case_status?.case_status_name,
      date:            new Date(h.approved_at || h.created_at).toLocaleDateString('en-PH'),
      by:              formatHistoryActor(actorById[h.changed_by_id], h.changed_by_role),
      notes:           h.notes,
      formData:        h.form_data,
      approvalStatus:  h.approval_status,
      rejectionReason: h.rejection_reason,
    }))

    res.json({ data: shaped })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function getHistoryActorMap(userIds) {
  if (!userIds?.length) return {}

  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, middle_name, last_name, extension_name, roles(role_name)')
    .in('user_id', userIds)

  if (error) {
    console.warn('[caseStatusHistory.getHistoryActorMap] Actor metadata unavailable:', error.message)
    return {}
  }

  return (data || []).reduce((map, user) => {
    map[user.user_id] = user
    return map
  }, {})
}

function formatHistoryActor(user, fallbackRole) {
  const role = user?.roles?.role_name || fallbackRole || ''
  const name = user
    ? [user.first_name, user.middle_name, user.last_name, user.extension_name]
        .filter(Boolean)
        .join(' ')
        .trim()
    : ''

  if (name && role) return `${name} - ${role}`
  return name || role || 'System'
}

const submitStatusChange = async (req, res) => {
  try {
    const {
      case_report_id,
      proposed_status,
      notes,
      form_data,
      assessment_type,
      findings,
      recommendation,
    } = req.body

    const caseStatusId = CaseStatusHistory.STATUS_ID_MAP[proposed_status]
    if (!caseStatusId) {
      return res.status(400).json({ error: `Unknown status: ${proposed_status}` })
    }

    const actorId = req.user?.id || req.user?.user_id
    const changed_by_id = actorId
    const requesterRole = String(req.user?.role || req.user?.role_name || '').toLowerCase()
    const changedByRole = req.user?.role || req.user?.role_name || 'Case Officer'
    if (!actorId) {
      return res.status(401).json({ error: 'Authentication required.' })
    }

    const { data: currentCase, error: currentCaseError } = await supabase
      .from('case_reports')
      .select('case_report_id, case_status_id')
      .eq('case_report_id', case_report_id)
      .maybeSingle()
    if (currentCaseError) throw currentCaseError
    if (!currentCase) return res.status(404).json({ error: 'Case report not found.' })

    const currentStatus = getStatusNameById(currentCase.case_status_id)
    const allowedTransitions = getAllowedTransitions(currentStatus, requesterRole)
    if (!allowedTransitions.includes(proposed_status)) {
      return res.status(403).json({
        error: `Your role cannot move this case from "${currentStatus}" to "${proposed_status}".`,
      })
    }

    // Step 1 — Insert history row
    if (requesterRole === 'legal personnel') {
      const { data: legalPersonnel, error: legalPersonnelError } = await supabase
        .from('legal_personnels')
        .select('legal_personnel_type')
        .eq('user_id', actorId)
        .maybeSingle()
      if (legalPersonnelError) throw legalPersonnelError

      const personnelType = String(legalPersonnel?.legal_personnel_type || '').toLowerCase()
      if (personnelType !== 'paralegal') {
        return res.status(403).json({ error: 'Only paralegals can update legal-review case statuses.' })
      }
    }

    const requiresApproval = CaseStatusHistory.APPROVAL_REQUIRED_STATUSES.has(proposed_status)
    if (requiresApproval) {
      const existingPending = await CaseStatusHistory.getPending(case_report_id)
      if (existingPending) {
        return res.status(409).json({ error: 'This case already has a pending status change.' })
      }
    }

    const historyRow = await CaseStatusHistory.create({
      caseReportId:   case_report_id,
      caseStatusId,
      changedById:    actorId,
      changedByRole:  changedByRole,
      notes,
      formData:       form_data,
      approvalStatus: requiresApproval ? 'pending' : 'approved',
      approvedAt:     requiresApproval ? null : new Date().toISOString(),
      approvedById:   null,
    })

    // Step 2 — Update case_reports.case_status_id
    if (!requiresApproval) {
      const { error: caseErr } = await supabase
        .from('case_reports')
        .update({ case_status_id: caseStatusId })
        .eq('case_report_id', case_report_id)
      if (caseErr) throw caseErr
    }

    // Step 3 — Resolve INT ids from UUID before inserting assessment
    let caseOfficerId    = null
    let legalPersonnelId = null
    const role = requesterRole

    if (role.includes('case officer') || role.includes('case_officer') || role === 'admin') {
      const { data: officer } = await supabase
        .from('case_officers')
        .select('case_officer_id')
        .eq('user_id', actorId)
        .maybeSingle()
      caseOfficerId = officer?.case_officer_id || null
    }

    if (role.includes('legal') || role.includes('lawyer') || role.includes('paralegal')) {
      const { data: lp } = await supabase
        .from('legal_personnels')
        .select('legal_personnel_id')
        .eq('user_id', actorId)
        .maybeSingle()
      legalPersonnelId = lp?.legal_personnel_id || null
    }

          console.log('[submitStatusChange] assessment payload:', JSON.stringify({
        case_report_id,
        case_officer_id:    caseOfficerId,
        legal_personnel_id: legalPersonnelId,
        status_history_id:  historyRow.history_id,
        assessment_type:    assessment_type || proposed_status,
        assessment_stage:   proposed_status,
        assessment_status:  requiresApproval ? 'pending' : 'approved',
        findings:           findings || notes,
        recommendation:     recommendation || null,
        changed_by_id:      actorId,
        changed_by_role:    changedByRole,
      }, null, 2))

    // Step 4 — Insert assessment with correct INT ids
    const assessment = await CaseAssessments.create({
      case_report_id,
      case_officer_id:    caseOfficerId,    // INT or null
      legal_personnel_id: legalPersonnelId, // INT or null
      status_history_id:  historyRow.history_id,
      assessment_type:    assessment_type || proposed_status,
      assessment_stage:   proposed_status,
      assessment_status:  requiresApproval ? 'pending' : 'approved',
      findings:           findings || notes,
      recommendation:     recommendation || null,
      changed_by_id,    // varchar — UUID is fine here
      changed_by_role:    changedByRole,
    })

    if (requiresApproval) {
      fireAndForget(
        notifyRoleUsers(['Admin'], {
          title: 'Case status approval needed',
          body: `Report #${case_report_id} has a pending status change to ${proposed_status}.`,
          data: {
            type: 'case_status',
            case_report_id,
            status_history_id: historyRow.history_id,
            link: `/cases/view?id=${case_report_id}`,
            priority: 'high',
          },
        }),
        'Failed to notify admins about pending status change'
      )
    } else {
      fireAndForget(
        notifyCaseOwner(case_report_id, {
          title: 'Report status updated',
          body: `Your report is now ${proposed_status}.`,
          data: {
            type: 'case_status',
            case_report_id,
            status_history_id: historyRow.history_id,
            link: `/cases/view?id=${case_report_id}`,
            priority: 'high',
          },
        }),
        'Failed to notify case owner about status update'
      )
    }

    res.status(201).json({
      message: requiresApproval
        ? 'Status change submitted for admin approval.'
        : 'Status updated successfully.',
      historyRow,
      assessment,
      requiresApproval,
    })
  } catch (err) {
    console.error('[submitStatusChange]', err.message)
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
    const { data: approver, error: approverError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', approved_by_id)
      .maybeSingle()
    if (approverError) throw approverError
    if (!approver) return res.status(400).json({ error: 'Approving user was not found.' })

    const pendingHistory = await CaseStatusHistory.getById(Number(historyId))
    const historyRow = pendingHistory?.form_data?.withdrawal_request_id
      ? await CaseStatusHistory.reviewWithdrawal({
          historyId: Number(historyId),
          approvedById: approver.user_id,
          decision: 'approved',
          originIp: req.ip || req.socket?.remoteAddress || null,
        })
      : await CaseStatusHistory.approve(Number(historyId), approver.user_id)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'approved')
    if (historyRow.case_report_id) {
      fireAndForget(
        notifyCaseOwner(historyRow.case_report_id, {
          title: 'Report status approved',
          body: `Your report is now ${getStatusNameById(historyRow.case_status_id)}.`,
          data: {
            type: 'case_status',
            case_report_id: historyRow.case_report_id,
            status_history_id: historyRow.history_id || historyId,
            link: `/cases/view?id=${historyRow.case_report_id}`,
            priority: 'high',
          },
        }),
        'Failed to notify case owner about approved status'
      )
    }
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
    const { data: approver, error: approverError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', approved_by_id)
      .maybeSingle()
    if (approverError) throw approverError
    if (!approver) return res.status(400).json({ error: 'Approving user was not found.' })

    const pendingHistory = await CaseStatusHistory.getById(Number(historyId))
    const historyRow = pendingHistory?.form_data?.withdrawal_request_id
      ? await CaseStatusHistory.reviewWithdrawal({
          historyId: Number(historyId),
          approvedById: approver.user_id,
          decision: 'rejected',
          rejectionReason: rejection_reason,
          originIp: req.ip || req.socket?.remoteAddress || null,
        })
      : await CaseStatusHistory.reject(Number(historyId), approver.user_id, rejection_reason)
    await CaseAssessments.updateAssessmentStatus(Number(historyId), 'rejected')
    if (historyRow.case_report_id) {
      fireAndForget(
        notifyCaseOwner(historyRow.case_report_id, {
          title: 'Report status update rejected',
          body: 'A proposed status update for your report was not approved.',
          data: {
            type: 'case_status',
            case_report_id: historyRow.case_report_id,
            status_history_id: historyRow.history_id || historyId,
            link: `/cases/view?id=${historyRow.case_report_id}`,
            priority: 'normal',
          },
        }),
        'Failed to notify case owner about rejected status'
      )
    }
    res.json({ message: 'Status change rejected.', historyRow })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getHistory, submitStatusChange, approveStatusChange, rejectStatusChange }
