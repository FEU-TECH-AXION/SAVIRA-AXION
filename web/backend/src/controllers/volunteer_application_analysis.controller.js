const VolunteerApplicationAnalysisModel = require('../models/volunteer_application_analysis.model')
const { getAnalysisByApplicationId, createAnalysis } = require('../models/volunteer_application_analysis.model');
const supabase = require('../config/supabase')
const { runVolunteerEssayAnalysis } = require('../services/volunteerNlp.service')
const {
    replaceVolunteerApplicationId,
    replaceVolunteerApplicationIdsFromDatabase,
} = require('../utils/volunteerApplicationPublicIds')

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationAnalysisModel.getAll()
        res.json(await replaceVolunteerApplicationIdsFromDatabase(data))
    } catch (err) {
        // 500 here because the failure is on our side (DB/Supabase), not the client's
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        // req.body is passed directly — input validation should be added here
        // before hitting the DB (e.g. check required fields, sanitize input)
        const item = await VolunteerApplicationAnalysisModel.createAnalysis(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(await replaceVolunteerApplicationIdsFromDatabase(item))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

async function getAnalysis(req, res) {
    try {
        const { id } = req.params;
        const data = await VolunteerApplicationAnalysisModel.getAnalysisByApplicationId(id);
        return res.json({ data: replaceVolunteerApplicationId(data, req.volunteerApplicationPublicId) });
    } catch (err) {
        console.error('[getAnalysis]', err.message);
        // 404 is correct here — pending rows that don't exist yet return this,
        // which your NLPEssayTab already handles as "processing"
        return res.status(404).json({ error: 'Analysis not found.' });
    }
}

async function retryAnalysis(req, res) {
    try {
        const { id } = req.params;
        const { data: application, error } = await supabase
            .from('volunteer_applications')
            .select('volunteer_application_id, essay_response')
            .eq('volunteer_application_id', id)
            .single();

        if (error) throw error;

        if (!application?.essay_response || application.essay_response.trim().length < 20) {
            return res.status(400).json({ error: 'Application essay is too short for NLP analysis.' });
        }

        runVolunteerEssayAnalysis({
            volunteer_application_id: application.volunteer_application_id,
            essay_response: application.essay_response,
        });

        return res.status(202).json({ message: 'NLP analysis retry started.' });
    } catch (err) {
        console.error('[retryAnalysis]', err.message);
        return res.status(500).json({ error: 'Could not retry NLP analysis.' });
    }
}

module.exports = { getItems, createItem, getAnalysis, retryAnalysis }
