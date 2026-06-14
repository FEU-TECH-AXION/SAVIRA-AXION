const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('volunteer_application_assignments')
        .select(`
            assignment_id,
            volunteer_application_id,
            assessor_id,
            is_active,
            notes,
            assigned_at,
            committee_id,
            users!volunteer_application_assignments_assessor_id_fkey (
                user_id,
                first_name,
                last_name,
                email
            )
        `)
    if (error) throw error
    return data
}

const getActiveByApplication = async (volunteer_application_id) => {
    const { data, error } = await supabase
        .from('volunteer_application_assignments')
        .select(`
            assignment_id,
            assessor_id,
            is_active,
            assigned_at,
            users!volunteer_application_assignments_assessor_id_fkey (
                user_id,
                first_name,
                last_name,
                email
            )
        `)
        .eq('volunteer_application_id', volunteer_application_id)
        .eq('is_active', true)
    if (error) throw error
    return data
}

const isAlreadyAssigned = async (volunteer_application_id, assessor_id) => {
    const { data, error } = await supabase
        .from('volunteer_application_assignments')
        .select('assignment_id')
        .eq('volunteer_application_id', volunteer_application_id)
        .eq('assessor_id', assessor_id)
        .eq('is_active', true)
        .single()
    if (error && error.code !== 'PGRST116') throw error
    return !!data
}

const bulkCreate = async (assignments) => {
    const { data, error } = await supabase
        .from('volunteer_application_assignments')
        .insert(assignments)
        .select()
    if (error) throw error
    return data
}

const deactivateOne = async (volunteer_application_id, assessor_id) => {
    const { error } = await supabase
        .from('volunteer_application_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('volunteer_application_id', volunteer_application_id)
        .eq('assessor_id', assessor_id)
        .eq('is_active', true)
    if (error) throw error
}

module.exports = { getAll, getActiveByApplication, isAlreadyAssigned, bulkCreate, deactivateOne }