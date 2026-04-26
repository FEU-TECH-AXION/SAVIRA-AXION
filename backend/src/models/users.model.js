const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('users').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

const findByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .single()
    if (error && error.code !== 'PGRST116') throw error
    // PGRST116 = no rows found — that's fine, means email is available
    return data
}

const findByUsername = async (username) => {
    const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_name', username)
        .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
}

module.exports = { getAll, create, findByEmail, findByUsername }