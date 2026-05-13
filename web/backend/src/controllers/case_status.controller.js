const CaseStatus = require('../models/case_status.model')

const getItems = async (req, res) => {
    try {
        const data = await CaseStatus.getAll()
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
        const item = await CaseStatus.create(req.body)

        // 201 instead of 200 to explicitly signal a resource was created
        res.status(201).json(item)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getCaseStatusByName = async (name) => {
    const { data, error } = await supabase
        .from('case_status')
        .select('case_status_id')
        .eq('status_name', name)
        .single();

    if (error) throw error;
    if (!data) throw new Error(`Case status "${name}" not found.`);
    return data;
}

module.exports = { getItems, createItem, getCaseStatusByName };