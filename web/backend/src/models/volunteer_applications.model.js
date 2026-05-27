const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
};

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .update(payload)
        .eq('volunteer_application_id', id)
        .select()
    if (error) throw error
    return data[0]
}

const getByEmail = async (email) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
    if (error) throw error
    return data                                                                                                                                                                                                                                                
}

module.exports = { getAll, create, update, getByEmail }