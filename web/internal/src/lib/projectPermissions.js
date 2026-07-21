import { normalizeRole } from "@/lib/roles";

export function isProjectManagerRole(user) {
  const role = normalizeRole(user?.role_name || user?.role);
  return role === "admin" || role === "project_officer";
}

export function isProjectAdmin(user) {
  return normalizeRole(user?.role_name || user?.role) === "admin";
}

export function isAssignedProjectOfficer(project, staff) {
  if (!project || !staff?.staff_id) return false;
  return (project.projectOfficerIds || []).some((id) => String(id) === String(staff.staff_id));
}

export function canManageProject(project, user, staff) {
  return isProjectManagerRole(user) || isAssignedProjectOfficer(project, staff);
}

export function findCurrentStaff(staffRows = [], user = null) {
  if (!user) return null;
  const userId = user.user_id || user.id;
  return (staffRows || []).find((person) => String(person.user_id) === String(userId)) || null;
}

export function projectEditPermissionMessage() {
  return "Only admins and assigned project officers can update project information. You can still update tasks assigned to you.";
}

export function friendlyProjectError(error) {
  const message = error?.message || "";
  if (error?.status === 403 || /forbidden|access denied|insufficient permissions/i.test(message)) {
    return projectEditPermissionMessage();
  }
  return message || "Unable to save project.";
}
