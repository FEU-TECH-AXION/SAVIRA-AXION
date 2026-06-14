const CaseReportLogs = require('../models/case_report_logs.model')

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
        const item = await CaseReportLogs.create(req.body)

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
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' })
        }

        const item = await CaseReportLogs.update(req.params.id, updates)
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
