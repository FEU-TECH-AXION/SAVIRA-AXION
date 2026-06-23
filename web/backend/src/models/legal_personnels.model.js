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
                is_active,
                availability_status,
                availability_note,
                max_legal_assignments
            )
        `)
    if (error) throw error

    const personnelIds = (data || []).map((person) => person.legal_personnel_id)
    const { data: assignments, error: assignmentError } = personnelIds.length
      ? await supabase.from('legal_case_assignments')
        .select('legal_personnel_id')
        .in('legal_personnel_id', personnelIds)
        .eq('is_active', true)
      : { data: [], error: null }
    if (assignmentError) throw assignmentError
    const activeLoads = {}
    for (const assignment of assignments || []) {
      activeLoads[assignment.legal_personnel_id] = (activeLoads[assignment.legal_personnel_id] || 0) + 1
    }

    // Flatten users fields to top-level so the frontend
    // can read p.first_name directly instead of p.users.first_name
    return data
      .filter(p => p.users?.is_active !== false)
      .map(p => ({
        legal_personnel_id:   p.legal_personnel_id,
        user_id:              p.user_id,
        legal_personnel_type: p.legal_personnel_type,
        is_available:         p.is_available,
        first_name:           p.users?.first_name || "",
        last_name:            p.users?.last_name  || "",
        email:                p.users?.email      || "",
        availability_status:  p.users?.availability_status || (p.is_available ? "Available" : "Busy"),
        availability_note:    p.users?.availability_note || null,
        active_legal_assignments: activeLoads[p.legal_personnel_id] || 0,
        max_legal_assignments: p.users?.max_legal_assignments || 10,
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
