const InterviewModel = require('../models/interviews.model')
const InterviewSlotsModel = require('../models/interview_slots.model')

const normalizeInterviewType = (type) =>
    type === 'volunteer_application' ? 'volunteer' : type

const isVolunteerType = (type) =>
    normalizeInterviewType(type) === 'volunteer'

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
        const data = await InterviewModel.getAll(filters)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getItem = async (req, res) => {
    try {
        const data = await InterviewModel.getById(req.params.id)
        if (!data) return res.status(404).json({ error: 'Interview not found' })
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

        // Verify the slot exists and is still available
        const slot = await InterviewSlotsModel.getById(slot_id)
        if (!slot) return res.status(404).json({ error: 'Slot not found.' })
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
        if (!slot) return res.status(404).json({ error: 'Slot not found.' })
        if (!slot.is_available) {
            return res.status(409).json({ error: 'This slot has already been taken.' })
        }

        const previousSlotId = interview.selected_slot_id
        const updatedInterview = await InterviewModel.reschedule(req.params.id, slot_id)

        await InterviewSlotsModel.markUnavailable(slot_id)
        if (previousSlotId && String(previousSlotId) !== String(slot_id)) {
            await InterviewSlotsModel.markAvailable(previousSlotId)
        }

        res.json({ data: updatedInterview })
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

        const data = await InterviewModel.confirm(req.params.id, meeting_link)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/complete
const complete = async (req, res) => {
    try {
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
        const data = await InterviewModel.cancel(req.params.id, cancellation_reason || null)
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
    requestNewSlots,
    reopenSelection,
    confirm,
    complete,
    cancel,
    unassignStaff,
    reject,
    expireStale,
}
