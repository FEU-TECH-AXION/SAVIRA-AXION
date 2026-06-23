const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('staff')
        .select(`
            *,
            users (
                user_id,
                first_name,
                last_name,
                email,
                role_id,
                availability_status,
                availability_note,
                max_volunteer_reviews,
                max_project_assignments,
                roles (role_name)
            ),
            committees (
                committee_id,
                committee_name
            )
        `)

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    const staffRows = data || []
    const staffIds = staffRows.map((row) => row.staff_id)
    const activeTaskCounts = {}
    const activeReviewCounts = {}
    const activeProjectCounts = {}

    if (staffIds.length > 0) {
        const userIds = staffRows.map((row) => row.user_id)
        const [{ data: taskAssignments, error: taskError }, { data: reviewAssignments, error: reviewError }, { data: projects, error: projectError }] = await Promise.all([
            supabase.from('project_tasks').select('assigned_to, status').in('assigned_to', staffIds)
                .not('status', 'in', '("Completed","Cancelled")'),
            supabase.from('volunteer_application_assignments').select('assessor_id').in('assessor_id', userIds).eq('is_active', true),
            supabase.from('projects').select('project_status, project_officers, project_committee_members'),
        ])
        if (taskError) throw taskError
        if (reviewError) throw reviewError
        if (projectError) throw projectError
        for (const item of taskAssignments || []) {
            activeTaskCounts[item.assigned_to] = (activeTaskCounts[item.assigned_to] || 0) + 1
        }
        for (const item of reviewAssignments || []) {
            activeReviewCounts[item.assessor_id] = (activeReviewCounts[item.assessor_id] || 0) + 1
        }
        const staffByName = new Map(staffRows.map((row) => [
            `${row.users?.first_name || ''} ${row.users?.last_name || ''}`.trim().toLowerCase(),
            row.user_id,
        ]))
        for (const project of projects || []) {
            if (!['Upcoming', 'Active'].includes(project.project_status)) continue
            const names = [...(project.project_officers || []), ...(project.project_committee_members || [])]
            for (const name of new Set(names.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))) {
                const userId = staffByName.get(name)
                if (userId) activeProjectCounts[userId] = (activeProjectCounts[userId] || 0) + 1
            }
        }
    }

    return staffRows.map((row) => ({
        ...row,
        name: `${row.users?.first_name || ''} ${row.users?.last_name || ''}`.trim(),
        role: row.users?.roles?.role_name || 'Staff',
        availability_status: row.users?.availability_status || 'Available',
        availability_note: row.users?.availability_note || null,
        max_volunteer_reviews: row.users?.max_volunteer_reviews || 10,
        max_project_assignments: row.users?.max_project_assignments || 5,
        active_reviews: activeReviewCounts[row.user_id] || 0,
        active_projects: activeProjectCounts[row.user_id] || 0,
        active_tasks: activeTaskCounts[row.staff_id] || 0,
    }))
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('staff')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

module.exports = { getAll, create }
