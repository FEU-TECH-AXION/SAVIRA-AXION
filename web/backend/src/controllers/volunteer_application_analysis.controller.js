const VolunteerApplicationAnalysisModel = require('../models/volunteer_application_analysis.model')
const { getAnalysisByApplicationId, createAnalysis } = require('../models/volunteer_application_analysis.model');

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationAnalysisModel.getAll()
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
        const item = await VolunteerApplicationAnalysisModel.createAnalysis(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

async function getAnalysis(req, res) {
    try {
        const { id } = req.params;
        const data = await VolunteerApplicationAnalysisModel.getAnalysisByApplicationId(id);
        return res.json({ data });
    } catch (err) {
        console.error('[getAnalysis]', err.message);
        // 404 is correct here — pending rows that don't exist yet return this,
        // which your NLPEssayTab already handles as "processing"
        return res.status(404).json({ error: 'Analysis not found.' });
    }
}

module.exports = { getItems, createItem, getAnalysis }