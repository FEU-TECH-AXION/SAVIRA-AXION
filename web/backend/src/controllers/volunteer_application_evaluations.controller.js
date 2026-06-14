const VolunteerApplicationEvaluationsModel = require('../models/volunteer_application_evaluations.model')
const supabase = require('../config/supabase')

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationEvaluationsModel.getAll()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const item = await VolunteerApplicationEvaluationsModel.create(req.body)
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function average(values) {
    const nums = values.map(Number).filter((n) => Number.isFinite(n))
    if (nums.length === 0) return 0
    return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

function aggregateEssay(rows = []) {
    return {
        alignment: average(rows.map((row) => row.alignment).filter((n) => n !== null && n !== undefined)),
        maturity: average(rows.map((row) => row.maturity).filter((n) => n !== null && n !== undefined)),
        commitment: average(rows.map((row) => row.commitment).filter((n) => n !== null && n !== undefined)),
        clarity: average(rows.map((row) => row.clarity).filter((n) => n !== null && n !== undefined)),
        experience: average(rows.map((row) => row.experience).filter((n) => n !== null && n !== undefined)),
        evaluator_count: rows.length,
    }
}

const upsertEvaluationByEvaluator = async (id, evaluatorId, payload) => {
    let query = supabase
        .from('volunteer_application_evaluations')
        .select('volunteer_application_evaluation_id')
        .eq('volunteer_application_id', id)

    if (evaluatorId) query = query.eq('evaluated_by', evaluatorId)
    else query = query.is('evaluated_by', null)

    const { data: existing, error: existingError } = await query.maybeSingle()
    if (existingError) throw existingError

    if (existing) {
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .update(payload)
            .eq('volunteer_application_evaluation_id', existing.volunteer_application_evaluation_id)
            .select()
            .single()
        if (error) throw error
        return data
    }

    const { data, error } = await supabase
        .from('volunteer_application_evaluations')
        .insert([{ volunteer_application_id: parseInt(id), evaluated_by: evaluatorId, ...payload }])
        .select()
        .single()
    if (error) throw error
    return data
}

const getEssayEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const evaluatorId = req.user?.id || req.query.evaluated_by || null
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .select('*')
            .eq('volunteer_application_id', id)
        if (error) throw error

        const current = evaluatorId
            ? (data || []).find((row) => row.evaluated_by === evaluatorId)
            : (data || [])[0]

        res.status(200).json({
            ...(current || {}),
            notes: current?.essay_notes || '',
            aggregate: aggregateEssay(data || []),
            evaluations: data || [],
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const saveEssayEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const { alignment, maturity, commitment, clarity, experience, notes } = req.body
        const evaluatorId = req.user?.id || req.body.evaluated_by || null

        const data = await upsertEvaluationByEvaluator(id, evaluatorId, {
            alignment,
            maturity,
            commitment,
            clarity,
            experience,
            essay_notes: notes,
            updated_at: new Date(),
        })
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getInterviewEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const evaluatorId = req.user?.id || req.query.evaluated_by || null
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .select('interview_score, interview_notes, evaluated_by')
            .eq('volunteer_application_id', id)
        if (error) throw error

        const current = evaluatorId
            ? (data || []).find((row) => row.evaluated_by === evaluatorId)
            : (data || [])[0]

        const scoredRows = (data || []).filter((row) => row.interview_score !== null && row.interview_score !== undefined)
        res.status(200).json({
            score: current?.interview_score || 0,
            notes: current?.interview_notes || '',
            aggregate: {
                score: average(scoredRows.map((row) => row.interview_score)),
                evaluator_count: scoredRows.length,
            },
            evaluations: data || [],
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const saveInterviewEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const { score, notes } = req.body
        const evaluatorId = req.user?.id || req.body.evaluated_by || null

        const data = await upsertEvaluationByEvaluator(id, evaluatorId, {
            interview_score: score,
            interview_notes: notes,
            updated_at: new Date(),
        })
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

module.exports = {
    getItems,
    createItem,
    getEssayEvaluation,
    saveEssayEvaluation,
    getInterviewEvaluation,
    saveInterviewEvaluation,
}
