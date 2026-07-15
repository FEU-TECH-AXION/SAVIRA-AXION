export const COMPLAINANT_PORTAL_ROLES = ["user", "complainant"];

export const COMPLAINANT_PORTAL_ERROR =
  "This sign-in portal is only available to complainant/user accounts.";

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export function isComplainantPortalRole(role) {
  return COMPLAINANT_PORTAL_ROLES.includes(normalizeRole(role));
}
