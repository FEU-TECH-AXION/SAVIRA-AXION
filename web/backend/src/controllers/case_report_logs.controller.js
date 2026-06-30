const CaseReportLogs = require('../models/case_report_logs.model')

const PUBLIC_MESSAGE_REQUIRED = 'A public message is required when an update is marked visible to the complainant.'
const PUBLIC_MESSAGE_MAX_LENGTH = 280

function normalizePublicFields(body = {}) {
    const payload = { ...body }

    if (payload.action_type === 'internal_note') {
        payload.is_public = false
        payload.public_message = null
        return { payload }
    }

    const isPublic = payload.is_public === true
    const publicMessage = typeof payload.public_message === 'string'
        ? payload.public_message.trim()
        : ''

    payload.is_public = isPublic
    payload.public_message = isPublic ? publicMessage : null

    if (isPublic && !publicMessage) return { error: PUBLIC_MESSAGE_REQUIRED }
    if (isPublic && publicMessage.length > PUBLIC_MESSAGE_MAX_LENGTH) {
        return { error: `Public message must be ${PUBLIC_MESSAGE_MAX_LENGTH} characters or fewer.` }
    }

    return { payload }
}

const getItems = async (req, res) => {
    try {
        const data = await CaseReportLogs.getAll()
        res.json(data)
    } catch (err) {
        // 500 here because the failure is on our side (DB/Supabase), not the client's
        res.status(500).json({ error: err.message })
    }
}

const getItemsByCase = async (req, res) => {
    try {
        const data = await CaseReportLogs.getByCaseReport(req.params.caseReportId)
        res.json({ data })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        // req.body is passed directly — input validation should be added here
        // before hitting the DB (e.g. check required fields, sanitize input)
        const { payload, error } = normalizePublicFields(req.body)
        if (error) return res.status(400).json({ error })

        const item = await CaseReportLogs.create(payload)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const updateItem = async (req, res) => {
    try {
        const updates = {}
        if (req.body.remarks !== undefined) updates.remarks = req.body.remarks
        if (req.body.action_type !== undefined) updates.action_type = req.body.action_type
        if (req.body.is_public !== undefined) updates.is_public = req.body.is_public
        if (req.body.public_message !== undefined) updates.public_message = req.body.public_message
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' })
        }

        if (updates.action_type === undefined) {
            const existing = await CaseReportLogs.getById(req.params.id)
            if (!existing) return res.status(404).json({ error: 'Log not found.' })
            updates.action_type = existing.action_type
        }

        const { payload, error } = normalizePublicFields(updates)
        if (error) return res.status(400).json({ error })

        const item = await CaseReportLogs.update(req.params.id, payload)
        res.json({ data: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const deleteItem = async (req, res) => {
    try {
        await CaseReportLogs.remove(req.params.id)
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { getItems, getItemsByCase, createItem, updateItem, deleteItem }
