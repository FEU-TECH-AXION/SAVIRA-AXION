const InterviewModel = require('../models/interviews.model')
const InterviewSlotsModel = require('../models/interview_slots.model')
const supabase = require('../config/supabase')

const normalizeInterviewType = (type) =>
    type === 'volunteer_application' ? 'volunteer' : type

const isVolunteerType = (type) =>
    normalizeInterviewType(type) === 'volunteer'

const actorId = (req) => req.user?.id || req.user?.user_id
const isAdmin = (req) => req.user?.role === 'Admin'
const isCaseOfficer = (req) => req.user?.role === 'Case Officer'
const isStaff = (req) => req.user?.role === 'Staff'

const isMembershipStaff = async (userId) => {
    const { data, error } = await supabase
        .from('staff')
        .select('committee_id')
        .eq('user_id', userId)
        .maybeSingle()
    return !error && data?.committee_id === 2
}

const ownsCaseReport = async (caseReportId, userId) => {
    if (!caseReportId || !userId) return false
    const { data: report, error: reportError } = await supabase
        .from('case_reports')
        .select('complainant_id')
        .eq('case_report_id', caseReportId)
        .maybeSingle()
    if (reportError || !report) return false

    const { data: complainant, error: complainantError } = await supabase
        .from('complainants')
        .select('user_id')
        .eq('complainant_id', report.complainant_id)
        .maybeSingle()
    return !complainantError && String(complainant?.user_id) === String(userId)
}

const isAssignedCaseOfficer = async (caseReportId, userId) => {
    if (!caseReportId || !userId) return false
    const { data: officer, error: officerError } = await supabase
        .from('case_officers')
        .select('case_officer_id')
        .eq('user_id', userId)
        .maybeSingle()
    if (officerError || !officer) return false

    const { data: assignment, error: assignmentError } = await supabase
        .from('case_assignments')
        .select('assignment_id')
        .eq('case_report_id', caseReportId)
        .eq('case_officer_id', officer.case_officer_id)
        .eq('is_active', true)
        .maybeSingle()
    return !assignmentError && Boolean(assignment)
}

const ownsVolunteerApplication = async (applicationId, userId) => {
    if (!applicationId || !userId) return false
    const { data: application, error: applicationError } = await supabase
        .from('volunteer_applications')
        .select('volunteer_applicant_id')
        .eq('volunteer_application_id', applicationId)
        .maybeSingle()
    if (applicationError || !application) return false

    const { data: applicant, error: applicantError } = await supabase
        .from('volunteer_applicants')
        .select('user_id')
        .eq('volunteer_applicant_id', application.volunteer_applicant_id)
        .maybeSingle()
    return !applicantError && String(applicant?.user_id) === String(userId)
}

const canAccessInterview = async (req, interview) => {
    const userId = actorId(req)
    if (!userId || !interview) return false
    if (isAdmin(req)) return true
    if (String(interview.interviewee_user_id) === String(userId)) return true
    if (String(interview.interviewer_user_id) === String(userId)) return true

    const type = normalizeInterviewType(interview.type)
    if (type === 'case_report') {
        if (await ownsCaseReport(interview.case_report_id, userId)) return true
        if (isCaseOfficer(req) && await isAssignedCaseOfficer(interview.case_report_id, userId)) return true
    }

    if (isVolunteerType(type)) {
        if (await ownsVolunteerApplication(interview.volunteer_application_id, userId)) return true
        if (isStaff(req) && await isMembershipStaff(userId) && String(interview.interviewer_user_id) === String(userId)) {
            return true
        }
    }

    return false
}

const canAccessInterviewFilters = async (req, filters) => {
    const userId = actorId(req)
    if (!userId) return false
    if (isAdmin(req)) return true

    const type = normalizeInterviewType(filters.type)
    if (type === 'case_report' && filters.case_report_id) {
        if (await ownsCaseReport(filters.case_report_id, userId)) return true
        if (isCaseOfficer(req) && await isAssignedCaseOfficer(filters.case_report_id, userId)) return true
    }

    if (isVolunteerType(type) && filters.volunteer_application_id) {
        if (await ownsVolunteerApplication(filters.volunteer_application_id, userId)) return true
        if (isStaff(req) && await isMembershipStaff(userId)) return true
    }

    if (filters.interviewer_user_id && String(filters.interviewer_user_id) === String(userId)) {
        if (type === 'case_report' && isCaseOfficer(req)) return true
        if (isVolunteerType(type) && isStaff(req) && await isMembershipStaff(userId)) return true
    }

    return false
}

