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
                user_name,
                availability_status,
                availability_note,
                max_active_cases
            )
        `)

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    const officerIds = (data || []).map((officer) => officer.case_officer_id)
    const { data: assignments, error: assignmentError } = officerIds.length
      ? await supabase.from('case_assignments')
        .select('case_officer_id')
        .in('case_officer_id', officerIds)
        .eq('is_active', true)
      : { data: [], error: null }
    if (assignmentError) throw assignmentError
    const activeLoads = {}
    for (const assignment of assignments || []) {
        activeLoads[assignment.case_officer_id] = (activeLoads[assignment.case_officer_id] || 0) + 1
    }

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
        availability_status: officer.users.availability_status || (officer.is_available ? 'Available' : 'Busy'),
        availability_note: officer.users.availability_note || null,
        active_case_count: activeLoads[officer.case_officer_id] || 0,
        max_active_cases: officer.users.max_active_cases || 10,
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
