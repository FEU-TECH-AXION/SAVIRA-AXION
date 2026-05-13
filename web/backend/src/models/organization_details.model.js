const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase.from('organization_details').select('*')

    // Supabase returns error as a value, not an exception — we throw it
    // manually so controllers can handle it in a uniform try/catch
    if (error) throw error

    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('organization_details')
        .insert([payload])
        .select() // Without .select(), Supabase returns null instead of the new row
    if (error) throw error

    // We only insert one row at a time, so we unwrap the array here
    // instead of forcing every caller to do data[0]
    return data[0]
}

async function createOrgDetail(complainant) {
  const isScoutOrg =
    complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
    complainant.organization === "Girl Scouts of the Philippines (GSP)";
  const isOthersOrg = complainant.organization === "Others";

  const { data, error } = await supabase
    .from("organization_details")
    .insert([{
      organization:            complainant.organization,
      organization_type:       isOthersOrg ? complainant.organizationType       || null : null,
      organization_type_other: isOthersOrg && complainant.organizationType === "Other"
                                            ? complainant.organizationTypeOther || null : null,
      council:                 isScoutOrg  ? complainant.council                || null : null,
      region:                  isScoutOrg  ? "National Capital Region (NCR)"          : null,
      organization_name:       isOthersOrg ? complainant.orgName                || null : null,
      organization_city:       isOthersOrg ? complainant.orgCity                || null : null,
      user_city:               isOthersOrg ? complainant.userCity               || null : null,
      user_province:           "Metro Manila",
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { getAll, create, createOrgDetail }