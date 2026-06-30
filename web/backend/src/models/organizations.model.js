const supabase = require('../config/supabase')

async function findOrCreateOrganization(complainant) {
  const isScoutOrg =
    complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
    complainant.organization === "Girl Scouts of the Philippines (GSP)" ||
    complainant.organization === "BSP" ||
    complainant.organization === "GSP";
  const isOthers = complainant.organization === "Others" || complainant.organization === "Other";
  const isIndependent = complainant.organization === "No Organization / Independent";
  const organizationName = complainant.organizationName ?? complainant.orgName ?? null;
  const organizationCity = complainant.organizationCity ?? complainant.orgCity ?? null;

  // Build match query based on org type to prevent exact duplicates
  let matchQuery = supabase
    .from("organizations")
    .select("organization_id")
    .eq("organization", complainant.organization);

  if (isScoutOrg) {
    matchQuery = matchQuery.eq("council", complainant.council ?? "");
  }

  if (isOthers) {
    matchQuery = matchQuery
      .eq("organization_type", complainant.organizationType ?? "")
      .eq("organization_name",          organizationName          ?? "")
      .eq("organization_city",          organizationCity          ?? "");
  }

  const { data: existing } = await matchQuery.maybeSingle();

  // Reuse existing org if found
  if (existing) return existing;

  // Otherwise insert new row
  const { data, error } = await supabase
    .from("organizations")
    .insert([{
      organization:            complainant.organization,
      organization_type:       isOthers   ? complainant.organizationType       ?? null : null,
      organization_type_other: isOthers && complainant.organizationType === "Other"
                                          ? complainant.organizationTypeOther  ?? null : null,
      organization_name:       isOthers   ? organizationName                           : null,
      organization_city:       isOthers   ? organizationCity                           : null,
      user_city:               isOthers || isIndependent ? complainant.userCity ?? null : null,
      council:                 isScoutOrg ? complainant.council                ?? null : null,
      region:                  isScoutOrg ? "National Capital Region (NCR)"          : null,
    }])
    .select("organization_id")
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findOrCreateOrganization };
