const supabase = require('../config/supabase')

const getAll = async (filters = {}) => {
    let query = supabase
        .from('interview_slots')
        .select(`
            *,
            creator:users!interview_slots_created_by_fkey(user_id, first_name, last_name)
        `)

    if (filters.slot_type)    query = query.eq('slot_type', filters.slot_type)
    if (filters.created_by)   query = query.eq('created_by', filters.created_by)
    if (filters.is_available !== undefined) query = query.eq('is_available', filters.is_available)

    // Only return slots from today onwards
    const today = new Date().toISOString().split('T')[0]
    query = query.gte('slot_date', today)

    const { data, error } = await query.order('slot_date').order('slot_time')
    if (error) throw error
    return data
}

const getById = async (id) => {
    const { data, error } = await supabase
        .from('interview_slots')
        .select('*')
        .eq('slot_id', id)
        .single()
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('interview_slots')
        .insert([payload])
        .select()
    if (error) throw error
    return data[0]
}

// Bulk insert for recurring slot generation
const createMany = async (payloads) => {
    const { data, error } = await supabase
        .from('interview_slots')
        .insert(payloads)
        .select()
    if (error) throw error
    return data
}

const markUnavailable = async (id) => {
    const { data, error } = await supabase
        .from('interview_slots')
        .update({ is_available: false })
        .eq('slot_id', id)
        .select()
    if (error) throw error
    return data[0]
}

const markAvailable = async (id) => {
    const { data, error } = await supabase
        .from('interview_slots')
        .update({ is_available: true })
        .eq('slot_id', id)
        .select()
    if (error) throw error
    return data[0]
}

const deleteById = async (id) => {
    const { error } = await supabase
        .from('interview_slots')
        .delete()
        .eq('slot_id', id)
    if (error) throw error
    return { deleted: true }
}

module.exports = {
    getAll,
    getById,
    create,
    createMany,
    markUnavailable,
    markAvailable,
    deleteById,
}
