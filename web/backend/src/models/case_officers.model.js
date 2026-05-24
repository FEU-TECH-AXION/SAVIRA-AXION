const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('case_officers')
        .select(`
            case_officer_id,
            user_id,
            is_available,
            created_at,
            updated_at,
            users!inner (
                user_id,
                first_name,
                last_name,
                email,
                user_name
            )
        `)

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    // Map the nested users data to a flatter structure with full name
    return data.map(officer => ({
        case_officer_id: officer.case_officer_id,
        user_id: officer.user_id,
        is_available: officer.is_available,
        created_at: officer.created_at,
        updated_at: officer.updated_at,
        name: `${officer.users.first_name || ''} ${officer.users.last_name || ''}`.trim(),
        first_name: officer.users.first_name,
        last_name: officer.users.last_name,
        email: officer.users.email,
        user_name: officer.users.user_name,
    }))
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('case_officers')
        .insert([payload])
        .select()
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

module.exports = { getAll, create }