const VolunteerApplicationEvaluationsModel = require('../models/volunteer_application_evaluations.model')
const supabase = require('../config/supabase')

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationEvaluationsModel.getAll()
        res.json(data)
    } catch (err) {
        // 500 here because the failure is on our side (DB/Supabase), not the client's
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        // req.body is passed directly — input validation should be added here
        // before hitting the DB (e.g. check required fields, sanitize input)
        const item = await VolunteerApplicationEvaluationsModel.create(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getEssayEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .select('*')
            .eq('volunteer_application_id', id)
            .maybeSingle()
        if (error) throw error
        res.status(200).json(data || {})
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const saveEssayEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        console.log('saveEssayEvaluation called, id:', id)
        console.log('body:', req.body)
        const { alignment, maturity, commitment, clarity, experience, notes } = req.body

        // Upsert — create if not exists, update if exists
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .upsert({
                volunteer_application_id: parseInt(id),
                alignment,
                maturity,
                commitment,
                clarity,
                experience,
                essay_notes: notes,
                updated_at:  new Date(),
            }, { onConflict: 'volunteer_application_id' })
            .select()
            .single()

            console.log('upsert data:', data)   // ← add
            console.log('upsert error:', error) // ← add

        if (error) throw error
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getInterviewEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .select('interview_score, interview_notes')
            .eq('volunteer_application_id', id)
            .maybeSingle()
        if (error) throw error
        res.status(200).json(data ? { score: data.interview_score, notes: data.interview_notes } : {})
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const saveInterviewEvaluation = async (req, res) => {
    try {
        const { id } = req.params
        const { score, notes } = req.body

        const { data, error } = await supabase
            .from('volunteer_application_evaluations')
            .upsert({
                volunteer_application_id: parseInt(id),
                interview_score: score,
                interview_notes: notes,
                updated_at:      new Date(),
            }, { onConflict: 'volunteer_application_id' })
            .select()
            .single()

        if (error) throw error
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

module.exports = { getItems, createItem, 
                    getEssayEvaluation, saveEssayEvaluation, 
                    getInterviewEvaluation, saveInterviewEvaluation }