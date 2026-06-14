const supabase = require('../config/supabase')

const ALLOWED_FIELDS = [
  'case_type',
  'case_category',
  'also_involves',
  'referral_required',
  'referral_body',
  'assigned_paralegal',
  'endorsement_status',
  'internal_notes',
  'assigned_officer',
]

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

async function getCaseById(caseReportId) {

  // Step 1: Get the case report
  const { data: report, error } = await supabase
    .from('case_reports')
    .select('*')
    .eq('case_report_id', caseReportId)
    .eq('is_current', true)
    .maybeSingle();
  if (error) throw error;
  if (!report) return null;

  // Step 2: Get the complainant's user_id using complainant_id
  const { data: complainant, error: complainantError } = await supabase
    .from('complainants')
    .select('user_id')
    .eq('complainant_id', report.complainant_id)
    .maybeSingle();
  if (complainantError) throw complainantError;

  return {
    ...report,
    complainant_user_id: complainant?.user_id || null,
  };
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
      case_status_id,
      created_at,
      updated_at
    `)
    .eq('complainant_id', complainantId)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getAllReports() {
  // Step 1: Fetch case reports with their assignments (just IDs — avoids the
  // broken deep nested join: case_assignments → case_officers → users)
  const { data: reports, error: reportsError } = await supabase
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
      is_current,
      case_assignments (
        assignment_id,
        case_officer_id,
        is_active
      )
    `)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (reportsError) {
    console.error('[getAllReports] reports query error:', JSON.stringify(reportsError, null, 2));
    throw reportsError;
  }

  // Step 2: Fetch all officers with their user info (this join works fine from case_officers directly)
  const { data: officers, error: officersError } = await supabase
    .from('case_officers')
    .select(`
      case_officer_id,
      users!inner (
        user_id,
        first_name,
        last_name,
        email
      )
    `);

  if (officersError) {
    console.error('[getAllReports] officers query error:', JSON.stringify(officersError, null, 2));
    throw officersError;
  }

  // Build a quick lookup: case_officer_id → full name
  const officerMap = {};
  for (const o of officers || []) {
    if (o.users) {
      officerMap[o.case_officer_id] = `${o.users.first_name || ''} ${o.users.last_name || ''}`.trim();
    }
  }

  // Step 3: Merge — find the active assignment for each report and resolve the officer name
  return reports.map(report => {
    let assignedOfficer = null;
    let assignedOfficerId = null;

    if (report.case_assignments && report.case_assignments.length > 0) {
      const activeAssignment = report.case_assignments.find(a => a.is_active);
      if (activeAssignment) {
        assignedOfficerId = activeAssignment.case_officer_id;
        assignedOfficer = officerMap[assignedOfficerId] || null;
      }
    }

    return {
      ...report,
      assigned_officer: assignedOfficer,
      assigned_officer_id: assignedOfficerId,
      case_assignments: undefined, // strip nested data from response
    };
  });
}

const update = async (caseReportId, payload) => {
  // Filter out any keys not in the whitelist
  const filtered = Object.fromEntries(
    Object.entries(payload).filter(([key]) => ALLOWED_FIELDS.includes(key))
  )

  if (Object.keys(filtered).length === 0) {
    throw new Error('No valid fields to update')
  }

  const { data, error } = await supabase
    .from('case_reports')
    .update(filtered)
    .eq('case_report_id', caseReportId)
    .select()
    .single()

  if (error) throw error
  return data
}
  

module.exports = { getAll, create, getComplainantId, createReport, getReportsByUserId, getAllReports, getCaseById, update }