const canCreateInterview = async (req, payload) => {
    if (isAdmin(req)) return true
    const userId = actorId(req)
    const type = normalizeInterviewType(payload.type)
    if (type === 'case_report') {
        return isCaseOfficer(req) && await isAssignedCaseOfficer(payload.case_report_id, userId)
    }
    if (isVolunteerType(type)) {
        return isStaff(req) && await isMembershipStaff(userId)
    }
    return false
}

const parsePreferredDateTime = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!match) return null

    const [, year, month, day, hour, minute] = match
    return { year, month, day, hour, minute }
}

const formatPreferredDate = (value) => {
    const parts = parsePreferredDateTime(value)
    if (!parts) return String(value || '').trim()

    const monthName = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ][Number(parts.month) - 1] || parts.month

    return `${monthName} ${Number(parts.day)}, ${parts.year}`
}

const formatPreferredTime = (value) => {
    const parts = parsePreferredDateTime(value)
    if (!parts) return String(value || '').trim()

    const hourNumber = Number(parts.hour)
    const hour12 = hourNumber % 12 || 12
    const ampm = hourNumber >= 12 ? 'PM' : 'AM'

    return `${hour12}:${parts.minute} ${ampm}`
}

const composeAvailabilityRequestReason = (reason, preferredDateTime) => {
    const normalizedReason = String(reason || '').trim()
    const normalizedPreferredDateTime = String(preferredDateTime || '').trim()

    if (!normalizedPreferredDateTime) return normalizedReason
    return `Preferred date: ${formatPreferredDate(normalizedPreferredDateTime)}\nPreferred time: ${formatPreferredTime(normalizedPreferredDateTime)}\nReason: ${normalizedReason}`
}

const getPreferredDateTimeFromBody = (body = {}) => {
    const explicitDateTime = String(body.preferred_datetime || body.preferredDateTime || '').trim()
    if (explicitDateTime) return explicitDateTime

    const preferredDate = String(body.preferred_date || body.preferredDate || '').trim()
    const preferredTime = String(body.preferred_time || body.preferredTime || '').trim()
    return preferredDate && preferredTime ? `${preferredDate}T${preferredTime}` : ''
}

