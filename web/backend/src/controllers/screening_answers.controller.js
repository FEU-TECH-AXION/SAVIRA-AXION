const ScreeningAnswersModel = require('../models/screening_answers.model')

const getItems = async (req, res) => {
    try {
        const userId = req.user?.id
        if (!userId) return res.status(401).json({ error: 'Authentication required.' })

        const data = await ScreeningAnswersModel.getAll()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        // req.body is passed directly — input validation should be added here
        // before hitting the DB (e.g. check required fields, sanitize input)
        const item = await ScreeningAnswersModel.create(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { getItems, createItem }