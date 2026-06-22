export const STATUS_BY_ID = {
  1: "Submitted",
  2: "For Verification",
  3: "Undergoing Review",
  4: "Verified - True",
  5: "Verified - False",
  6: "Under Case Evaluation",
  7: "Case Filed",
  8: "Investigation Ongoing",
  9: "Hearing Ongoing",
  10: "Dismissed",
  11: "Perpetrator Convicted",
  12: "Resolved",
  13: "Withdrawn",
};

export const STATUS_DISPLAY = {
  Submitted: { middle: "For Verification", phase: 1 },
  "For Verification": { middle: "For Verification", phase: 1 },
  "Undergoing Review": { middle: "Undergoing Review", phase: 1 },
  "Verified - True": { middle: "Verified", phase: 1 },
  "Verified - False": { middle: "Verified", phase: 2 },
  "Under Case Evaluation": { middle: "Under Case Evaluation", phase: 1 },
  "Case Filed": { middle: "Case Filed", phase: 1 },
  "Investigation Ongoing": { middle: "Investigation Ongoing", phase: 1 },
  "Hearing Ongoing": { middle: "Hearing Ongoing", phase: 1 },
  Dismissed: { middle: "Dismissed", phase: 2 },
  "Perpetrator Convicted": { middle: "Perpetrator Convicted", phase: 2 },
  Resolved: { middle: "Resolved", phase: 2 },
  Withdrawn: { middle: "Withdrawn", phase: 2 },
};

export function getStatusName(report) {
  return (
    report.statusName ||
    report.status ||
    report.case_status?.status_name ||
    report.case_status?.case_status_name ||
    report.case_status_name ||
    STATUS_BY_ID[Number(report.case_status_id)] ||
    "For Verification"
  );
}

export function getAssignedPersonnel(report) {
  return (
    report.assigned_officer ||
    report.assignedOfficer ||
    report.assigned_personnel ||
    report.assignedPersonnel ||
    getNestedOfficerName(report.case_assignments) ||
    null
  );
}

function getNestedOfficerName(assignments = []) {
  const active = assignments.find((assignment) => assignment?.is_active) || assignments[0];
  const user = active?.case_officers?.users || active?.case_officer?.users;
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || null;
}

export function normalizeReport(report) {
  const createdAt = report.created_at || report.dateSubmitted || null;
  const id = report.case_report_id || report.id;
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();

  return {
    reportData: report,
    id,
    caseId: report.caseId || `${year}-${String(id).padStart(3, "0")}`,
    statusName: getStatusName(report),
    assignedPersonnel: getAssignedPersonnel(report),
    createdAt,
    updatedAt: report.updated_at || report.lastUpdated || createdAt,
    dateSubmitted: createdAt
      ? new Date(createdAt).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—",
    rawDateSubmitted: createdAt,
    caseType: report.case_type || report.caseType || "",
    primaryCategory: report.primary_category || report.primaryCategory || "",
    city: report.incident_city || report.city || "",
    description: report.incident_description || report.description || "",
    followUpSummary: report.follow_up_summary || report.followUpSummary || null,
    withdrawalRequest: report.withdrawal_request || report.withdrawalRequest || null,
  };
}

export function getDateRangeFromFilter(value) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (value === "today") return { start, end };
  if (value === "thisWeek") {
    start.setDate(today.getDate() - today.getDay());
    return { start, end };
  }
  if (value === "thisMonth") {
    start.setDate(1);
    return { start, end };
  }
  if (value === "thisYear") {
    start.setMonth(0, 1);
    return { start, end };
  }
  if (value === "last30Days") {
    start.setDate(today.getDate() - 30);
    return { start, end };
  }
  if (value?.startsWith("custom|")) {
    const [, customStart, customEnd] = value.split("|");
    return { start: new Date(customStart), end: new Date(`${customEnd}T23:59:59.999`) };
  }
  return null;
}

export function isReportInDateRange(reportDate, range) {
  if (!reportDate || !range) return false;
  const date = new Date(reportDate);
  return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
}
