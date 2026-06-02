const InterviewSlotsModel = require('../models/interview_slots.model')

const getItems = async (req, res) => {
    try {
        // Accepts query params: slot_type, created_by, is_available
        const filters = {
            slot_type:    req.query.slot_type,
            created_by:   req.query.created_by,
            is_available: req.query.is_available !== undefined
                ? req.query.is_available === 'true'
                : undefined,
        }
        const data = await InterviewSlotsModel.getAll(filters)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const {
            slot_type,
            created_by,
            slot_date,
            slot_time,
            duration_minutes,
        } = req.body

        if (!slot_type || !created_by || !slot_date || !slot_time) {
            return res.status(400).json({
                error: 'slot_type, created_by, slot_date, and slot_time are required.'
            })
        }

        const item = await InterviewSlotsModel.create({
            slot_type,
            created_by,
            slot_date,
            slot_time,
            duration_minutes: duration_minutes || 60,
            day_of_week: new Date(slot_date).getDay(),
            is_available: true,
        })

        res.status(201).json({ data: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/interview_slots/bulk — generates recurring slots for N weeks ahead
const createBulk = async (req, res) => {
    try {
        const { slot_type, created_by, day_of_week, slot_time, duration_minutes, weeks_ahead } = req.body

        if (!slot_type || !created_by || day_of_week === undefined || !slot_time) {
            return res.status(400).json({
                error: 'slot_type, created_by, day_of_week, and slot_time are required.'
            })
        }

        const weeksToGenerate = weeks_ahead || 4
        const slots = []
        const today = new Date()

        for (let w = 0; w < weeksToGenerate; w++) {
            // Find the next occurrence of day_of_week from today
            const date = new Date(today)
            const daysUntilTarget = (day_of_week - today.getDay() + 7) % 7 || 7
            date.setDate(today.getDate() + daysUntilTarget + w * 7)

            slots.push({
                slot_type,
                created_by,
                slot_date: date.toISOString().split('T')[0],
                slot_time,
                duration_minutes: duration_minutes || 60,
                day_of_week,
                is_available: true,
            })
        }

        const data = await InterviewSlotsModel.createMany(slots)
        res.status(201).json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const deleteItem = async (req, res) => {
    try {
        await InterviewSlotsModel.deleteById(req.params.id)
        res.json({ deleted: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { getItems, createItem, createBulk, deleteItem }