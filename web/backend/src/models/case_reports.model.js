const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('case_reports').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('case_reports')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

async function getComplainantId(userId) {
  // Try to find existing complainant row
  const { data, error } = await supabase
    .from("complainants")
    .select("complainant_id")
    .eq("user_id", userId)
    .single();

  // If found, return it
  if (data) return data.complainant_id;

  // If not found, create it now
  const { data: newComplainant, error: insertError } = await supabase
    .from("complainants")
    .insert([{ user_id: userId }])
    .select("complainant_id")
    .single();

  if (insertError) throw insertError;
  return newComplainant.complainant_id;
}

async function createReport(payload) {
  const { data, error } = await supabase
    .from("case_reports")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getReportsByUserId(complainantId) {
  const { data, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      incident_description,
      incident_city,
      incident_date,
      case_status_id
    `)
    .eq('complainant_id', complainantId)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getAllReports() {
  const { data, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id,
      complainant_id,
      incident_description,
      incident_city,
      incident_province,
      incident_date,
      case_status_id,
      created_at,
      is_current
    `)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { getAll, create, getComplainantId, createReport, getReportsByUserId, getAllReports }