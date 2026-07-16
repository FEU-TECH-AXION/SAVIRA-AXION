const supabase = require('../config/supabase')
const { resolveActors, withActor } = require('../utils/actor')

const attachActors = async (logs = []) => {
    const userIds = [...new Set(logs.map((log) => log.performed_by_user_id).filter(Boolean))]
    if (userIds.length === 0) return logs

    const actorsById = await resolveActors(userIds)
    return logs.map((log) =>
        withActor(log, actorsById[log.performed_by_user_id], {
            idField: 'performed_by_user_id',
            nameField: 'performed_by_name',
            roleField: 'performed_by_role',
        })
    )
}

const getAll = async () => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('*')
        .order('performed_at', { ascending: false })

    if (error) throw error

    return attachActors(data || [])
}

const getByCaseReport = async (caseReportId) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('*')
        .eq('case_report_id', caseReportId)
        .order('performed_at', { ascending: false })
    if (error) throw error

    return attachActors(data || [])
}

const getById = async (id) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('case_report_log_id, case_report_id, action_type')
        .eq('case_report_log_id', id)
        .maybeSingle()
    if (error) throw error
    return data
}

const getPublicByCaseReport = async (caseReportId) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('case_report_log_id, action_type, public_message, performed_by_user_id, performed_at')
        .eq('case_report_id', caseReportId)
        .eq('is_public', true)
        .neq('action_type', 'internal_note')
        .order('performed_at', { ascending: false })
    if (error) throw error

    return attachActors(data || [])
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .insert([{
            ...payload,
            performed_at: payload.performed_at || new Date().toISOString(),
        }])
        .select()
    if (error) throw error

    const [item] = await attachActors(data || [])
    return item
}

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .update(payload)
        .eq('case_report_log_id', id)
        .select()
    if (error) throw error

    const [item] = await attachActors(data || [])
    return item
}

const remove = async (id) => {
    const { error } = await supabase
        .from('case_report_logs')
        .delete()
        .eq('case_report_log_id', id)
    if (error) throw error
    return true
}

module.exports = { getAll, getByCaseReport, getById, getPublicByCaseReport, create, update, remove }
