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

const selectSlot = async (id, slot_id, notes = null) => {
    const payload = {
        selected_slot_id: slot_id,
        status: 'scheduled',
        availability_requested: false,
        availability_request_reason: null,
    }
    if (notes !== null) payload.notes = notes
    return updateById(id, payload)
}

const reschedule = async (id, slot_id, reason, status = 'scheduled') => {
    const payload = {
        selected_slot_id: slot_id,
        meeting_link: null,
        notes: null,
        status,
        availability_requested: false,
        availability_request_reason: null,
        reschedule_reason: reason,
        reschedule_requires_response: true,
        reschedule_responded_at: null,
    }

    try {
        return await updateById(id, payload)
    } catch (error) {
        const violatesStatusConstraint =
            status === 'rescheduled' &&
            (error?.code === '23514' || String(error?.message || '').includes('interviews_status_check'))

        if (!violatesStatusConstraint) throw error

        return updateById(id, {
            ...payload,
            status: 'scheduled',
        })
    }
}

const acceptReschedule = async (id) => {
    return updateById(id, {
        status: 'scheduled',
        reschedule_requires_response: false,
        reschedule_responded_at: new Date().toISOString(),
    })
}

const requestNewSlots = async (id, reason) => {
    return updateById(id, {
        selected_slot_id: null,
        meeting_link: null,
        status: 'awaiting_new_slots',
        availability_requested: true,
        availability_request_reason: reason,
        reschedule_requires_response: false,
        reschedule_responded_at: new Date().toISOString(),
    })
}

const reopenSelection = async (id, slotExpiresAt) => {
    return updateById(id, {
        selected_slot_id: null,
        meeting_link: null,
        status: 'invited',
        invited_at: new Date().toISOString(),
        slot_expires_at: slotExpiresAt,
        availability_requested: false,
        availability_request_reason: null,
    })
}

const confirm = async (id, meeting_link) => {
    return updateById(id, {
        meeting_link,
        status: 'confirmed',
        reschedule_requires_response: false,
        reschedule_responded_at: new Date().toISOString(),
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
        reschedule_requires_response: false,
        reschedule_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
}

const unassignStaff = async (id) => {
    return updateById(id, {
        interviewer_user_id: null,
        updated_at: new Date().toISOString(),
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
    reschedule,
    acceptReschedule,
    requestNewSlots,
    reopenSelection,
    confirm,
    complete,
    cancel,
    unassignStaff,
    reject,
    expireStale,
}
