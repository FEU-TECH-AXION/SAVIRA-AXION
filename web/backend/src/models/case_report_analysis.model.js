const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('case_report_analysis').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('case_report_analysis')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

// Get analysis by case report ID
async function getAnalysisByReportId(caseReportId) {
    const { data, error } = await supabase
        .from('case_report_analysis')
        .select('*')
        .eq('case_report_id', caseReportId)
        .order('analysis_id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No analysis found');
    return data;
}

// Update status (pending → completed or failed)
async function updateAnalysisStatus(caseReportId, status) {
    const { data, error } = await supabase
        .from('case_report_analysis')
        .update({ status })
        .eq('case_report_id', caseReportId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update analysis by report ID with full data
async function updateAnalysisByReportId(caseReportId, updates) {
    const { data, error } = await supabase
        .from('case_report_analysis')
        .update(updates)
        .eq('case_report_id', caseReportId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function updateAnalysisById(analysisId, updates) {
    const { data, error } = await supabase
        .from('case_report_analysis')
        .update(updates)
        .eq('analysis_id', analysisId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = { getAll, create, getAnalysisByReportId, updateAnalysisStatus, updateAnalysisByReportId, updateAnalysisById }
