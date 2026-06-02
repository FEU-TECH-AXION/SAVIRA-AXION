const supabase = require('../config/supabase')

const getAll = async (filters = {}) => {
    let query = supabase
        .from('interviews')
        .select(`
            *,
            slot:interview_slots(slot_id, slot_date, slot_time, duration_minutes),
            interviewee:users!interviews_interviewee_user_id_fkey(user_id, first_name, last_name, email),
            interviewer:users!interviews_interviewer_user_id_fkey(user_id, first_name, last_name, email)
        `)

    if (filters.type)               query = query.eq('type', filters.type)
    if (filters.status)             query = query.eq('status', filters.status)
    if (filters.interviewer_user_id) query = query.eq('interviewer_user_id', filters.interviewer_user_id)
    if (filters.case_report_id)     query = query.eq('case_report_id', filters.case_report_id)
    if (filters.volunteer_application_id) query = query.eq('volunteer_application_id', filters.volunteer_application_id)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
}

const getById = async (id) => {
    const { data, error } = await supabase
        .from('interviews')
        .select(`
            *,
            slot:interview_slots(slot_id, slot_date, slot_time, duration_minutes),
            interviewee:users!interviews_interviewee_user_id_fkey(user_id, first_name, last_name, email),
            interviewer:users!interviews_interviewer_user_id_fkey(user_id, first_name, last_name, email)
        `)
        .eq('interview_id', id)
        .single()
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('interviews')
        .insert([payload])
        .select()
    if (error) throw error
    return data[0]
}

// Generic internal updater — used by all status transition functions
const updateById = async (id, payload) => {
    const { data, error } = await supabase
        .from('interviews')
        .update(payload)
        .eq('interview_id', id)
        .select()
    if (error) throw error
    return data[0]
}

const selectSlot = async (id, slot_id) => {
    return updateById(id, {
        selected_slot_id: slot_id,
        status: 'scheduled',
    })
}

const confirm = async (id, meeting_link) => {
    return updateById(id, {
        meeting_link,
        status: 'confirmed',
    })
}

const complete = async (id) => {
    return updateById(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
    })
}

const cancel = async (id, cancellation_reason) => {
    return updateById(id, {
        status: 'cancelled',
        cancellation_reason,
    })
}

const reject = async (id, rejection_reason) => {
    return updateById(id, {
        status: 'rejected',
        rejection_reason,
    })
}

// Called by the expiry cron job — marks all invited interviews
// past their slot_expires_at as expired
const expireStale = async () => {
    const { data, error } = await supabase
        .from('interviews')
        .update({ status: 'expired' })
        .eq('status', 'invited')
        .lt('slot_expires_at', new Date().toISOString())
        .select()
    if (error) throw error
    return data
}

module.exports = {
    getAll,
    getById,
    create,
    selectSlot,
    confirm,
    complete,
    cancel,
    reject,
    expireStale,
}