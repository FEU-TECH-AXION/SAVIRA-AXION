const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('volunteer_applications').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('volunteer_applicants')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('volunteer_applicants')
        .update(payload)
        .eq('id', id)
        .select()
    if (error) throw error
    return data[0]
}

const getByEmail = async (email) => {
    const { data, error } = await supabase
        .from('volunteer_applicants')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
    if (error) throw error
    return data                                                                                                                                                                                                                                                
}                   
module.exports = { getAll, create, update, getByEmail }