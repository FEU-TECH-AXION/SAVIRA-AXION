const InterviewSlotsModel = require('../models/interview_slots.model')

const SLOT_TYPES = new Set(['case_report', 'volunteer'])

const normalizeSlotType = (slotType) => {
    if (slotType === 'volunteer_application') return 'volunteer'
    return slotType
}

const isValidSlotType = (slotType) => SLOT_TYPES.has(slotType)

const getItems = async (req, res) => {
    try {
        const slotType = normalizeSlotType(req.query.slot_type)
        if (slotType && !isValidSlotType(slotType)) {
            return res.status(400).json({ error: 'slot_type must be case_report or volunteer.' })
        }

        const filters = {
            slot_type:    slotType,
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
        const { slot_type, created_by, slot_date, slot_time, duration_minutes } = req.body
        const slotType = normalizeSlotType(slot_type)

        if (!slotType || !created_by || !slot_date || !slot_time) {
            return res.status(400).json({
                error: 'slot_type, created_by, slot_date, and slot_time are required.'
            })
        }
        if (!isValidSlotType(slotType)) {
            return res.status(400).json({ error: 'slot_type must be case_report or volunteer.' })
        }

        const item = await InterviewSlotsModel.create({
            slot_type: slotType,
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

const updateItem = async (req, res) => {
    try {
        const allowed = ['slot_date', 'slot_time', 'duration_minutes', 'is_available']
        const payload = Object.fromEntries(
            Object.entries(req.body).filter(([k]) => allowed.includes(k))
        )
        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' })
        }
        const { data, error } = await require('../config/supabase')
            .from('interview_slots')
            .update(payload)
            .eq('slot_id', req.params.id)
            .select()
            .single()
        if (error) throw error
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createBulk = async (req, res) => {
    try {
        const { slot_type, created_by, day_of_week, slot_time, duration_minutes, weeks_ahead } = req.body
        const slotType = normalizeSlotType(slot_type)

        if (!slotType || !created_by || day_of_week === undefined || !slot_time) {
            return res.status(400).json({
                error: 'slot_type, created_by, day_of_week, and slot_time are required.'
            })
        }
        if (!isValidSlotType(slotType)) {
            return res.status(400).json({ error: 'slot_type must be case_report or volunteer.' })
        }

        const weeksToGenerate = weeks_ahead || 4
        const slots = []
        const today = new Date()

        for (let w = 0; w < weeksToGenerate; w++) {
            const date = new Date(today)
            const daysUntilTarget = (day_of_week - today.getDay() + 7) % 7 || 7
            date.setDate(today.getDate() + daysUntilTarget + w * 7)
            slots.push({
                slot_type: slotType,
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

module.exports = { getItems, createItem, updateItem, createBulk, deleteItem }
