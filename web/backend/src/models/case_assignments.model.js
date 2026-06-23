const supabase = require('../config/supabase')

const assignCaseToOfficer = async (caseReportId, caseOfficerId, assignedBy) => {
    // First, deactivate any existing active assignments for this case
    const { error: deactivateError } = await supabase
        .from('case_assignments')
        .update({ is_active: false })
        .eq('case_report_id', caseReportId)
        .eq('is_active', true);

    if (deactivateError) throw deactivateError;

    // Create new assignment
    const { data, error } = await supabase
        .from('case_assignments')
        .insert([{
            case_report_id: caseReportId,
            case_officer_id: caseOfficerId,
            assigned_by: assignedBy,
            is_active: true,
        }])
        .select();

    if (error) throw error;
    return data[0];
};

const getAssignmentsByCaseId = async (caseReportId) => {
    const { data, error } = await supabase
        .from('case_assignments')
        .select(`
            assignment_id,
            case_officer_id,
            assigned_by,
            assigned_at,
            is_active,
            case_officers (
                case_officer_id,
                users (
                    first_name,
                    last_name,
                    email
                )
            )
        `)
        .eq('case_report_id', caseReportId)
        .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data;
};

const getAssignmentsByOfficerId = async (caseOfficerId) => {
    const { data, error } = await supabase
        .from('case_assignments')
        .select(`
            case_report_id,
            assignment_id,
            assigned_at
        `)
        .eq('case_officer_id', caseOfficerId)
        .eq('is_active', true);

    if (error) throw error;
    return data.map(a => a.case_report_id);
};

// Check if this person is already actively assigned to this case
const isAlreadyAssigned = async (case_report_id, case_officer_id) => {
    const { data, error } = await supabase
        .from('case_assignments')
        .select('assignment_id')
        .eq('case_report_id', case_report_id)
        .eq('case_officer_id', case_officer_id)
        .eq('is_active', true)
        .single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
    return !!data
}

const bulkCreate = async (assignments) => {
    const { data, error } = await supabase
        .from('case_assignments')
        .insert(assignments)
        .select()
    if (error) throw error
    return data
}

const deactivateOne = async (case_report_id, case_officer_id) => {
    const { data, error } = await supabase
        .from('case_assignments')
        .update({ is_active: false })
        .eq('case_report_id', case_report_id)
        .eq('case_officer_id', case_officer_id)
        .eq('is_active', true)
        .select('assignment_id')

    if (error) throw error
    return data || []
}

module.exports = { assignCaseToOfficer, getAssignmentsByCaseId, getAssignmentsByOfficerId, bulkCreate, isAlreadyAssigned, deactivateOne };
