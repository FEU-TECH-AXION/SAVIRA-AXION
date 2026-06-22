const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('volunteer_application_analysis').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

async function createAnalysis(data) {
    const { data: row, error } = await supabase
        .from('volunteer_application_analysis')
        .insert([data])
        .select()
        .single();

    if (error) throw error;
    return row;
}

async function updateAnalysisByApplicationId(volunteerApplicationId, updates) {
    
    const { data, error } = await supabase
        .from('volunteer_application_analysis')
        .update(updates)
        .eq('volunteer_application_id', volunteerApplicationId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function getAnalysisByApplicationId(volunteerApplicationId) {
    const { data, error } = await supabase
        .from('volunteer_application_analysis')
        .select('*')
        .eq('volunteer_application_id', volunteerApplicationId)
        .single();

    if (error) throw error;
    return data;
}

module.exports = { getAll, createAnalysis, updateAnalysisByApplicationId, getAnalysisByApplicationId }