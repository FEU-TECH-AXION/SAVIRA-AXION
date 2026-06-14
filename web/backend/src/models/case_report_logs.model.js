const supabase = require('../config/supabase')

const attachUserNames = async (logs = []) => {
    const userIds = [...new Set(logs.map((log) => log.performed_by_user_id).filter(Boolean))]
    if (userIds.length === 0) return logs

    const { data: users, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds)
    if (error) throw error

    const userMap = {}
    for (const user of users || []) {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
        userMap[user.user_id] = name || user.email || 'Unknown user'
    }

    return logs.map((log) => ({
        ...log,
        performed_by_name: userMap[log.performed_by_user_id] || null,
    }))
}

const getAll = async () => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('*')
        .order('performed_at', { ascending: false })

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return attachUserNames(data || [])
}

const getByCaseReport = async (caseReportId) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .select('*')
        .eq('case_report_id', caseReportId)
        .order('performed_at', { ascending: false })
    if (error) throw error

    return attachUserNames(data || [])
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .insert([{
            ...payload,
            performed_at: payload.performed_at || new Date().toISOString(),
        }])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    const [item] = await attachUserNames(data || [])
    return item
}

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('case_report_logs')
        .update(payload)
        .eq('case_report_log_id', id)
        .select()
    if (error) throw error

    const [item] = await attachUserNames(data || [])
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

module.exports = { getAll, getByCaseReport, create, update, remove }
