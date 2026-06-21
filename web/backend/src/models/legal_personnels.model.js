const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('legal_personnels')
        .select(`
            legal_personnel_id,
            user_id,
            legal_personnel_type,
            is_available,
            users (
                first_name,
                last_name,
                email,
                is_active
            )
        `)
    if (error) throw error

    // Flatten users fields to top-level so the frontend
    // can read p.first_name directly instead of p.users.first_name
    return data
      .filter(p => p.is_available && p.users?.is_active !== false)
      .map(p => ({
        legal_personnel_id:   p.legal_personnel_id,
        user_id:              p.user_id,
        legal_personnel_type: p.legal_personnel_type,
        is_available:         p.is_available,
        first_name:           p.users?.first_name || "",
        last_name:            p.users?.last_name  || "",
        email:                p.users?.email      || "",
      }))
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('legal_personnels')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

module.exports = { getAll, create }
