const supabase = require('../config/supabase')
const bcrypt = require('bcrypt')

function isMissingColumnError(error, column) {
    const message = String(error?.message || '')
    return (
        error?.code === 'PGRST204' &&
        message.includes(`'${column}'`) &&
        message.includes('schema cache')
    )
}

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

    const { data: legalRows, error: legalError } = await supabase
        .from('legal_personnels')
        .select('legal_personnel_id, user_id, legal_personnel_type, is_available')
    if (legalError) throw legalError

    const legalByUserId = new Map((legalRows || []).map((row) => [row.user_id, row]))

    return (users || []).map((user) => ({
        ...user,
        staff: staffByUserId.get(user.user_id) || null,
        legal_personnel: legalByUserId.get(user.user_id) || null,
    }))
}

const create = async (payload) => {
    let { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select()

    if (error && isMissingColumnError(error, 'must_change_password')) {
        const { must_change_password, ...compatiblePayload } = payload
        const retry = await supabase
            .from('users')
            .insert([compatiblePayload])
            .select()
        data = retry.data
        error = retry.error
    }

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