const getItems = async (req, res) => {
    try {
        // Accepts query params: type, status, interviewer_user_id,
        // case_report_id, volunteer_application_id
        const filters = { ...req.query }
        filters.type = normalizeInterviewType(filters.type)
        if (isVolunteerType(filters.type) && filters.application_id && !filters.volunteer_application_id) {
            filters.volunteer_application_id = filters.application_id
        }
        delete filters.application_id
        if (!await canAccessInterviewFilters(req, filters)) {
            return res.status(403).json({ error: 'Forbidden' })
        }
        const data = await InterviewModel.getAll(filters)
        const visible = []
        for (const interview of data || []) {
            if (await canAccessInterview(req, interview)) visible.push(interview)
        }
        res.json({ data: visible })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getItem = async (req, res) => {
    try {
        const data = await InterviewModel.getById(req.params.id)
        if (!data) return res.status(404).json({ error: 'Interview not found' })
        if (!await canAccessInterview(req, data)) return res.status(403).json({ error: 'Forbidden' })
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const {
            type,
            case_report_id,
            volunteer_application_id,
            application_id,
            interviewee_user_id,
            interviewer_user_id,
            notes,
            slot_expires_at,
        } = req.body
        const normalizedType = normalizeInterviewType(type)
        const normalizedVolunteerApplicationId = isVolunteerType(normalizedType)
            ? volunteer_application_id || application_id
            : null

        // Basic required field check
        if (!normalizedType || !interviewee_user_id || !interviewer_user_id) {
            return res.status(400).json({ error: 'type, interviewee_user_id, and interviewer_user_id are required.' })
        }

        if (normalizedType === 'case_report' && !case_report_id) {
            return res.status(400).json({ error: 'case_report_id is required for type case_report.' })
        }

        if (normalizedType === 'volunteer' && !normalizedVolunteerApplicationId) {
            return res.status(400).json({ error: 'volunteer_application_id is required for type volunteer.' })
        }

        if (!await canCreateInterview(req, {
            type: normalizedType,
            case_report_id,
            volunteer_application_id: normalizedVolunteerApplicationId,
        })) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const payload = {
            type: normalizedType,
            case_report_id: case_report_id || null,
            volunteer_application_id: normalizedVolunteerApplicationId || null,
            interviewee_user_id,
            interviewer_user_id,
            notes: notes || null,
            status: 'invited',
        }
        if (slot_expires_at) payload.slot_expires_at = slot_expires_at

        const item = await InterviewModel.create(payload)

        res.status(201).json({ data: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/select-slot
const selectSlot = async (req, res) => {
    try {
        const { slot_id, notes } = req.body
        if (!slot_id) return res.status(400).json({ error: 'slot_id is required.' })

        const currentInterview = await InterviewModel.getById(req.params.id)
        if (!currentInterview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, currentInterview)) return res.status(403).json({ error: 'Forbidden' })

        // Verify the slot exists and is still available
        const slot = await InterviewSlotsModel.getById(slot_id)
        if (!slot) return res.status(404).json({ error: 'Slot not found.' })
        if (slot.slot_type !== normalizeInterviewType(currentInterview.type)) {
            return res.status(400).json({ error: 'Selected slot does not match this interview type.' })
        }
        if (
            currentInterview.interviewer_user_id &&
            String(slot.created_by) !== String(currentInterview.interviewer_user_id)
        ) {
            return res.status(403).json({ error: 'Selected slot is not available for this interviewer.' })
        }
        if (!slot.is_available) return res.status(409).json({ error: 'This slot has already been taken.' })

        // Claim the slot and update interview status
        const [interview] = await Promise.all([
            InterviewModel.selectSlot(req.params.id, slot_id, notes || null),
            InterviewSlotsModel.markUnavailable(slot_id),
        ])

        res.json({ data: interview })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/reschedule
const reschedule = async (req, res) => {
    try {
        const { slot_id, reason } = req.body
        const normalizedReason = String(reason || '').trim()

        if (!slot_id) return res.status(400).json({ error: 'slot_id is required.' })
        if (!normalizedReason) {
            return res.status(400).json({ error: 'A reason is required to reschedule an interview.' })
        }

        const [interview, slot] = await Promise.all([
            InterviewModel.getById(req.params.id),
            InterviewSlotsModel.getById(slot_id),
        ])

        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })
        if (!isAdmin(req) && String(interview.interviewer_user_id) !== String(actorId(req))) {
            return res.status(403).json({ error: 'Only the assigned interviewer can reschedule this interview.' })
        }
        if (!slot) return res.status(404).json({ error: 'Slot not found.' })
        if (slot.slot_type !== normalizeInterviewType(interview.type)) {
            return res.status(400).json({ error: 'Selected slot does not match this interview type.' })
        }
        if (
            interview.interviewer_user_id &&
            String(slot.created_by) !== String(interview.interviewer_user_id)
        ) {
            return res.status(403).json({ error: 'Selected slot is not available for this interviewer.' })
        }
        if (!slot.is_available) {
            return res.status(409).json({ error: 'This slot has already been taken.' })
        }

        const previousSlotId = interview.selected_slot_id
        const nextStatus = normalizeInterviewType(interview.type) === 'case_report'
            ? 'rescheduled'
            : 'scheduled'
        const updatedInterview = await InterviewModel.reschedule(req.params.id, slot_id, normalizedReason, nextStatus)

        await InterviewSlotsModel.markUnavailable(slot_id)
        if (previousSlotId && String(previousSlotId) !== String(slot_id)) {
            await InterviewSlotsModel.markAvailable(previousSlotId)
        }

        res.json({ data: updatedInterview })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/accept-reschedule
const acceptReschedule = async (req, res) => {
    try {
        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const userId = actorId(req)
        if (String(interview.interviewee_user_id) !== String(userId) && !isAdmin(req)) {
            return res.status(403).json({ error: 'Only the interviewee can accept a rescheduled interview.' })
        }

        const data = await InterviewModel.acceptReschedule(req.params.id)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/request-new-slots
const requestNewSlots = async (req, res) => {
    try {
        const normalizedReason = String(req.body.reason || '').trim()
        const normalizedPreferredDateTime = getPreferredDateTimeFromBody(req.body)
        if (!normalizedReason) {
            return res.status(400).json({ error: 'A reason or availability note is required.' })
        }

        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const previousSlotId = interview.selected_slot_id
        const data = await InterviewModel.requestNewSlots(
            req.params.id,
            composeAvailabilityRequestReason(normalizedReason, normalizedPreferredDateTime)
        )
        if (previousSlotId) await InterviewSlotsModel.markAvailable(previousSlotId)

        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/reopen-selection
const reopenSelection = async (req, res) => {
    try {
        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const slotIds = Array.isArray(req.body.slot_ids) ? req.body.slot_ids : []
        if (slotIds.length === 0) {
            return res.status(400).json({ error: 'Select or create at least one available slot.' })
        }

        const slots = await Promise.all(slotIds.map((slotId) => InterviewSlotsModel.getById(slotId)))
        if (slots.some((slot) => !slot || !slot.is_available)) {
            return res.status(409).json({ error: 'One or more selected slots are no longer available.' })
        }

        const expiryDays = Math.min(Math.max(Number(req.body.expiry_days) || 7, 1), 30)
        const slotExpiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString()
        const data = await InterviewModel.reopenSelection(req.params.id, slotExpiresAt)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/confirm
const confirm = async (req, res) => {
    try {
        const { meeting_link } = req.body
        if (!meeting_link) return res.status(400).json({ error: 'meeting_link is required.' })

        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const data = await InterviewModel.confirm(req.params.id, meeting_link)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/complete
const complete = async (req, res) => {
    try {
        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const data = await InterviewModel.complete(req.params.id)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/cancel
const cancel = async (req, res) => {
    try {
        const { cancellation_reason } = req.body
        const normalizedReason = String(cancellation_reason || '').trim()
        const template = 'The interview is being cancelled because'
        const noticeText = normalizedReason
            .replace(new RegExp(`^${template}\\s*`, 'i'), '')
            .trim()

        if (!noticeText) {
            return res.status(400).json({ error: 'A cancellation notice is required.' })
        }

        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const data = await InterviewModel.cancel(req.params.id, normalizedReason)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const unassignStaff = async (req, res) => {
    try {
        const role = String(req.user?.role || req.user?.role_name || '').toLowerCase()
        const roleId = parseInt(req.user?.role_id)
        if (role !== 'admin' && roleId !== 3) {
            return res.status(403).json({ error: 'Only admins can remove interview staff assignments.' })
        }

        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!interview.interviewer_user_id) {
            return res.status(404).json({ error: 'Active interview staff assignment not found.' })
        }

        const data = await InterviewModel.unassignStaff(req.params.id)
        res.json({ data, message: 'Interview staff assignment removed successfully.' })
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to remove interview staff assignment.' })
    }
}

// PATCH /api/interviews/:id/reject
const reject = async (req, res) => {
    try {
        const { rejection_reason } = req.body
        const interview = await InterviewModel.getById(req.params.id)
        if (!interview) return res.status(404).json({ error: 'Interview not found.' })
        if (!await canAccessInterview(req, interview)) return res.status(403).json({ error: 'Forbidden' })

        const data = await InterviewModel.reject(req.params.id, rejection_reason || null)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/interviews/expire — called by cron job
const expireStale = async (req, res) => {
    try {
        const data = await InterviewModel.expireStale()
        res.json({ expired: data.length, data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = {
    getItems,
    getItem,
    createItem,
    selectSlot,
    reschedule,
    acceptReschedule,
    requestNewSlots,
    reopenSelection,
    confirm,
    complete,
    cancel,
    unassignStaff,
    reject,
    expireStale,
}
