const supabase = require('../config/supabase')
const bcrypt = require('bcrypt')

const getAll = async () => {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select()
    if (error) throw error
    return data[0]
}

const login = async (email, password) => {
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
        .single();

    if (error || !data) throw new Error('Invalid email or password');

    const match = await bcrypt.compare(password, data.password);
    if (!match) throw new Error('Invalid email or password');

    return data;
};

const findByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
    if (error && error.code !== 'PGRST116') throw error
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

module.exports = { getAll, create, login, findByEmail, findByUsername }