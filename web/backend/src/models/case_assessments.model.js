const supabase = require('../config/supabase')

const getAll = async () => {
  const { data, error } = await supabase.from('case_assessments').select('*')
  if (error) throw error
  return data
}

// Fetch all assessments for a specific case report — used when
// loading the Case Management tab to show prior assessments
const getByCaseReport = async (caseReportId) => {
  const { data, error } = await supabase
    .from('case_assessments')
    .select(`
      *,
      case_status_history (
        display_id,
        approval_status,
        approved_at,
        case_status ( case_status_name )
      )
    `)
    .eq('case_report_id', caseReportId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Fetch a single assessment by the linked history row — useful
// for the admin approval panel to show what the officer filled in
const getByHistoryId = async (statusHistoryId) => {
  const { data, error } = await supabase
    .from('case_assessments')
    .select('*')
    .eq('status_history_id', statusHistoryId)
    .maybeSingle()
  if (error) throw error
  return data
}

const create = async (payload) => {
  const { data, error } = await supabase
    .from('case_assessments')
    .insert([payload])
    .select()
  if (error) throw error
  return data[0]
}

// Used when admin approves/rejects — lets the assessment record
// reflect the final outcome alongside the history row
const updateAssessmentStatus = async (statusHistoryId, assessmentStatus) => {
  const { data, error } = await supabase
    .from('case_assessments')
    .update({ assessment_status: assessmentStatus })
    .eq('status_history_id', statusHistoryId)
    .select()
  if (error) throw error
  return data[0]
}

module.exports = { getAll, getByCaseReport, getByHistoryId, create, updateAssessmentStatus }