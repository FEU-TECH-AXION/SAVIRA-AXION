const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('legal_personnels')
        .select(`
            legal_personnel_id,
            legal_personnel_type,
            is_available,
            users (
                first_name,
                last_name,
                email
            )
        `)
    if (error) throw error

    // Flatten so first_name/last_name are top-level,
    // matching what the frontend expects
    return data.map(p => ({
        legal_personnel_id:   p.legal_personnel_id,
        legal_personnel_type: p.legal_personnel_type,
        is_available:         p.is_available,
        first_name:           p.users?.first_name || "",
        last_name:            p.users?.last_name  || "",
        email:                p.users?.email      || "",
    }))
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('legal_case_assignments')
        .insert([payload])
        .select()
    if (error) throw error
    return data[0]
}

// Deactivates one specific person from a case (for unassign)
const deactivateOne = async (case_report_id, legal_personnel_id) => {
    const { error } = await supabase
        .from('legal_case_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('case_report_id', case_report_id)
        .eq('legal_personnel_id', legal_personnel_id)
        .eq('is_active', true)
    if (error) throw error
}

// Check if this person is already actively assigned to this case
const isAlreadyAssigned = async (case_report_id, legal_personnel_id) => {
    const { data, error } = await supabase
        .from('legal_case_assignments')
        .select('legal_case_assignment_id')
        .eq('case_report_id', case_report_id)
        .eq('legal_personnel_id', legal_personnel_id)
        .eq('is_active', true)
        .single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
    return !!data
}

// Returns all active assignments for a case joined with personnel + user info
const getActiveByCase = async (case_report_id) => {
    const { data, error } = await supabase
        .from('legal_case_assignments')
        .select(`
            legal_case_assignment_id,
            assignment_role,
            assigned_at,
            notes,
            legal_personnels (
                legal_personnel_id,
                legal_personnel_type,
                users (
                    first_name,
                    last_name,
                    email
                )
            )
        `)
        .eq('case_report_id', case_report_id)
        .eq('is_active', true)
        .order('assignment_role')
    if (error) throw error
    return data
}

module.exports = { getAll, create, deactivateOne, isAlreadyAssigned, getActiveByCase }