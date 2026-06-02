const InterviewModel = require('../models/interviews.model')
const InterviewSlotsModel = require('../models/interview_slots.model')

const getItems = async (req, res) => {
    try {
        // Accepts query params: type, status, interviewer_user_id,
        // case_report_id, volunteer_application_id
        const data = await InterviewModel.getAll(req.query)
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
            interviewee_user_id,
            interviewer_user_id,
            notes,
        } = req.body

        // Basic required field check
        if (!type || !interviewee_user_id || !interviewer_user_id) {
            return res.status(400).json({ error: 'type, interviewee_user_id, and interviewer_user_id are required.' })
        }

        if (type === 'case_report' && !case_report_id) {
            return res.status(400).json({ error: 'case_report_id is required for type case_report.' })
        }

        if (type === 'volunteer' && !volunteer_application_id) {
            return res.status(400).json({ error: 'volunteer_application_id is required for type volunteer.' })
        }

        const item = await InterviewModel.create({
            type,
            case_report_id: case_report_id || null,
            volunteer_application_id: volunteer_application_id || null,
            interviewee_user_id,
            interviewer_user_id,
            notes: notes || null,
            status: 'invited',
        })

        res.status(201).json({ data: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PATCH /api/interviews/:id/select-slot
const selectSlot = async (req, res) => {
    try {
        const { slot_id } = req.body
        if (!slot_id) return res.status(400).json({ error: 'slot_id is required.' })

        // Verify the slot exists and is still available
        const slot = await InterviewSlotsModel.getById(slot_id)
        if (!slot) return res.status(404).json({ error: 'Slot not found.' })
        if (!slot.is_available) return res.status(409).json({ error: 'This slot has already been taken.' })

        // Claim the slot and update interview status
        const [interview] = await Promise.all([
            InterviewModel.selectSlot(req.params.id, slot_id),
            InterviewSlotsModel.markUnavailable(slot_id),
        ])

        res.json({ data: interview })
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
    confirm,
    complete,
    cancel,
    reject,
    expireStale,
}