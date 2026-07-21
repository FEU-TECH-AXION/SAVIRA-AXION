export const INTERNAL_ROLES = ["admin", "case_officer", "legal", "staff", "project_officer"];

export const ROLE_HOME = {
  admin: "/dashboard",
  case_officer: "/dashboard",
  legal: "/dashboard",
  staff: "/dashboard",
  project_officer: "/dashboard",
};

export const ROUTE_PERMISSIONS = {
  "/dashboard": ["admin", "case_officer", "legal", "staff", "project_officer"],
  "/admin": ["admin"],
  "/caseInterviews": ["case_officer", "admin"],
  "/cases": ["case_officer", "admin"],
  "/legal": ["legal", "admin"],
  "/legalReviews": ["legal", "admin"],
  "/staff": ["staff", "admin"],
  "/users": ["admin"],
  "/projects": ["staff", "admin", "project_officer"],
  "/projectTasks": ["staff", "admin", "project_officer"],
  "/staffAvailability": ["admin"],
  "/volunteerRanking": ["staff", "admin"],
  "/volunteer": ["staff", "admin"],
  "/reportGenerator": ["admin"],
};

export function normalizeRole(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (normalized === "case_officer") return "case_officer";
  if (normalized === "legal_personnel") return "legal";
  if (normalized === "legal") return "legal";
  if (normalized === "staff") return "staff";
  if (normalized === "admin") return "admin";
  if (normalized === "project_officer") return "project_officer";

  return normalized;
}

export function isInternalRole(role) {
  return INTERNAL_ROLES.includes(normalizeRole(role));
}

export function getRoleHome(role) {
  return ROLE_HOME[normalizeRole(role)] || "/login";
}

export function getAllowedRolesForPath(pathname) {
  const match = Object.keys(ROUTE_PERMISSIONS).find((path) => (
    pathname === path || pathname.startsWith(`${path}/`)
  ));

  return match ? ROUTE_PERMISSIONS[match] : null;
}

export function canAccessPath(role, pathname) {
  const allowedRoles = getAllowedRolesForPath(pathname);
  if (!allowedRoles) return true;

  return allowedRoles.includes(normalizeRole(role));
}
