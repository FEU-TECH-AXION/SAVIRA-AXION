const supabase = require('../config/supabase')
const bcrypt = require('bcrypt')

const getAll = async () => {
    const { data: users, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
    if (error) throw error

    const { data: staffRows, error: staffError } = await supabase
        .from('staff')
        .select(`
            staff_id,
            user_id,
            committee_id,
            committees (
                committee_id,
                committee_name
            )
        `)
    if (staffError) throw staffError

    const staffByUserId = new Map((staffRows || []).map((row) => [row.user_id, row]))

    return (users || []).map((user) => ({
        ...user,
        staff: staffByUserId.get(user.user_id) || null,
    }))
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
        .select('*, roles(role_name)')
        .eq('email', email)
        .single()
    if (error || !data) return null;

    return { ...data, role_name: data.roles?.role_name };
}

const findByUsername = async (username) => {
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('user_name', username)
        .single()
    if (error || !data) return null;

    return { ...data, role_name: data.roles?.role_name };
}

const findById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('user_id', id)
        .single()
    if (error || !data) return null;

    return { ...data, role_name: data.roles?.role_name };
}

module.exports = { getAll, create, login, findByEmail, findByUsername, findById }
