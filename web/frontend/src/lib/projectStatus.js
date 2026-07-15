const STATUS_OVERRIDES = ["Postponed", "Cancelled"];

function toDateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value).split("T")[0];
}

export function parseDate(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOverride(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return STATUS_OVERRIDES.find((status) => status.toLowerCase() === normalized) || "";
}

export function getProjectStatusOverride(project) {
  return normalizeOverride(project?.statusOverride || project?.status_override || project?.status || project?.project_status);
}

export function computeProjectStatus(project, todayValue = new Date()) {
  const override = getProjectStatusOverride(project);
  if (override) return override;

  const dateStart = parseDate(project?.dateStart || project?.start_date);
  const dateEnd = parseDate(project?.dateEnd || project?.end_date) || dateStart;
  const today = parseDate(todayValue) || new Date();
  today.setHours(0, 0, 0, 0);

  if (!dateStart) return "Upcoming";
  if (dateEnd && dateEnd < today) return "Completed";
  if (dateStart > today) return "Upcoming";
  return "Active";
}

export function getProjectDisplayStatus(project, todayValue) {
  return getProjectStatusOverride(project) || computeProjectStatus(project, todayValue);
}
