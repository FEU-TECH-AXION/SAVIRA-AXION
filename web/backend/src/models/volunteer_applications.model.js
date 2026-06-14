const supabase = require('../config/supabase')

const getAll = async ({ userId, role } = {}) => {
    let query = supabase
        .from('volunteer_applications')
        .select(`
            *,
            volunteer_applicants (
                user_id
            ),
            volunteer_application_assignments (
                assignment_id,
                assessor_id,
                is_active,
                users!volunteer_application_assignments_assessor_id_fkey (
                    user_id,
                    first_name,
                    last_name,
                    email
                )
            )
        `)

    // If staff, only return applications assigned to them
    if (role === 'staff') {
        const { data: assignments, error: assignError } = await supabase
            .from('volunteer_application_assignments')
            .select('volunteer_application_id')
            .eq('assessor_id', userId)
            .eq('is_active', true)

        if (assignError) throw assignError

        const assignedIds = (assignments || []).map(a => a.volunteer_application_id)

        if (assignedIds.length === 0) return [] // staff has no assignments yet

        query = query.in('volunteer_application_id', assignedIds)
    }

    const { data, error } = await query
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
};

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .update(payload)
        .eq('volunteer_application_id', id)
        .select()
    if (error) throw error
    return data[0]
}

const getByEmail = async (email) => {
    const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
    if (error) throw error
    return data                                                                                                                                                                                                                                                
}

module.exports = { getAll, create, update, getByEmail }
