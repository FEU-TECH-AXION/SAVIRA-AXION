const ScreeningQuestionsModel = require('../models/screening_questions.model')
const ScreeningQuestionSetModel = require('../models/screening_question_set.model')

const ALLOWED_TYPES = new Set(['non_negotiable', 'negotiable'])

function asPositiveInteger(value) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function validateQuestion(payload, { partial = false } = {}) {
    const errors = []
    const required = [
        'screening_question_set_id',
        'order',
        'category',
        'type',
        'question_key',
        'question_text',
        'options',
        'preferred_answer',
    ]

    if (!partial) {
        required.forEach((field) => {
            if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                errors.push(`${field} is required.`)
            }
        })
    }

    if (payload.type !== undefined && !ALLOWED_TYPES.has(payload.type)) {
        errors.push('type must be non_negotiable or negotiable.')
    }

    if (payload.options !== undefined) {
        if (!Array.isArray(payload.options) || payload.options.length < 2) {
            errors.push('options must contain at least two answer choices.')
        } else if (payload.preferred_answer !== undefined && !payload.options.includes(payload.preferred_answer)) {
            errors.push('preferred_answer must be one of the available options.')
        }
    }

    if (payload.order !== undefined && !asPositiveInteger(payload.order)) {
        errors.push('order must be a positive integer.')
    }

    return errors
}

const getItems = async (req, res) => {
    try {
        const requestedSetId = asPositiveInteger(req.query.question_set_id)
        const questionSet = requestedSetId
            ? await ScreeningQuestionSetModel.getById(requestedSetId)
            : await ScreeningQuestionSetModel.getActive()

        if (!questionSet) {
            return res.status(404).json({
                error: 'No active screening question set was found. Create or activate a question set first.',
            })
        }

        const questions = await ScreeningQuestionsModel.getBySet(
            questionSet.screening_question_set_id
        )

        res.json({ questionSet, questions })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const errors = validateQuestion(req.body)
        if (errors.length) return res.status(400).json({ error: errors.join(' ') })

        const item = await ScreeningQuestionsModel.create(req.body)
        res.status(201).json({ question: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const updateItem = async (req, res) => {
    try {
        const id = asPositiveInteger(req.params.id)
        if (!id) return res.status(400).json({ error: 'Invalid question ID.' })

        const allowedFields = [
            'category',
            'type',
            'question_text',
            'options',
            'preferred_answer',
            'auto_fail',
            'is_active',
            'order',
        ]
        const payload = Object.fromEntries(
            allowedFields
                .filter((field) => req.body[field] !== undefined)
                .map((field) => [field, req.body[field]])
        )

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'No editable fields were provided.' })
        }

        const errors = validateQuestion(payload, { partial: true })
        if (errors.length) return res.status(400).json({ error: errors.join(' ') })

        const item = await ScreeningQuestionsModel.update(id, payload)
        res.json({ question: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const reorderItems = async (req, res) => {
    try {
        const items = req.body.order
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'A non-empty order list is required.' })
        }

        const normalized = items.map((item) => ({
            screening_question_id: asPositiveInteger(item.screening_question_id),
            order: asPositiveInteger(item.order),
        }))

        if (normalized.some((item) => !item.screening_question_id || !item.order)) {
            return res.status(400).json({ error: 'Each order item must contain valid question and order IDs.' })
        }

        const questions = await ScreeningQuestionsModel.updateOrder(normalized)
        res.json({ questions })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const deleteItem = async (req, res) => {
    try {
        const id = asPositiveInteger(req.params.id)
        if (!id) return res.status(400).json({ error: 'Invalid question ID.' })

        // Questions may already be referenced by screening_answers. Archiving
        // preserves those records while removing the question from future use.
        const item = await ScreeningQuestionsModel.archive(id)
        res.json({ question: item })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { getItems, createItem, updateItem, reorderItems, deleteItem }
