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

    console.log('DATA:', JSON.stringify(data));
    console.log('ERROR:', JSON.stringify(error));

    if (error || !data) throw new Error('Invalid email or password');

    const match = await bcrypt.compare(password, data.password);
    console.log('MATCH:', match);

    if (!match) throw new Error('Invalid email or password');

    return data;
};

module.exports = { getAll, create, login }