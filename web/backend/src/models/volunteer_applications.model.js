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
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

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