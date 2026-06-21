const ScreeningQuestionSetModel = require('../models/screening_question_set.model')
const ScreeningQuestionsModel = require('../models/screening_questions.model')

const ALLOWED_TYPES = new Set(['non_negotiable', 'negotiable'])

function nextVersion(sets) {
    const highest = sets.reduce((max, set) => {
        const match = String(set.version || '').match(/(\d+)/)
        return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `v${highest + 1}`
}

function normalizeQuestions(questions, setId) {
    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('At least one screening question is required.')
    }

    return questions.map((question, index) => {
        const options = Array.isArray(question.options)
            ? question.options.map((option) => String(option).trim()).filter(Boolean)
            : []
        const category = String(question.category || '').trim()
        const questionText = String(question.question_text || '').trim()
        const questionKey = String(question.question_key || '').trim()
        const type = question.type

        if (!category || !questionText || !questionKey) {
            throw new Error(`Question ${index + 1} is missing its section, key, or question text.`)
        }
        if (!ALLOWED_TYPES.has(type)) {
            throw new Error(`Question ${index + 1} has an invalid scoring type.`)
        }
        if (options.length < 2 || !options.includes(question.preferred_answer)) {
            throw new Error(`Question ${index + 1} has invalid answer choices.`)
        }

        return {
            screening_question_set_id: setId,
            order: index + 1,
            category,
            type,
            question_key: questionKey,
            question_text: questionText,
            options,
            preferred_answer: question.preferred_answer,
            auto_fail: type === 'non_negotiable',
            is_active: question.is_active !== false,
            deprecated_at: null,
        }
    })
}

async function publishSnapshot(questions) {
    const allSets = await ScreeningQuestionSetModel.getAll()
    const previousActive = allSets.find((set) => set.is_active)
    const createdSet = await ScreeningQuestionSetModel.create({
        version: nextVersion(allSets),
        effective_from: new Date().toISOString().slice(0, 10),
        is_active: false,
    })

    try {
        const normalized = normalizeQuestions(
            questions,
            createdSet.screening_question_set_id
        )
        await ScreeningQuestionsModel.createMany(normalized)
        await ScreeningQuestionSetModel.deactivateAll()
        const activeSet = await ScreeningQuestionSetModel.setActive(
            createdSet.screening_question_set_id,
            true
        )
        return {
            questionSet: activeSet,
            questions: await ScreeningQuestionsModel.getBySet(
                activeSet.screening_question_set_id
            ),
        }
    } catch (error) {
        try {
            await ScreeningQuestionsModel.removeBySet(
                createdSet.screening_question_set_id
            )
            await ScreeningQuestionSetModel.remove(
                createdSet.screening_question_set_id
            )
            if (previousActive) {
                await ScreeningQuestionSetModel.setActive(
                    previousActive.screening_question_set_id,
                    true
                )
            }
        } catch (_) {
            // Preserve the original publishing error.
        }
        throw error
    }
}

const getItems = async (req, res) => {
    try {
        const data = await ScreeningQuestionSetModel.getAll()
        const history = data.map((set) => ({
            ...set,
            screening_questions: [...(set.screening_questions || [])].sort(
                (a, b) => a.order - b.order
            ),
        }))
        res.json(history)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const result = await publishSnapshot(req.body.questions)
        res.status(201).json(result)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

const restoreItem = async (req, res) => {
    try {
        const source = await ScreeningQuestionSetModel.getById(req.params.id, {
            includeQuestions: true,
        })
        if (!source) {
            return res.status(404).json({ error: 'That version no longer exists.' })
        }

        const sourceQuestions = [...(source.screening_questions || [])]
            .filter((question) => !question.deprecated_at)
            .sort((a, b) => a.order - b.order)
        const result = await publishSnapshot(sourceQuestions)
        res.status(201).json(result)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

const renameItem = async (req, res) => {
    try {
        const version = String(req.body.version || '').trim()
        if (!version) {
            return res.status(400).json({ error: 'Version name is required.' })
        }
        const item = await ScreeningQuestionSetModel.rename(
            req.params.id,
            version.slice(0, 80)
        )
        res.json({ questionSet: item })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

const copyItem = async (req, res) => {
    try {
        const source = await ScreeningQuestionSetModel.getById(req.params.id, {
            includeQuestions: true,
        })
        if (!source) {
            return res.status(404).json({ error: 'That version no longer exists.' })
        }
        const sourceQuestions = [...(source.screening_questions || [])]
            .filter((question) => !question.deprecated_at)
            .sort((a, b) => a.order - b.order)
        const result = await publishSnapshot(sourceQuestions)
        res.status(201).json(result)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

module.exports = {
    getItems,
    createItem,
    restoreItem,
    renameItem,
    copyItem,
}
