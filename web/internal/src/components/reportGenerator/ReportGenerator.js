"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import styles from "./ReportGenerator.module.css";
import { internalApiFetch } from "@/lib/internalApiFetch";
import {
  FiDownload,
  FiFileText,
  FiBarChart2,
  FiUsers,
  FiBriefcase,
  FiShield,
  FiLayers,
  FiRefreshCw,
  FiCalendar,
  FiChevronDown,
  FiFilter,
  FiPrinter,
  FiX,
  FiSearch,
  FiMapPin,
  FiTag,
  FiClock,
  FiUserCheck,
  FiFlag,
} from "react-icons/fi";
import { computeProjectStatus, getProjectStatusOverride } from "@/lib/projectStatus";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CASE_STATUSES = [
  "Submitted",
  "For Verification",
  "Undergoing Review",
  "Verified - True",
  "Verified - False",
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
  "Dismissed",
  "Perpetrator Convicted",
  "Resolved",
  "Withdrawn",
];

const CASE_TYPES = [
  "Child Sexual Abuse",
  "Gender-Based Sexual Harassment in Institutions",
  "Non-Consensual Sharing of Intimate Images/Videos",
  "Online Sexual Harassment",
  "Rape / Attempted Rape",
  "Sexual Assault / Unwanted Sexual Touching",
  "Sexual Exploitation / Trafficking-Related Sexual Abuse",
  "Sexual Harassment",
  "Stalking With Sexual Nature or Intent",
];

const REGIONS = ["NCR", "Region I", "Region III", "Region IV-A"];
const CITIES = [
  "Caloocan",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Pateros",
  "Quezon City",
  "San Juan",
  "Taguig",
  "Valenzuela",
];

const VOLUNTEER_STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Waitlisted"];
const PROJECT_STATUSES = ["Upcoming", "Active", "Completed", "Postponed", "Cancelled"];
const USER_ROLES = ["Admin", "Case Officer", "Legal Personnel", "Staff", "User"];

const DATE_RANGES = [
  { label: "All Time",     value: "all" },
  { label: "Today",        value: "today" },
  { label: "This Week",    value: "thisWeek" },
  { label: "This Month",   value: "thisMonth" },
  { label: "This Year",    value: "thisYear" },
  { label: "Last 30 Days", value: "last30Days" },
];

const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

const LEGAL_CROSSTAB_COLUMNS = ["Ongoing", "Won", "Settled", "Dismissed", "Unresolved", "Declined"];

const CASE_STATUS_BY_ID = {
  1:  "Submitted",
  2:  "For Verification",
  3:  "Undergoing Review",
  4:  "Verified - True",
  5:  "Verified - False",
  6:  "Under Case Evaluation",
  7:  "Case Filed",
  8:  "Investigation Ongoing",
  9:  "Hearing Ongoing",
  10: "Dismissed",
  11: "Perpetrator Convicted",
  12: "Resolved",
  13: "Withdrawn",
};

const REPORT_TIME_ZONE = "Asia/Manila";

// Distinct color palettes
const DONUT_COLORS_STATUS   = ["#037F81","#E8663A","#4f46e5","#16a34a","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4","#ec4899","#a3e635","#64748b"];
const DONUT_COLORS_LEGAL    = ["#4f46e5","#7c3aed","#a78bfa","#818cf8","#c4b5fd"];
const DONUT_COLORS_VOLUNTEER= ["#fbbf24","#60a5fa","#34d399","#f87171","#a78bfa"];
const DONUT_COLORS_CASETYPE = ["#E8663A","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4","#ec4899","#64748b"];
const DONUT_COLORS_PROJECT  = ["#16a34a","#0ea5e9","#f59e0b","#8b5cf6","#ef4444","#64748b"];
const DONUT_COLORS_USER     = ["#E8663A","#037F81","#4f46e5","#f59e0b","#64748b","#06b6d4"];
const DONUT_COLORS_BINARY   = ["#16a34a","#ef4444"];

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRangeStart(range) {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "thisWeek": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "thisMonth":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "thisYear":
      return new Date(now.getFullYear(), 0, 1);
    case "last30Days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    default:
      return null;
  }
}

function filterByDateRange(records, range, ...dateFields) {
  const start = getRangeStart(range);
  if (!start || !records.length) return records;
  return records.filter((r) => {
    for (const field of dateFields) {
      const raw = r[field];
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d)) return d >= start;
      }
    }
    return true;
  });
}

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function titleFromSnake(raw) {
  if (!raw) return null;
  return String(raw).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function recordDate(record, ...fields) {
  for (const field of fields) {
    const raw = record[field];
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.valueOf())) return date;
  }
  return null;
}

function phDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: parts.find((part) => part.type === "year")?.value,
    month: parts.find((part) => part.type === "month")?.value,
    day: parts.find((part) => part.type === "day")?.value,
  };
}

function phDateKey(date) {
  const { year, month, day } = phDateParts(date);
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function phDayEndFromKey(key) {
  return new Date(`${key}T23:59:59.999+08:00`);
}

function formatPhDateLabel(key) {
  return new Date(`${key}T00:00:00+08:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: REPORT_TIME_ZONE,
  });
}

function withinDateInputs(record, filters, fields) {
  const date = recordDate(record, ...fields);
  if (!date) return true;
  if (filters.from) {
    const start = new Date(`${filters.from}T00:00:00`);
    if (date < start) return false;
  }
  if (filters.to) {
    const end = new Date(`${filters.to}T23:59:59`);
    if (date > end) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISERS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeCaseReport(row) {
  const status =
    row.status ||
    row.case_status_name ||
    row.case_statuses?.case_status_name ||
    CASE_STATUS_BY_ID[row.case_status_id] ||
    null;

  const caseType =
    row.case_type || row.caseType || row.case_type_name || row.case_types?.case_type_name || row.primary_category || null;

  // Resolve the city field — try multiple field names the backend might send
  const city =
    row.incident_city ||
    row.city ||
    row.incident_municipality ||
    null;

  return {
    id: row.id || row.case_report_id,
    status,
    case_type: caseType,
    primary_category: row.primary_category || row.primaryCategory || null,
    additional_categories: Array.isArray(row.additional_categories)
      ? row.additional_categories
      : Array.isArray(row.additionalCategories)
        ? row.additionalCategories
        : [],
    city,
    region:
      row.region || row.location_type || row.incident_location_type || row.incident_province || row.incident_city || null,
    site:
      row.site || row.incident_city || row.incident_province || row.region || null,
    location_type: row.location_type || row.incident_location_type || null,
    incident_location_type: row.incident_location_type || row.location_type || null,
    incident_location: row.incident_location || row.incidentLocation || null,
    perpetrator_relationship: row.perpetrator_relationship || row.perpetratorRelationship || null,
    perpetrator_occupation: row.perpetrator_occupation || row.perpetratorOccupation || null,
    endorsed_to: row.endorsed_to || row.endorsedTo || row.legal_review?.endorsed_to || row.endorsement?.endorsed_to || null,
    date_filed: row.date_filed || row.dateSubmitted || row.created_at || null,
    date_resolved: row.date_resolved || row.dateResolved || row.updated_at || null,
    created_at: row.created_at || row.date_filed || null,
    referral_suggested: row.referral_suggested || row.referralSuggested || false,
  };
}

function normalizeVolunteerApplication(row) {
  const rawStatus = row.status || row.application_status;
  return {
    id: row.id || row.volunteer_application_id,
    status: rawStatus === "under_review" ? "Under Review" : titleFromSnake(rawStatus),
    score: row.score ?? row.negotiable_score ?? null,
    field_of_background: row.field_of_background || row.fieldOfBackground || row.fields_with_background || null,
    fieldsOfExpertise: row.fieldsOfExpertise || row.fields_of_expertise || row.fields_of_interest || null,
    site: row.city || row.site || null,
    created_at: row.created_at || row.dateApplied || row.applied_at || null,
  };
}

function normalizeUser(row) {
  return {
    id: row.id || row.user_id,
    role_name: row.role_name || row.roleName || row.role || row.roles?.role_name || null,
    is_active: row.is_active ?? row.isActive ?? row.status !== "Inactive",
    created_at: row.created_at || row.createdAt || row.date_created || null,
    city: row.city || row.location_city || null,
    province: row.province || row.location_province || null,
    gender_identity: row.gender_identity || row.genderIdentity || row.gender || null,
  };
}

function normalizeProject(row) {
  return {
    id: row.id || row.project_id,
    status: computeProjectStatus(row),
    statusOverride: getProjectStatusOverride(row),
    category: row.category || null,
    visibility: row.visibility || null,
    approval_status: row.approval_status || row.approvalStatus || null,
    start_date: row.start_date || row.dateStart || null,
    end_date: row.end_date || row.dateEnd || null,
    due_date: row.due_date || row.dueDate || null,
    actual_end_date: row.actual_end_date || row.actualEndDate || null,
    created_at: row.created_at || row.createdAt || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED FILTER APPLIER
// ─────────────────────────────────────────────────────────────────────────────

function applyAdvancedFilters(raw, range, filters) {
  const filteredCases = filterByDateRange(raw.cases, range, "date_filed", "created_at")
    .filter((c) => withinDateInputs(c, filters, ["date_filed", "created_at"]))
    .filter((c) => filters.site === "all" || c.site === filters.site || c.region === filters.site || c.city === filters.site)
    .filter((c) => filters.city === "all" || !filters.city || c.city === filters.city)
    .filter((c) => filters.caseStatus === "all" || c.status === filters.caseStatus)
    .filter((c) => filters.caseType === "all" || c.case_type === filters.caseType);

  const filteredVolunteers = filterByDateRange(raw.volunteers, range, "created_at", "applied_at")
    .filter((v) => withinDateInputs(v, filters, ["created_at", "applied_at"]))
    .filter((v) => filters.site === "all" || !v.site || v.site === filters.site);

  const filteredProjects = filterByDateRange(raw.projects, range, "start_date", "created_at")
    .filter((p) => withinDateInputs(p, filters, ["start_date", "created_at"]));

  const filteredLegalCases = filterByDateRange(raw.legalCases || [], range, "date_filed", "created_at")
    .filter((c) => withinDateInputs(c, filters, ["date_filed", "created_at"]))
    .filter((c) => filters.site === "all" || c.site === filters.site || c.region === filters.site || c.city === filters.site)
    .filter((c) => filters.city === "all" || !filters.city || c.city === filters.city)
    .filter((c) => filters.caseType === "all" || c.case_type === filters.caseType);

  const filteredUsers = filterByDateRange(raw.users, range, "created_at", "createdAt")
    .filter((u) => withinDateInputs(u, filters, ["created_at", "createdAt"]))
    .filter((u) => filters.userRole === "all" || u.role_name === filters.userRole);

  return { cases: filteredCases, legalCases: filteredLegalCases, volunteers: filteredVolunteers, projects: filteredProjects, users: filteredUsers };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUCKETING — trend + stacked area
// ─────────────────────────────────────────────────────────────────────────────

function bucketCasesByDay(cases) {
  const counts = {};
  for (const c of cases) {
    const date = recordDate(c, "date_filed", "created_at");
    if (!date) continue;
    const key = phDateKey(date);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, value]) => ({
      label: formatPhDateLabel(date),
      value,
    }));
}

function getLastDayKeys(days = 30) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const key = phDateKey(date);
    return {
      key,
      end: phDayEndFromKey(key),
      label: formatPhDateLabel(key),
    };
  });
}

function groupStatusHistoryByCase(rows = []) {
  return rows.reduce((map, row) => {
    const caseId = row.case_report_id || row.caseReportId;
    if (!caseId) return map;
    if (!map[caseId]) map[caseId] = [];
    map[caseId].push({
      status: row.status || CASE_STATUS_BY_ID[row.case_status_id] || null,
      created_at: row.created_at,
      approved_at: row.approved_at,
      effective_at: row.approved_at || row.created_at,
    });
    return map;
  }, {});
}

async function fetchApprovedStatusHistoryMap(cases = []) {
  const caseIds = [...new Set(cases.map((c) => c.id).filter(Boolean))];
  if (caseIds.length === 0) return {};

  const params = new URLSearchParams({ caseIds: caseIds.join(",") });
  const response = await internalApiFetch(`/api/case_status_history/batch/approved?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to load case status history");

  const payload = await response.json();
  return groupStatusHistoryByCase(toArray(payload));
}

function getStatusBucket(status) {
  const submittedStatuses = new Set(["Submitted"]);
  const reviewStatuses = new Set([
    "For Verification",
    "Undergoing Review",
    "Verified - True",
    "Under Case Evaluation",
    "Case Filed",
    "Investigation Ongoing",
    "Hearing Ongoing",
  ]);
  const closedStatuses = new Set(["Resolved", "Dismissed", "Withdrawn", "Perpetrator Convicted", "Verified - False"]);
  if (closedStatuses.has(status)) return "Closed";
  if (reviewStatuses.has(status)) return "Undergoing Review";
  if (submittedStatuses.has(status)) return "Submitted";
  return "Submitted";
}

function getStatusAsOfDay(caseItem, historyRows = [], dayEnd) {
  const filedDate = recordDate(caseItem, "date_filed", "created_at");
  if (!filedDate || filedDate > dayEnd) return null;

  let status = "Submitted";
  let statusDate = filedDate;
  const sortedRows = [...historyRows].sort((a, b) => {
    const aDate = recordDate(a, "effective_at", "approved_at", "created_at");
    const bDate = recordDate(b, "effective_at", "approved_at", "created_at");
    return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
  });
  for (const row of sortedRows) {
    const transitionDate = recordDate(row, "effective_at", "approved_at", "created_at");
    if (!transitionDate || transitionDate > dayEnd) break;
    if (row.status) {
      status = row.status;
      statusDate = transitionDate;
    }
  }

  if (getStatusBucket(status) === "Closed") {
    return phDateKey(statusDate) === phDateKey(dayEnd) ? status : null;
  }

  return status;
}

function bucketCaseStatusesByDay(cases, statusHistoryByCaseId = {}) {
  return getLastDayKeys(30).map(({ label, end }) => {
    const values = { Submitted: 0, "Undergoing Review": 0, Closed: 0 };

    for (const c of cases) {
      const historyRows = statusHistoryByCaseId[c.id] || [];
      const status = getStatusAsOfDay(c, historyRows, end);
      if (!status) continue;
      values[getStatusBucket(status)] += 1;
    }

    return { label, ...values };
  });
}

function topEntries(data, limit = 6) {
  return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildCaseSummary(cases = []) {
  const byStatus = {};
  const byType   = {};
  const byRegion = {};
  const byCity   = {};
  let open = 0, closed = 0, totalResolutionDays = 0, resolvedCount = 0;

  ALL_CASE_STATUSES.forEach((s) => { byStatus[s] = 0; });
  CASE_TYPES.forEach((t)         => { byType[t]   = 0; });
  REGIONS.forEach((r)            => { byRegion[r] = 0; });
  CITIES.forEach((c)             => { byCity[c]   = 0; });

  for (const c of cases) {
    if (c.status) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    if (c.case_type) byType[c.case_type] = (byType[c.case_type] || 0) + 1;

    const region = c.region || c.location_type;
    if (region) byRegion[region] = (byRegion[region] || 0) + 1;

    const city = c.city || c.site;
    if (city) byCity[city] = (byCity[city] || 0) + 1;

    const closedStatuses = ["Resolved", "Dismissed", "Withdrawn", "Perpetrator Convicted", "Verified - False"];
    if (c.status && closedStatuses.includes(c.status)) {
      closed++;
      const filed    = c.date_filed    || c.dateFiled;
      const resolved = c.date_resolved || c.dateResolved;
      if (filed && resolved) {
        const days = (new Date(resolved) - new Date(filed)) / (1000 * 60 * 60 * 24);
        if (!isNaN(days)) { totalResolutionDays += days; resolvedCount++; }
      }
    } else {
      open++;
    }
  }

  const filteredByStatus = Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0));
  const filteredByType   = Object.fromEntries(Object.entries(byType).filter(([, v]) => v > 0));
  const filteredByRegion = Object.fromEntries(Object.entries(byRegion).filter(([, v]) => v > 0));
  const filteredByCity   = Object.fromEntries(Object.entries(byCity).filter(([, v]) => v > 0));

  return {
    total: cases.length,
    byStatus: filteredByStatus,
    byType:   filteredByType,
    byRegion: filteredByRegion,
    byCity:   filteredByCity,
    openCases:   open,
    closedCases: closed,
    avgResolutionDays: resolvedCount ? Math.round(totalResolutionDays / resolvedCount) : 0,
  };
}

function buildLegalSummary(legalCases = []) {
  const legalStatuses = ["Case Filed", "Investigation Ongoing", "Hearing Ongoing", "Dismissed", "Perpetrator Convicted"];
  const byStatus = {};
  legalStatuses.forEach((s) => { byStatus[s] = 0; });
  const cityCounts = {};
  const typeCounts = {};
  let totalDays = 0, daysCount = 0, referralSuggested = 0, casesFiled = 0, casesResolved = 0;

  for (const c of legalCases) {
    if (c.status) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    const filed  = c.date_filed  || c.dateFiled;
    const closed = c.date_closed || c.dateClosed;
    if (filed && closed) {
      const days = (new Date(closed) - new Date(filed)) / (1000 * 60 * 60 * 24);
      if (!isNaN(days)) { totalDays += days; daysCount++; }
    }
    if (c.referral_suggested || c.referralSuggested) referralSuggested++;
    if (c.status === "Case Filed") casesFiled++;
    if (["Perpetrator Convicted", "Dismissed"].includes(c.status)) casesResolved++;

    const city = c.city || c.site;
    if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
    if (c.case_type) typeCounts[c.case_type] = (typeCounts[c.case_type] || 0) + 1;
  }

  const referralBreakdown = legalCases.length
    ? { "Referral Suggested": referralSuggested, "No Referral": legalCases.length - referralSuggested }
    : {};

  return {
    total: legalCases.length,
    byStatus: Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0)),
    byCity: Object.fromEntries(topEntries(cityCounts, 6)),
    byType: Object.fromEntries(topEntries(typeCounts, 6)),
    referralBreakdown,
    avgDaysInLegal: daysCount ? Math.round(totalDays / daysCount) : 0,
    casesFiled,
    casesResolved,
    referralSuggested,
  };
}

function buildVolunteerSummary(applications = []) {
  const byStatus = {};
  VOLUNTEER_STATUSES.forEach((s) => { byStatus[s] = 0; });
  let totalScore = 0, scoreCount = 0;
  const fieldCounts = {};

  for (const a of applications) {
    if (a.status) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    const rawScore = a.score ?? a.negotiable_score;
    if (typeof rawScore === "number") { totalScore += rawScore; scoreCount++; }
    const field = a.field_of_background || a.fieldOfBackground || a.fields_of_expertise || a.fieldsOfExpertise;
    if (field) {
      const fields = Array.isArray(field) ? field : [field];
      for (const f of fields) {
        if (f) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
      }
    }
  }

  const approved    = byStatus["Approved"]    || 0;
  const rejected    = byStatus["Rejected"]    || 0;
  const waitlisted  = byStatus["Waitlisted"]  || 0;
  const processed   = approved + rejected + waitlisted;
  const approvalRate = processed ? Math.round((approved / processed) * 100) : 0;

  return {
    total: applications.length,
    byStatus: Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0)),
    approvalRate,
    avgScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
    topFields: topEntries(fieldCounts, 6),
  };
}

function buildProjectSummary(projects = []) {
  const byStatus = {};
  PROJECT_STATUSES.forEach((s) => { byStatus[s] = 0; });
  const byCategory = {};
  const byVisibility = {};
  const byApproval = {};
  let completedOnTime = 0;
  let onTime = 0, delayed = 0, overdue = 0;
  const now = new Date();

  for (const p of projects) {
    const s = computeProjectStatus(p);
    if (s) byStatus[s] = (byStatus[s] || 0) + 1;
    if (s === "Completed") completedOnTime++;

    if (p.category) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    if (p.visibility) byVisibility[p.visibility] = (byVisibility[p.visibility] || 0) + 1;
    if (p.approval_status) byApproval[p.approval_status] = (byApproval[p.approval_status] || 0) + 1;

    if (s === "Completed") {
      const end    = p.end_date && new Date(p.end_date);
      const actual = p.actual_end_date && new Date(p.actual_end_date);
      if (end && actual && !isNaN(end) && !isNaN(actual)) {
        if (actual <= end) onTime++; else delayed++;
      }
    } else if (s !== "Cancelled" && p.due_date) {
      const due = new Date(p.due_date);
      if (!isNaN(due) && due < now) overdue++;
    }
  }

  const timeliness = {};
  if (onTime)  timeliness["On Time"] = onTime;
  if (delayed) timeliness["Delayed"] = delayed;
  if (overdue) timeliness["Overdue (Ongoing)"] = overdue;

  return {
    total: projects.length,
    byStatus: Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0)),
    byCategory: Object.fromEntries(topEntries(byCategory, 6)),
    byVisibility,
    byApproval,
    timeliness,
    activeProjects: byStatus["Active"] || 0,
    completedOnTime,
    overdueCount: overdue,
  };
}

function buildUserSummary(users = []) {
  const byRole = {};
  USER_ROLES.forEach((r) => { byRole[r] = 0; });
  const cityCounts = {};
  const genderCounts = {};
  let active = 0, deactivated = 0, newThisMonth = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const u of users) {
    const role = u.role_name;
    if (role) byRole[role] = (byRole[role] || 0) + 1;
    if (u.is_active) active++; else deactivated++;
    const created = recordDate(u, "created_at");
    if (created && created >= monthStart) newThisMonth++;

    const city = u.city || u.province;
    if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
    if (u.gender_identity) genderCounts[u.gender_identity] = (genderCounts[u.gender_identity] || 0) + 1;
  }

  return {
    total: users.length,
    byRole: Object.fromEntries(Object.entries(byRole).filter(([, v]) => v > 0)),
    byCity: Object.fromEntries(topEntries(cityCounts, 6)),
    byGender: genderCounts,
    activeBreakdown: users.length ? { Active: active, Deactivated: deactivated } : {},
    activeUsers: active,
    deactivated,
    newThisMonth,
  };
}

function buildAnalytics(cases, volunteers, projects, users, statusHistoryByCaseId = {}) {
  const caseSummary       = buildCaseSummary(cases);
  const volunteerSummary  = buildVolunteerSummary(volunteers);
  const projectSummary    = buildProjectSummary(projects);
  const userSummary       = buildUserSummary(users);
  const total = caseSummary.total + volunteerSummary.total + projectSummary.total + userSummary.total;
  const completionSignal  = caseSummary.total ? Math.round((caseSummary.closedCases / caseSummary.total) * 100) : 0;
  const volunteerSignal   = volunteerSummary.total ? Math.round(volunteerSummary.approvalRate) : 0;
  const projectSignal     = projectSummary.total ? Math.round((projectSummary.completedOnTime / projectSummary.total) * 100) : 0;
  // const healthScore       = Math.round((completionSignal + volunteerSignal + projectSignal) / 3) || 0;

  return {
    total,
    openReports: caseSummary.openCases,
    completedReports: caseSummary.closedCases,
    underInvestigation:
      (caseSummary.byStatus["Investigation Ongoing"] || 0) +
      (caseSummary.byStatus["Hearing Ongoing"] || 0) +
      (caseSummary.byStatus["Under Case Evaluation"] || 0),
    pendingActions:
      (volunteerSummary.byStatus?.Pending || 0) +
      (projectSummary.activeProjects || 0) +
      (userSummary.deactivated || 0),
    trend:        bucketCasesByDay(cases),
    stackedTrend: bucketCaseStatusesByDay(cases, statusHistoryByCaseId),
    topCities:    topEntries(caseSummary.byCity, 6),
    topTypes:     topEntries(caseSummary.byType, 5),
    caseSummary,
    volunteerSummary,
    projectSummary,
    userSummary,
    // healthScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XLSX EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function getDateRangeLabel(dateRange) {
  return DATE_RANGES.find((item) => item.value === dateRange)?.label || "Selected Range";
}

const XLSX_HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF037F81" } };
const XLSX_SECTION_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF7F7" } };

function formatWorkbookHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = XLSX_HEADER_FILL;
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: "FFB7DCDC" } } };
  });
}

function formatSectionRow(row) {
  row.font = { bold: true, color: { argb: "FF034B4D" } };
  row.fill = XLSX_SECTION_FILL;
}

function autoSizeWorksheet(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? "" : String(cell.value);
      maxLength = Math.max(maxLength, value.length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 48);
  });
}

function sortCountEntries(counts = {}) {
  return Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0])));
}

function countTableRows(counts = {}, totalOverride = null) {
  const entries = sortCountEntries(counts);
  const total = totalOverride ?? entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  return entries.map(([label, count]) => [
    label,
    Number(count || 0),
    total ? `${Math.round((Number(count || 0) / total) * 100)}%` : "0%",
  ]);
}

function pairTableRows(entries = [], totalOverride = null) {
  const filtered = entries
    .filter((entry) => Array.isArray(entry) && Number(entry[1]) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0])));
  const total = totalOverride ?? filtered.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  return filtered.map(([label, count]) => [
    label,
    Number(count || 0),
    total ? `${Math.round((Number(count || 0) / total) * 100)}%` : "0%",
  ]);
}

function addWorksheetSection(worksheet, title, headers, rows = []) {
  if (worksheet.rowCount > 0) worksheet.addRow([]);
  const sectionRow = worksheet.addRow([title]);
  formatSectionRow(sectionRow);
  if (headers.length > 1) {
    worksheet.mergeCells(sectionRow.number, 1, sectionRow.number, headers.length);
  }

  const headerRow = worksheet.addRow(headers);
  formatWorkbookHeader(headerRow);

  if (rows.length) {
    rows.forEach((row) => worksheet.addRow(row));
  } else {
    worksheet.addRow(["No data available"]);
  }
}

function formatWorksheet(worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
  autoSizeWorksheet(worksheet);
}

function flattenSummaryValue(key, value) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (Array.isArray(item)) return [[`${key} - ${item[0] || `Item ${index + 1}`}`, item[1] ?? ""]];
      if (item && typeof item === "object") {
        const label = item.label || item.date || `Item ${index + 1}`;
        const rest = Object.entries(item)
          .filter(([field]) => field !== "label" && field !== "date")
          .map(([field, fieldValue]) => `${field}: ${fieldValue}`)
          .join(", ");
        return [[`${key} - ${label}`, rest]];
      }
      return [[`${key} - Item ${index + 1}`, item ?? ""]];
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([nestedKey, nestedValue]) => [`${key} - ${nestedKey}`, nestedValue]);
  }

  return [[key, value ?? ""]];
}

function addSummarySheet(workbook, modules) {
  const worksheet = workbook.addWorksheet("Summary");
  const headerRow = worksheet.addRow(["Module", "Metric", "Value"]);
  formatWorkbookHeader(headerRow);

  modules.forEach(({ title, summary }) => {
    Object.entries(summary || {}).forEach(([key, value]) => {
      flattenSummaryValue(key, value).forEach(([metric, metricValue]) => {
        worksheet.addRow([title, metric, metricValue]);
      });
    });
  });

  formatWorksheet(worksheet);
}

function addCasesSheet(workbook, caseData, analyticsData) {
  const worksheet = workbook.addWorksheet("Cases");
  addWorksheetSection(worksheet, "Key Metrics", ["Metric", "Value"], [
    ["Open Reports", caseData.openCases],
    ["Under Investigation", analyticsData?.underInvestigation ?? 0],
    ["Completed Reports", caseData.closedCases],
    ["Total Cases", caseData.total],
    ["Average Resolution Days", caseData.avgResolutionDays],
  ]);
  addWorksheetSection(worksheet, "Reports by Status", ["Status", "Count", "Percentage"], countTableRows(caseData.byStatus, caseData.total));
  addWorksheetSection(worksheet, "Reports by City", ["City", "Count", "Percentage"], countTableRows(caseData.byCity, caseData.total));
  addWorksheetSection(worksheet, "Case Types", ["Case Type", "Count", "Percentage"], countTableRows(caseData.byType, caseData.total));
  addWorksheetSection(worksheet, "Case Reports Last 30 Days", ["Date", "Filed Count"], (analyticsData?.trend || []).map((item) => [item.label, item.value]));
  addWorksheetSection(
    worksheet,
    "Status Composition Over Time",
    ["Date", "Submitted", "Undergoing Review", "Closed"],
    (analyticsData?.stackedTrend || []).map((item) => [item.label, item.Submitted || 0, item["Undergoing Review"] || 0, item.Closed || 0])
  );
  formatWorksheet(worksheet);
}

function addLegalSheet(workbook, legalData) {
  const worksheet = workbook.addWorksheet("Legal Review");
  addWorksheetSection(worksheet, "Key Metrics", ["Metric", "Value"], [
    ["Cases in Legal", legalData.total],
    ["Cases Filed", legalData.casesFiled],
    ["Cases Resolved", legalData.casesResolved],
    ["Referrals Suggested", legalData.referralSuggested],
    ["Average Days in Legal", legalData.avgDaysInLegal],
  ]);
  addWorksheetSection(worksheet, "Legal Cases by City", ["City", "Count", "Percentage"], countTableRows(legalData.byCity, legalData.total));
  addWorksheetSection(worksheet, "Legal Case Status Distribution", ["Status", "Count", "Percentage"], countTableRows(legalData.byStatus, legalData.total));
  addWorksheetSection(worksheet, "Legal Case Types", ["Case Type", "Count", "Percentage"], countTableRows(legalData.byType, legalData.total));
  addWorksheetSection(worksheet, "Referral Outcome", ["Outcome", "Count", "Percentage"], countTableRows(legalData.referralBreakdown));
  formatWorksheet(worksheet);
}

function addVolunteersSheet(workbook, volunteerData) {
  const worksheet = workbook.addWorksheet("Volunteers");
  addWorksheetSection(worksheet, "Key Metrics", ["Metric", "Value"], [
    ["Total Applications", volunteerData.total],
    ["Approval Rate", `${volunteerData.approvalRate}%`],
    ["Average Score", volunteerData.avgScore],
  ]);
  addWorksheetSection(worksheet, "Applications by Status", ["Status", "Count", "Percentage"], countTableRows(volunteerData.byStatus, volunteerData.total));
  addWorksheetSection(worksheet, "Top Fields of Background", ["Field", "Count", "Percentage"], pairTableRows(volunteerData.topFields));
  formatWorksheet(worksheet);
}

function addProjectsSheet(workbook, projectData) {
  const worksheet = workbook.addWorksheet("Projects");
  addWorksheetSection(worksheet, "Key Metrics", ["Metric", "Value"], [
    ["Total Projects", projectData.total],
    ["Active Projects", projectData.activeProjects],
    ["Completed", projectData.completedOnTime],
    ["Overdue (Ongoing)", projectData.overdueCount],
  ]);
  addWorksheetSection(worksheet, "Projects by Status", ["Status", "Count", "Percentage"], countTableRows(projectData.byStatus, projectData.total));
  addWorksheetSection(worksheet, "Projects by Category", ["Category", "Count", "Percentage"], countTableRows(projectData.byCategory, projectData.total));
  addWorksheetSection(worksheet, "Approval Breakdown", ["Approval Status", "Count", "Percentage"], countTableRows(projectData.byApproval, projectData.total));
  addWorksheetSection(worksheet, "Visibility Breakdown", ["Visibility", "Count", "Percentage"], countTableRows(projectData.byVisibility, projectData.total));
  addWorksheetSection(worksheet, "Timeliness", ["Category", "Count", "Percentage"], countTableRows(projectData.timeliness));
  formatWorksheet(worksheet);
}

function addUsersSheet(workbook, userData) {
  const worksheet = workbook.addWorksheet("Users");
  addWorksheetSection(worksheet, "Key Metrics", ["Metric", "Value"], [
    ["Total Users", userData.total],
    ["Active Users", userData.activeUsers],
    ["New This Month", userData.newThisMonth],
    ["Deactivated", userData.deactivated],
  ]);
  addWorksheetSection(worksheet, "Users by Role", ["Role", "Count", "Percentage"], countTableRows(userData.byRole, userData.total));
  addWorksheetSection(worksheet, "Users by City", ["City", "Count", "Percentage"], countTableRows(userData.byCity, userData.total));
  addWorksheetSection(worksheet, "Active vs Deactivated", ["Status", "Count", "Percentage"], countTableRows(userData.activeBreakdown, userData.total));
  formatWorksheet(worksheet);
}

async function exportToXLSX({ activeModules, dataAvailability, analyticsData }) {
  const modules = [];
  if (activeModules.cases && dataAvailability.caseData) {
    modules.push({ title: "Case Management", summary: dataAvailability.caseData });
  }
  if (activeModules.legal && dataAvailability.legalData) {
    modules.push({ title: "Legal Review", summary: dataAvailability.legalData });
  }
  if (activeModules.volunteers && dataAvailability.volunteerData) {
    modules.push({ title: "Volunteer Application Management", summary: dataAvailability.volunteerData });
  }
  if (activeModules.projects && dataAvailability.projectData) {
    modules.push({ title: "Project Tracker", summary: dataAvailability.projectData });
  }
  if (activeModules.users && dataAvailability.userData) {
    modules.push({ title: "User Management", summary: dataAvailability.userData });
  }
  if (!modules.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SAVIRA";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  addSummarySheet(workbook, modules);
  if (activeModules.cases && dataAvailability.caseData) addCasesSheet(workbook, dataAvailability.caseData, analyticsData);
  if (activeModules.legal && dataAvailability.legalData) addLegalSheet(workbook, dataAvailability.legalData);
  if (activeModules.volunteers && dataAvailability.volunteerData) addVolunteersSheet(workbook, dataAvailability.volunteerData);
  if (activeModules.projects && dataAvailability.projectData) addProjectsSheet(workbook, dataAvailability.projectData);
  if (activeModules.users && dataAvailability.userData) addUsersSheet(workbook, dataAvailability.userData);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = `report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { filename };
}

function cleanPdfLabel(value, fallback = "Unspecified") {
  const text = String(value || "").trim();
  return text || fallback;
}

function countBy(records = [], selector) {
  const counts = {};
  for (const record of records) {
    const value = selector(record);
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      const label = cleanPdfLabel(item);
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  return counts;
}

function objectToTableRows(counts = {}, totalOverride = null) {
  const entries = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = totalOverride ?? entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  return entries.map(([label, count]) => [
    label,
    String(count),
    total ? `${Math.round((Number(count) / total) * 100)}%` : "0%",
  ]);
}

function getLegalOutcomeColumn(status) {
  if (["Case Filed", "Investigation Ongoing", "Hearing Ongoing", "Under Case Evaluation"].includes(status)) return "Ongoing";
  if (status === "Perpetrator Convicted") return "Won";
  if (status === "Resolved") return "Settled";
  if (status === "Dismissed") return "Dismissed";
  if (["Verified - False", "Withdrawn"].includes(status)) return "Declined";
  return "Unresolved";
}

function buildEndorsementCrosstabRows(cases = []) {
  const rows = ENDORSEMENT_BODIES.map((body) => {
    const counts = Object.fromEntries(LEGAL_CROSSTAB_COLUMNS.map((column) => [column, 0]));
    for (const caseItem of cases) {
      if (caseItem.endorsed_to !== body) continue;
      counts[getLegalOutcomeColumn(caseItem.status)] += 1;
    }
    const subtotal = LEGAL_CROSSTAB_COLUMNS.reduce((sum, column) => sum + counts[column], 0);
    return [body, ...LEGAL_CROSSTAB_COLUMNS.map((column) => String(counts[column])), String(subtotal)];
  });

  const totals = LEGAL_CROSSTAB_COLUMNS.map((column, index) =>
    rows.reduce((sum, row) => sum + Number(row[index + 1] || 0), 0)
  );
  rows.push(["Total", ...totals.map(String), String(totals.reduce((sum, value) => sum + value, 0))]);
  return rows;
}

function buildCaseTrendSummaryRows(analyticsData) {
  const trend = analyticsData?.trend || [];
  const statusTrend = analyticsData?.stackedTrend || [];
  const totalFiled = trend.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const peak = trend.reduce((best, item) => Number(item.value || 0) > Number(best?.value || 0) ? item : best, null);
  const latestStatus = statusTrend[statusTrend.length - 1] || {};

  return [
    ["Reports filed in last 30 days", String(totalFiled)],
    ["Average daily filings", trend.length ? (totalFiled / trend.length).toFixed(1) : "0"],
    ["Peak filing day", peak ? `${peak.label} (${peak.value})` : "No filings"],
    ["Latest Submitted count", String(latestStatus.Submitted || 0)],
    ["Latest Undergoing Review count", String(latestStatus["Undergoing Review"] || 0)],
    ["Latest Closed count", String(latestStatus.Closed || 0)],
  ];
}

function addPdfFooter(doc, generatedAt) {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const footerText = `Generated ${generatedAt.toLocaleDateString("en-PH")} - Confidential - For internal use only`;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(222, 226, 230);
    doc.line(40, height - 42, width - 40, height - 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerText, 40, height - 24);
    doc.text(`Page ${page} of ${pageCount}`, width - 40, height - 24, { align: "right" });
  }
}

function addPdfCoverPage(doc, { dateRange, generatedAt, modules }) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(3, 127, 129);
  doc.rect(0, 0, width, 145, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(40, 36, 104, 54, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(3, 127, 129);
  doc.text("SAVIRA", 92, 58, { align: "center" });
  doc.setFontSize(10);
  doc.text("SASHA", 92, 76, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.text("Report", 40, 188);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Aggregate system summary for internal review.", 40, 212);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Date Range", 40, 280);
  doc.text("Generated", 40, 325);
  doc.text("Included Modules", 40, 370);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(getDateRangeLabel(dateRange), 170, 280);
  doc.text(generatedAt.toLocaleString("en-PH"), 170, 325);

  let y = 370;
  modules.forEach((reportModule) => {
    doc.circle(174, y - 4, 2.5, "F");
    doc.text(reportModule.title, 185, y);
    y += 20;
  });

  doc.setFillColor(255, 247, 237);
  doc.roundedRect(40, height - 150, width - 80, 58, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(154, 52, 18);
  doc.text("Confidential - For internal use only", 58, height - 118);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 53, 15);
  doc.text("This PDF contains aggregate report data only and must be handled according to SAVIRA/SASHA data privacy protocols.", 58, height - 98, {
    maxWidth: width - 116,
  });
}

function ensurePdfSpace(doc, cursor, requiredHeight) {
  const height = doc.internal.pageSize.getHeight();
  if (cursor.y + requiredHeight > height - 64) {
    doc.addPage();
    cursor.y = 44;
  }
}

function addPdfSectionTitle(doc, title, cursor) {
  ensurePdfSpace(doc, cursor, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(3, 127, 129);
  doc.text(title, 40, cursor.y);
  cursor.y += 18;
}

function addPdfTable(doc, { title, headers, rows }, cursor) {
  const width = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = width - margin * 2;
  const safeRows = rows?.length ? rows : [["No data available", "", ""]];
  const colWidths = headers.length === 2
    ? [contentWidth * 0.68, contentWidth * 0.32]
    : headers.length === 3
      ? [contentWidth * 0.58, contentWidth * 0.2, contentWidth * 0.22]
      : [contentWidth * 0.3, ...Array(headers.length - 1).fill((contentWidth * 0.7) / (headers.length - 1))];
  const rowHeight = 18;

  addPdfSectionTitle(doc, title, cursor);
  ensurePdfSpace(doc, cursor, rowHeight * 2);

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursor.y, contentWidth, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  let x = margin;
  headers.forEach((header, index) => {
    doc.text(header, x + 6, cursor.y + 12, { maxWidth: colWidths[index] - 12 });
    x += colWidths[index];
  });
  cursor.y += rowHeight;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  safeRows.forEach((row, rowIndex) => {
    ensurePdfSpace(doc, cursor, rowHeight);
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, cursor.y, contentWidth, rowHeight, "F");
    }
    x = margin;
    row.forEach((cell, index) => {
      const align = index > 0 && headers.length > 2 ? "right" : "left";
      const cellX = align === "right" ? x + colWidths[index] - 6 : x + 6;
      doc.text(String(cell ?? ""), cellX, cursor.y + 12, {
        maxWidth: colWidths[index] - 12,
        align,
      });
      x += colWidths[index];
    });
    cursor.y += rowHeight;
  });
  cursor.y += 10;
}

function addMetricTiles(doc, metrics, cursor) {
  const margin = 40;
  const width = doc.internal.pageSize.getWidth();
  const gap = 10;
  const columns = 2;
  const tileWidth = (width - margin * 2 - gap) / columns;
  const tileHeight = 52;

  ensurePdfSpace(doc, cursor, Math.ceil(metrics.length / columns) * (tileHeight + gap));
  const startY = cursor.y;
  metrics.forEach((metric, index) => {
    const row = Math.floor(index / columns);
    const y = startY + row * (tileHeight + gap);
    const x = margin + (index % columns) * (tileWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, tileWidth, tileHeight, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(3, 127, 129);
    doc.text(String(metric.value ?? 0), x + 14, y + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(metric.label, x + 14, y + 38, { maxWidth: tileWidth - 28 });
  });
  cursor.y += Math.ceil(metrics.length / columns) * (tileHeight + gap) + 10;
}

function addModulePage(doc, title, metrics, tables) {
  doc.addPage();
  const cursor = { y: 44 };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(3, 127, 129);
  doc.text(title, 40, cursor.y);
  cursor.y += 28;
  addMetricTiles(doc, metrics, cursor);
  tables.forEach((table) => addPdfTable(doc, table, cursor));
}

function buildPdfModules({ activeModules, dataAvailability, rawData, analyticsData }) {
  const modules = [];
  const cases = rawData?.cases || [];

  if (activeModules.cases && dataAvailability.caseData) {
    modules.push({
      key: "cases",
      title: "Case Management",
      metrics: [
        { label: "Open Reports", value: dataAvailability.caseData.openCases },
        { label: "Under Investigation", value: analyticsData?.underInvestigation ?? 0 },
        { label: "Completed Reports", value: dataAvailability.caseData.closedCases },
        { label: "Total Cases", value: dataAvailability.caseData.total },
      ],
      tables: [
        { title: "Last 30 Days Numeric Summary", headers: ["Metric", "Value"], rows: buildCaseTrendSummaryRows(analyticsData) },
        { title: "Reports by City", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.caseData.byCity, dataAvailability.caseData.total) },
        { title: "Reports by Status", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.caseData.byStatus, dataAvailability.caseData.total) },
        { title: "Case Types", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.caseData.byType, dataAvailability.caseData.total) },
        { title: "Perpetrator Relationship", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(countBy(cases, (item) => item.perpetrator_relationship), cases.length) },
        { title: "Perpetrator Occupation", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(countBy(cases, (item) => item.perpetrator_occupation), cases.length) },
        { title: "Incident Location Type", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(countBy(cases, (item) => item.incident_location_type), cases.length) },
        { title: "Incident Location", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(countBy(cases, (item) => item.incident_location), cases.length) },
        { title: "Harassment/Abuse Categories", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(countBy(cases, (item) => [item.primary_category, ...(item.additional_categories || [])].filter(Boolean))) },
        {
          title: "Legal Endorsement Crosstab",
          headers: ["Endorsed To", ...LEGAL_CROSSTAB_COLUMNS, "Subtotal"],
          rows: buildEndorsementCrosstabRows(cases),
        },
      ],
    });
  }

  if (activeModules.legal && dataAvailability.legalData) {
    modules.push({
      key: "legal",
      title: "Legal Review",
      metrics: [
        { label: "Cases in Legal", value: dataAvailability.legalData.total },
        { label: "Cases Filed", value: dataAvailability.legalData.casesFiled },
        { label: "Cases Resolved", value: dataAvailability.legalData.casesResolved },
        { label: "Referrals Suggested", value: dataAvailability.legalData.referralSuggested },
      ],
      tables: [
        { title: "Legal Cases by City", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.legalData.byCity, dataAvailability.legalData.total) },
        { title: "Legal Case Status Distribution", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.legalData.byStatus, dataAvailability.legalData.total) },
        { title: "Legal Case Types", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.legalData.byType, dataAvailability.legalData.total) },
        { title: "Referral Outcome", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.legalData.referralBreakdown) },
      ],
    });
  }

  if (activeModules.volunteers && dataAvailability.volunteerData) {
    modules.push({
      key: "volunteers",
      title: "Volunteer Application Management",
      metrics: [
        { label: "Total Applications", value: dataAvailability.volunteerData.total },
        { label: "Approval Rate", value: `${dataAvailability.volunteerData.approvalRate}%` },
        { label: "Average Score", value: dataAvailability.volunteerData.avgScore },
      ],
      tables: [
        { title: "Applications by Status", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.volunteerData.byStatus, dataAvailability.volunteerData.total) },
        { title: "Top Fields of Background", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(Object.fromEntries(dataAvailability.volunteerData.topFields || [])) },
      ],
    });
  }

  if (activeModules.projects && dataAvailability.projectData) {
    modules.push({
      key: "projects",
      title: "Project Tracker",
      metrics: [
        { label: "Total Projects", value: dataAvailability.projectData.total },
        { label: "Active Projects", value: dataAvailability.projectData.activeProjects },
        { label: "Completed", value: dataAvailability.projectData.completedOnTime },
        { label: "Overdue (Ongoing)", value: dataAvailability.projectData.overdueCount },
      ],
      tables: [
        { title: "Projects by Status", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.projectData.byStatus, dataAvailability.projectData.total) },
        { title: "Projects by Category", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.projectData.byCategory, dataAvailability.projectData.total) },
        { title: "Approval Breakdown", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.projectData.byApproval, dataAvailability.projectData.total) },
      ],
    });
  }

  if (activeModules.users && dataAvailability.userData) {
    modules.push({
      key: "users",
      title: "User Management",
      metrics: [
        { label: "Total Users", value: dataAvailability.userData.total },
        { label: "Active Users", value: dataAvailability.userData.activeUsers },
        { label: "New This Month", value: dataAvailability.userData.newThisMonth },
        { label: "Deactivated", value: dataAvailability.userData.deactivated },
      ],
      tables: [
        { title: "Users by Role", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.userData.byRole, dataAvailability.userData.total) },
        { title: "Users by City", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.userData.byCity, dataAvailability.userData.total) },
        { title: "Active vs. Deactivated", headers: ["Category", "Count", "Percentage"], rows: objectToTableRows(dataAvailability.userData.activeBreakdown, dataAvailability.userData.total) },
      ],
    });
  }

  return modules;
}

async function exportToPDF({ activeModules, dateRange, dataAvailability, rawData, analyticsData }) {
  const generatedAt = new Date();
  const modules = buildPdfModules({ activeModules, dataAvailability, rawData, analyticsData });
  if (modules.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  addPdfCoverPage(doc, { dateRange, generatedAt, modules });

  modules.forEach((reportModule) => {
    addModulePage(doc, reportModule.title, reportModule.metrics, reportModule.tables);
  });

  addPdfFooter(doc, generatedAt);
  return {
    blob: doc.output("blob"),
    filename: `report_${generatedAt.toISOString().slice(0, 10)}.pdf`,
  };
}

function getActiveReportModules(activeModules = {}) {
  return Object.entries(activeModules)
    .filter(([, enabled]) => enabled)
    .map(([moduleName]) => moduleName);
}

function recordReportGeneration({ format, modules, dateRange, fileName }) {
  internalApiFetch("/api/reports/generation-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      format,
      modules,
      date_range: dateRange,
      file_name: fileName,
    }),
  }).then((response) => {
    if (!response.ok) {
      console.warn(`Report generation audit log failed (${response.status}).`);
    }
  }).catch((err) => {
    console.warn("Report generation audit log failed.", err);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TREND LINE CHART (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function TrendLineChart({ data, color = "#037F81", height = 120 }) {
  if (!data || data.length === 0) return <p className={styles.noData}>No trend data available.</p>;

  const W = 700, H = height;
  const PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const values = data.map((d) => d.value);
  const maxVal  = Math.max(...values, 1);
  const minVal  = 0;

  const xStep = chartW / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top  + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH,
    label: d.label,
    value: d.value,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const fillPath = `M ${pts[0].x},${PAD.top + chartH} ` +
    pts.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${pts[pts.length - 1].x},${PAD.top + chartH} Z`;

  // Show only first, middle, last labels to avoid clutter
  const labelIdxs = new Set([0, Math.floor(data.length / 2), data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.trendSvg} aria-label="Trend line chart">
      {/* Area fill */}
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#trendGrad)" />
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = PAD.top + chartH * (1 - pct);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#e5e7eb" strokeWidth="0.8" />
            <text x={PAD.left - 4} y={y + 4} fontSize="9" textAnchor="end" fill="#9ca3af">
              {Math.round(minVal + pct * (maxVal - minVal))}
            </text>
          </g>
        );
      })}
      {/* Polyline */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={color} />
          {labelIdxs.has(i) && (
            <text x={p.x} y={PAD.top + chartH + 16} fontSize="9" textAnchor="middle" fill="#9ca3af">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STACKED AREA CHART (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function StackedAreaChart({ data, height = 120 }) {
  if (!data || data.length === 0) return <p className={styles.noData}>No trend data available.</p>;

  const W = 700, H = height;
  const PAD = { top: 10, right: 10, bottom: 28, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const series = ["Submitted", "Undergoing Review", "Closed"];
  const colors = { Submitted: "#14b8a6", "Undergoing Review": "#60a5fa", Closed: "#fbbf24" };
  const fillAlpha = { Submitted: "0.55", "Undergoing Review": "0.45", Closed: "0.35" };
  const gradientIdFor = (name) => `stackGrad_${String(name).replace(/[^A-Za-z0-9_-]+/g, "_")}`;

  const maxVal = Math.max(...data.map((d) => (d.Submitted || 0) + (d["Undergoing Review"] || 0) + (d.Closed || 0)), 1);
  const xStep = chartW / Math.max(data.length - 1, 1);

  // Stacked cumulative
  function getStacked(key, idx) {
    let sum = 0;
    for (const s of series) {
      if (s === key) break;
      sum += data[idx][s] || 0;
    }
    return sum + (data[idx][key] || 0);
  }

  function ptY(val) {
    return PAD.top + chartH - (val / maxVal) * chartH;
  }

  const labelIdxs = new Set([0, Math.floor(data.length / 2), data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.trendSvg}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s} id={gradientIdFor(s)} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={colors[s]} stopOpacity={fillAlpha[s]} />
            <stop offset="100%" stopColor={colors[s]} stopOpacity="0.05" />
          </linearGradient>
        ))}
      </defs>

      {/* Grid */}
      {[0, 0.5, 1].map((pct, i) => {
        const y = PAD.top + chartH * (1 - pct);
        return <line key={i} x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#e5e7eb" strokeWidth="0.8" />;
      })}

      {/* Areas (drawn in reverse so topmost series shows on top) */}
      {[...series].reverse().map((s) => {
        const topPts  = data.map((d, i) => ({ x: PAD.left + i * xStep, y: ptY(getStacked(s, i)) }));
        const prevKey = series[series.indexOf(s) - 1];
        const botPts  = prevKey
          ? data.map((d, i) => ({ x: PAD.left + i * xStep, y: ptY(getStacked(prevKey, i)) }))
          : data.map((d, i) => ({ x: PAD.left + i * xStep, y: PAD.top + chartH }));

        const d = `M ${botPts[0].x},${botPts[0].y} ` +
          topPts.map((p) => `L ${p.x},${p.y}`).join(" ") +
          " " + [...botPts].reverse().map((p) => `L ${p.x},${p.y}`).join(" ") + " Z";
        const line = topPts.map((p) => `${p.x},${p.y}`).join(" ");

        return (
          <g key={s}>
            <path d={d} fill={`url(#${gradientIdFor(s)})`} />
            <polyline points={line} fill="none" stroke={colors[s]} strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        );
      })}

      {/* X labels */}
      {data.map((d, i) => (
        labelIdxs.has(i) && (
          <text key={i} x={PAD.left + i * xStep} y={PAD.top + chartH + 16} fontSize="9" textAnchor="middle" fill="#9ca3af">
            {d.label}
          </text>
        )
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HORIZONTAL BAR CHART (for city/type breakdowns like the image)
// ─────────────────────────────────────────────────────────────────────────────

function HorizontalBarList({ entries, color = "#037F81", total }) {
  if (!entries || entries.length === 0) return <p className={styles.noData}>No data available.</p>;
  const max = entries[0]?.[1] || 1;
  const grandTotal = total || entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className={styles.hBarList}>
      {entries.map(([label, value], i) => {
        const pct = Math.round((value / grandTotal) * 100);
        const barPct = Math.round((value / max) * 100);
        return (
          <div key={i} className={styles.hBarItem}>
            <div className={styles.hBarTop}>
              <span className={styles.hBarLabel} title={label}>
                {label.length > 22 ? label.slice(0, 22) + "…" : label}
              </span>
              <span className={styles.hBarMeta}>
                <strong>{value}</strong> <span className={styles.hBarPct}>({pct}%)</span>
              </span>
            </div>
            <div className={styles.hBarTrack}>
              <div className={styles.hBarFill} style={{ width: `${barPct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL BAR CHART (kept for other sections)
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({ data, color, colorVar = "--accent-primary", height = 200 }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <p className={styles.noData}>No data available.</p>;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  // Use an explicit hex color when provided so it reliably renders in @media print
  // (CSS custom properties can fail to resolve in browser print contexts).
  const fillColor = color || `var(${colorVar})`;

  return (
    <div className={styles.barChart} style={{ height }}>
    {entries.map(([label, value], i) => (
      <div key={i} className={styles.barItem}>
        <span className={styles.barValue}>{value}</span>

        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{
              height: `${(value / max) * 100}%`,
              background: fillColor,
            }}
          />
        </div>

        <span className={styles.barLabel}>{label}</span>
      </div>
    ))}
  </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONUT CHART — true donut (ring) with distinct colors + pct legend
// ─────────────────────────────────────────────────────────────────────────────

function DonutChart({ data, colors }) {
  const entries = Object.entries(data || {}).filter(([, value]) => Number(value) > 0);
  if (!entries.length) return <p className={styles.noData}>No data available.</p>;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p className={styles.noData}>No data available.</p>;

  const palette = colors || DONUT_COLORS_STATUS;

  const R = 34, cx = 50, cy = 50;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;

  const segments = entries.map(([label, value], i) => {
    const pct = value / total;
    const length = pct * circumference;
    const offset = cumulative * circumference;
    cumulative += pct;

    return {
      color: palette[i % palette.length],
      label,
      value,
      pct: Math.round(pct * 100),
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset,
    };
  });

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 100 100" className={styles.donutSvg}>
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="#eef2f6"
          strokeWidth={strokeWidth}
        />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize="10" fontWeight="800" fill="#292929">{total}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6"  fill="#9ca3af">total</text>
      </svg>
      <div className={styles.donutLegend}>
        {segments.map((s, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendVal}>{s.value}</span>
            <span className={styles.legendPct}>({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false, border }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""}`}
      style={border ? { borderTopColor: border, borderTopWidth: 3 } : undefined}
    >
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT PILL STRIP (like the image "Reports increased by 92.7%...")
// ─────────────────────────────────────────────────────────────────────────────

function InsightStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={styles.insightStrip}>
      {items.map((text, i) => (
        <div key={i} className={styles.insightPill}>{text}</div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function ReportSection({ icon, title, children, id }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className={styles.reportSection} id={id}>
      <div className={styles.sectionHeader} onClick={() => setCollapsed((c) => !c)}>
        <div className={styles.sectionTitleRow}>
          <span className={styles.sectionIcon}>{icon}</span>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        <span className={`${styles.collapseIcon} ${collapsed ? styles.collapsed : ""}`}>
          <FiChevronDown />
        </span>
      </div>
      {!collapsed && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED FILTERS PANEL (inline, styled like FilterMenu.js)
// ─────────────────────────────────────────────────────────────────────────────

// function AdvancedFilterPanel({ filters, onChange, sites, caseTypes, userRoles, cities }) {
//   const [citySearch,   setCitySearch]   = useState("");
//   const [siteSearch,   setSiteSearch]   = useState("");
//   const [typeSearch,   setTypeSearch]   = useState("");
//   const [statusSearch, setStatusSearch] = useState("");
//   const [roleSearch,   setRoleSearch]   = useState("");

//   const [openDropdown, setOpenDropdown] = useState(null); // "from"|"to"|"site"|"city"|"caseStatus"|"caseType"|"userRole"
//   const panelRef = useRef(null);

//   useEffect(() => {
//     function outside(e) {
//       if (panelRef.current && !panelRef.current.contains(e.target)) setOpenDropdown(null);
//     }
//     document.addEventListener("mousedown", outside);
//     return () => document.removeEventListener("mousedown", outside);
//   }, []);

//   function set(key, val) {
//     onChange({ ...filters, [key]: val });
//   }

//   function clearAll() {
//     onChange({ from: "", to: "", site: "all", city: "all", caseStatus: "all", caseType: "all", userRole: "all" });
//   }

//   function activeCount() {
//     let n = 0;
//     if (filters.from) n++;
//     if (filters.to) n++;
//     if (filters.site && filters.site !== "all") n++;
//     if (filters.city && filters.city !== "all") n++;
//     if (filters.caseStatus && filters.caseStatus !== "all") n++;
//     if (filters.caseType && filters.caseType !== "all") n++;
//     if (filters.userRole && filters.userRole !== "all") n++;
//     return n;
//   }

//   // Generic searchable select dropdown
//   function SearchableSelect({ id, label, value, options, search, onSearch, onSelect, placeholder = "Search…" }) {
//     const isOpen = openDropdown === id;
//     const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
//     const displayVal = (!value || value === "all") ? "All" : value;

//     return (
//       <div className={styles.afFilter}>
//         <span className={styles.afFilterLabel}>{label}</span>
//         <button
//           className={`${styles.afFilterBtn} ${value && value !== "all" ? styles.afFilterBtnActive : ""}`}
//           onClick={() => setOpenDropdown(isOpen ? null : id)}
//         >
//           <span className={styles.afFilterVal}>{displayVal}</span>
//           <FiChevronDown size={12} />
//         </button>
//         {isOpen && (
//           <div className={styles.afDropdown}>
//             <div className={styles.afDropSearch}>
//               <FiSearch size={12} className={styles.afDropSearchIcon} />
//               <input
//                 type="text"
//                 className={styles.afDropSearchInput}
//                 placeholder={placeholder}
//                 value={search}
//                 onChange={(e) => onSearch(e.target.value)}
//                 autoFocus
//               />
//               {search && (
//                 <button className={styles.afDropSearchClear} onClick={() => onSearch("")}>
//                   <FiX size={11} />
//                 </button>
//               )}
//             </div>
//             <div className={styles.afDropList}>
//               {!search && (
//                 <button
//                   className={`${styles.afDropOption} ${(!value || value === "all") ? styles.afDropOptionActive : ""}`}
//                   onClick={() => { onSelect("all"); setOpenDropdown(null); onSearch(""); }}
//                 >
//                   All
//                 </button>
//               )}
//               {filtered.map((opt) => (
//                 <button
//                   key={opt}
//                   className={`${styles.afDropOption} ${value === opt ? styles.afDropOptionActive : ""}`}
//                   onClick={() => { onSelect(opt); setOpenDropdown(null); onSearch(""); }}
//                 >
//                   {opt}
//                 </button>
//               ))}
//               {filtered.length === 0 && <div className={styles.afDropEmpty}>No results found</div>}
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   const count = activeCount();

//   return (
//     <div className={styles.advancedFilterWrap} ref={panelRef}>
//       <div className={styles.afHeader}>
//         <span className={styles.afTitle}>
//           <FiFilter size={13} /> Advanced Filters
//           {count > 0 && <span className={styles.afBadge}>{count}</span>}
//         </span>
//         <span className={styles.afSubtitle}>Refine trends, attention queues, and insights by scope and date range</span>
//         {count > 0 && (
//           <button className={styles.afClearBtn} onClick={clearAll}>
//             <FiX size={11} /> Clear all
//           </button>
//         )}
//       </div>

//       <div className={styles.afRow}>
//         {/* From date */}
//         <div className={styles.afFilter}>
//           <span className={styles.afFilterLabel}>From</span>
//           <input
//             type="date"
//             className={`${styles.afDateInput} ${filters.from ? styles.afDateInputActive : ""}`}
//             value={filters.from || ""}
//             onChange={(e) => set("from", e.target.value)}
//           />
//         </div>

//         {/* To date */}
//         <div className={styles.afFilter}>
//           <span className={styles.afFilterLabel}>To</span>
//           <input
//             type="date"
//             className={`${styles.afDateInput} ${filters.to ? styles.afDateInputActive : ""}`}
//             value={filters.to || ""}
//             onChange={(e) => set("to", e.target.value)}
//           />
//         </div>

//         {/* Site */}
//         <SearchableSelect
//           id="site"
//           label="Site"
//           value={filters.site}
//           options={sites}
//           search={siteSearch}
//           onSearch={setSiteSearch}
//           onSelect={(v) => set("site", v)}
//           placeholder="Search site…"
//         />

//         {/* City */}
//         <SearchableSelect
//           id="city"
//           label="City"
//           value={filters.city}
//           options={cities.length ? cities : CITIES}
//           search={citySearch}
//           onSearch={setCitySearch}
//           onSelect={(v) => set("city", v)}
//           placeholder="Search city…"
//         />

//         {/* Case Status */}
//         <SearchableSelect
//           id="caseStatus"
//           label="Case Status"
//           value={filters.caseStatus}
//           options={ALL_CASE_STATUSES}
//           search={statusSearch}
//           onSearch={setStatusSearch}
//           onSelect={(v) => set("caseStatus", v)}
//           placeholder="Search status…"
//         />

//         {/* Case Type */}
//         <SearchableSelect
//           id="caseType"
//           label="Case Type"
//           value={filters.caseType}
//           options={caseTypes.length ? caseTypes : CASE_TYPES}
//           search={typeSearch}
//           onSearch={setTypeSearch}
//           onSelect={(v) => set("caseType", v)}
//           placeholder="Search type…"
//         />

//         {/* User Role */}
//         <SearchableSelect
//           id="userRole"
//           label="User Role"
//           value={filters.userRole}
//           options={userRoles.length ? userRoles : USER_ROLES}
//           search={roleSearch}
//           onSearch={setRoleSearch}
//           onSelect={(v) => set("userRole", v)}
//           placeholder="Search role…"
//         />
//       </div>
//     </div>
//   );
// }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportGenerator() {
  const [dateRange, setDateRange]         = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState({
    from: "",
    to: "",
    site: "all",
    city: "all",
    caseStatus: "all",
    caseType: "all",
    userRole: "all",
  });
  const [activeModules, setActiveModules] = useState({
    cases:      true,
    legal:      true,
    volunteers: true,
    projects:   true,
    users:      true,
  });
  const [loading, setLoading]               = useState(true);
  const [lastGenerated, setLastGenerated]   = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingPdf, setExportingPdf]     = useState(false);
  const [pdfPreview, setPdfPreview]         = useState(null);
  const [error, setError]                   = useState(null);
  const exportMenuRef                       = useRef(null);
  const rawRef = useRef({ cases: [], legalCases: [], volunteers: [], projects: [], users: [], statusHistoryByCaseId: {} });
  const [filterOptionsSource, setFilterOptionsSource] = useState({ cases: [], volunteers: [], users: [] });

  const [caseData,      setCaseData]      = useState(null);
  const [legalData,     setLegalData]     = useState(null);
  const [volunteerData, setVolunteerData] = useState(null);
  const [projectData,   setProjectData]   = useState(null);
  const [userData,      setUserData]      = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function handleOutsideClick(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [exportMenuOpen]);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    };
  }, [pdfPreview]);

  const buildSummaries = useCallback((raw, range, filters) => {
    const { cases, legalCases, volunteers, projects, users } = applyAdvancedFilters(raw, range, filters);

    setCaseData(buildCaseSummary(cases));
    setLegalData(buildLegalSummary(legalCases));
    setVolunteerData(buildVolunteerSummary(volunteers));
    setProjectData(buildProjectSummary(projects));
    setUserData(buildUserSummary(users));
    setAnalyticsData(buildAnalytics(cases, volunteers, projects, users, raw.statusHistoryByCaseId));
    setLastGenerated(new Date());
  }, []);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, volunteersRes, projectsRes, usersRes, legalRes] = await Promise.allSettled([
        internalApiFetch(`/api/case_reports/all`,       { credentials: "include" }),
        internalApiFetch(`/api/volunteer_applications`, { credentials: "include" }),
        internalApiFetch(`/api/reports/projects`,       { credentials: "include" }),
        internalApiFetch(`/api/users`,                  { credentials: "include" }),
        internalApiFetch(`/api/legal_reviews/management`, { credentials: "include" }),
      ]);

      const safeJson = async (settled) => {
        if (settled.status !== "fulfilled" || !settled.value.ok) return null;
        try { return await settled.value.json(); } catch { return null; }
      };

      const [casesRaw, volunteersRaw, projectsRaw, usersRaw, legalRaw] = await Promise.all([
        safeJson(casesRes), safeJson(volunteersRes), safeJson(projectsRes), safeJson(usersRes), safeJson(legalRes),
      ]);

      const normalizedCases = toArray(casesRaw).map(normalizeCaseReport);
      const legalPayload = legalRaw?.data || legalRaw;
      const normalizedLegalCases = toArray(legalPayload?.cases || legalRaw).map(normalizeCaseReport);
      const statusHistoryByCaseId = await fetchApprovedStatusHistoryMap(normalizedCases);

      rawRef.current = {
        cases:      normalizedCases,
        legalCases: normalizedLegalCases,
        volunteers: toArray(volunteersRaw).map(normalizeVolunteerApplication),
        projects:   toArray(projectsRaw).map(normalizeProject),
        users:      toArray(usersRaw).map(normalizeUser),
        statusHistoryByCaseId,
      };
      setFilterOptionsSource(rawRef.current);

      buildSummaries(rawRef.current, dateRange, advancedFilters);
    } catch (err) {
      console.error("Report generation failed:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, advancedFilters, buildSummaries]);

  useEffect(() => {
    const id = setTimeout(() => { generateReport(); }, 0);
    return () => clearTimeout(id);
  }, [generateReport]);

  useEffect(() => {
    if (!loading) buildSummaries(rawRef.current, dateRange, advancedFilters);
  }, [advancedFilters, dateRange, loading, buildSummaries]);

  const filterOptions = useMemo(() => {
    const clean = (values) => [...new Set(values.filter(Boolean))].map(String).sort((a, b) => a.localeCompare(b));
    return {
      sites:     clean([...filterOptionsSource.cases.map((c) => c.site || c.region), ...filterOptionsSource.volunteers.map((v) => v.site)]),
      caseTypes: clean(filterOptionsSource.cases.map((c) => c.case_type)),
      roles:     clean(filterOptionsSource.users.map((u) => u.role_name)),
      cities:    clean(filterOptionsSource.cases.map((c) => c.city).filter(Boolean)),
    };
  }, [filterOptionsSource]);

  function toggleModule(key) {
    setActiveModules((prev) => {
      if (prev[key] && Object.values(prev).filter(Boolean).length <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  }

  async function handleExportXLSX() {
    setExportMenuOpen(false);
    try {
      const result = await exportToXLSX({
        activeModules,
        dataAvailability: {
          caseData,
          legalData,
          volunteerData,
          projectData,
          userData,
        },
        analyticsData,
      });
      if (result?.filename) {
        recordReportGeneration({
          format: "xlsx",
          modules: getActiveReportModules(activeModules),
          dateRange,
          fileName: result.filename,
        });
      }
    } catch (err) {
      console.error("Excel export failed:", err);
      setError("Failed to generate Excel workbook. Please try again.");
    }
  }

  async function handleExportPDF() {
    setExportMenuOpen(false);
    setExportingPdf(true);
    try {
      const result = await exportToPDF({
        activeModules,
        dateRange,
        dataAvailability: {
          caseData,
          legalData,
          volunteerData,
          projectData,
          userData,
        },
        rawData: rawRef.current,
        analyticsData,
      });
      if (result?.blob) {
        setPdfPreview((current) => {
          if (current?.url) URL.revokeObjectURL(current.url);
          return {
            url: URL.createObjectURL(result.blob),
            filename: result.filename,
          };
        });
        recordReportGeneration({
          format: "pdf",
          modules: getActiveReportModules(activeModules),
          dateRange,
          fileName: result.filename,
        });
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }

  function closePdfPreview() {
    setPdfPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  // Build insight strip for the analytics overview
  const insights = analyticsData ? [
    `Cases in period: ${analyticsData.caseSummary?.total ?? 0}`,
    `Volunteer approval rate: ${analyticsData.volunteerSummary?.approvalRate ?? 0}%`,
    // `Health score: ${analyticsData.healthScore}/100`,
  ] : [];

  return (
    <div className={styles.page}>
      <div className={styles.contentShell}>

      {/* ── Header ── */}
      <div className={styles.pageHeader} data-no-print>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            <FiBarChart2 className={styles.titleIcon} />
            Reports
          </h1>
          <p className={styles.pageSubtitle}>
            Aggregated report summaries across all system modules.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.selectWrap}>
            <FiCalendar className={styles.selectIcon} />
            <select
              className={styles.rangeSelect}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              {DATE_RANGES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <button className={styles.btnRefresh} onClick={generateReport} disabled={loading}>
            <FiRefreshCw className={loading ? styles.spinning : ""} />
            {loading ? "Generating…" : "Regenerate"}
          </button>

          <div className={styles.exportMenuWrap} ref={exportMenuRef}>
            <button className={styles.btnExport} onClick={() => setExportMenuOpen((o) => !o)}>
              <FiDownload /> Export <FiChevronDown />
            </button>
            {exportMenuOpen && (
              <div className={styles.exportDropdown}>
                <button className={styles.exportOption} onClick={handleExportPDF} disabled={exportingPdf}>
                  <FiPrinter /> {exportingPdf ? "Generating PDF..." : "Export as PDF"}
                </button>
                <button className={styles.exportOption} onClick={handleExportXLSX}>
                  <FiFileText /> Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {/* <AdvancedFilterPanel
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        sites={filterOptions.sites}
        caseTypes={filterOptions.caseTypes}
        userRoles={filterOptions.roles}
        cities={filterOptions.cities}
      /> */}

      {/* ── Module toggles ── */}
      <div className={styles.moduleToggles} data-no-print>
        <span className={styles.togglesLabel}><FiFilter size={13} /> Modules:</span>
        {[
          { key: "cases",      label: "Case Management",  icon: <FiBriefcase size={12} /> },
          { key: "legal",      label: "Legal Review",     icon: <FiShield size={12} /> },
          { key: "volunteers", label: "Volunteer Apps",   icon: <FiUsers size={12} /> },
          { key: "projects",   label: "Project Tracker",  icon: <FiLayers size={12} /> },
          { key: "users",      label: "User Management",  icon: <FiUsers size={12} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            className={`${styles.moduleChip} ${activeModules[key] ? styles.moduleChipActive : ""}`}
            aria-pressed={activeModules[key]}
            onClick={() => toggleModule(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {lastGenerated && (
        <p className={styles.lastGenerated} data-no-print>
          Last generated: {lastGenerated.toLocaleString()}
          &nbsp;·&nbsp; Date range: <strong>{DATE_RANGES.find((d) => d.value === dateRange)?.label}</strong>
        </p>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {!loading && !error && (
        <div className={styles.reportContent}>

          {/* ══ CASE MANAGEMENT ══ */}
          {activeModules.cases && caseData && analyticsData && (
            <ReportSection icon={<FiBriefcase />} title="Case Management" id="section-cases">

              {/* KPI cards — styled like dashboard image top row */}
              <div className={styles.statsRow}>
                <StatCard label="Open Reports"        value={caseData.openCases}        sub="Active / unresolved"              accent border="#037F81" />
                <StatCard label="Under Investigation" value={analyticsData.underInvestigation} sub="Investigation / Hearing / Eval" border="#60a5fa" />
                <StatCard label="Completed Reports"   value={caseData.closedCases}       sub="Resolved, dismissed, or withdrawn" border="#16a34a" />
                <StatCard label="Total Cases"         value={caseData.total}             sub="In selected period"               border="#E8663A" />
              </div>

              {/* Trend charts */}
              <div className={styles.trendSection}>
                <div className={styles.trendCard}>
                  <div className={styles.trendCardHeader}>
                    <h3 className={styles.chartTitle}>Case Reports (Last 30 Days)</h3>
                  </div>
                  <TrendLineChart data={analyticsData.trend} color="#037F81" height={130} />
                </div>

                <div className={styles.trendCard}>
                  <div className={styles.trendCardHeader}>
                    <h3 className={styles.chartTitle}>Report Status Composition Over Time</h3>
                    <div className={styles.stackedLegend}>
                      {[{ label: "Submitted", color: "#14b8a6" }, { label: "Undergoing Review", color: "#60a5fa" }, { label: "Closed", color: "#fbbf24" }].map((l) => (
                        <span key={l.label} className={styles.stackedLegendItem}>
                          <span className={styles.stackedLegendDot} style={{ background: l.color }} />{l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <StackedAreaChart data={analyticsData.stackedTrend} height={130} />
                </div>
              </div>

              {/* BREAKDOWNS — like the image */}
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownHeader}>
                  <h3 className={styles.breakdownTitle}>Breakdowns</h3>
                  <span className={styles.breakdownSub}>Status distribution and concentration by city and case type</span>
                </div>
                <div className={styles.breakdownGrid}>

                  {/* Cases by City */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiMapPin size={12} style={{ marginRight: 4 }} />
                      Reports by City
                    </h4>
                    <HorizontalBarList
                      entries={analyticsData.topCities}
                      color="#037F81"
                      total={caseData.total}
                    />
                  </div>

                  {/* Cases by Status (donut) */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>Reports by Status</h4>
                    <DonutChart data={caseData.byStatus} colors={DONUT_COLORS_STATUS} />
                  </div>

                  {/* Case Types (donut) */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>Case Types</h4>
                    <DonutChart
                      data={Object.fromEntries(
                        Object.entries(caseData.byType).map(([k, v]) => [
                          k.length > 28 ? k.slice(0, 28) + "…" : k, v,
                        ])
                      )}
                      colors={DONUT_COLORS_CASETYPE}
                    />
                  </div>

                </div>
              </div>

            </ReportSection>
          )}

          {/* ══ LEGAL REVIEW ══ */}
          {activeModules.legal && legalData && (
            <ReportSection icon={<FiShield />} title="Legal Review" id="section-legal">
              <div className={styles.statsRow}>
                <StatCard label="Cases in Legal"       value={legalData.total}            accent />
                <StatCard label="Cases Filed"          value={legalData.casesFiled}        sub="Elevated to formal filing" />
                <StatCard label="Cases Resolved"       value={legalData.casesResolved}     sub="Convictions + dismissals" />
                <StatCard label="Referrals Suggested"  value={legalData.referralSuggested} sub="NLP-flagged" />
              </div>

              {/* BREAKDOWNS */}
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownHeader}>
                  <h3 className={styles.breakdownTitle}>Breakdowns</h3>
                  <span className={styles.breakdownSub}>Status distribution and concentration by city, case type, and referral outcome</span>
                </div>
                <div className={styles.breakdownGrid}>

                  {/* Legal Cases by City */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiMapPin size={12} style={{ marginRight: 4 }} />
                      Legal Cases by City
                    </h4>
                    <HorizontalBarList
                      entries={Object.entries(legalData.byCity)}
                      color="#4f46e5"
                      total={legalData.total}
                    />
                  </div>

                  {/* Legal Case Status Distribution */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiBarChart2 size={12} style={{ marginRight: 4 }} />
                      Legal Case Status Distribution
                    </h4>
                    <DonutChart data={legalData.byStatus} colors={DONUT_COLORS_LEGAL} />
                  </div>

                  {/* Legal Case Types */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiTag size={12} style={{ marginRight: 4 }} />
                      Legal Case Types
                    </h4>
                    <DonutChart
                      data={Object.fromEntries(
                        Object.entries(legalData.byType).map(([k, v]) => [
                          k.length > 28 ? k.slice(0, 28) + "…" : k, v,
                        ])
                      )}
                      colors={DONUT_COLORS_CASETYPE}
                    />
                  </div>

                  {/* Referral Outcome */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiFlag size={12} style={{ marginRight: 4 }} />
                      Referral Outcome
                    </h4>
                    <DonutChart data={legalData.referralBreakdown} colors={DONUT_COLORS_BINARY} />
                  </div>

                </div>
              </div>
            </ReportSection>
          )}

          {/* ══ VOLUNTEERS ══ */}
          {activeModules.volunteers && volunteerData && (
            <ReportSection icon={<FiUsers />} title="Volunteer Application Management" id="section-volunteers">
              <div className={styles.statsRow}>
                <StatCard label="Total Applications" value={volunteerData.total}        accent />
                <StatCard label="Approval Rate"      value={`${volunteerData.approvalRate}%`} sub="Of processed applications" />
                <StatCard label="Avg. Score"         value={volunteerData.avgScore}     sub="NLP + evaluator combined" />
              </div>

              <div className={styles.breakdownGrid}>
                <div className={styles.breakdownCard}>
                  <h4 className={styles.breakdownCardTitle}>Applications by Status</h4>
                  <DonutChart data={volunteerData.byStatus} colors={DONUT_COLORS_VOLUNTEER} />
                </div>
                <div className={styles.breakdownCard}>
                  <h4 className={styles.breakdownCardTitle}>Top Fields of Background</h4>
                  {volunteerData.topFields && volunteerData.topFields.length > 0 ? (
                    <HorizontalBarList entries={volunteerData.topFields} color="#E8663A" />
                  ) : (
                    <p className={styles.noData}>No field data available.</p>
                  )}
                </div>
              </div>
            </ReportSection>
          )}

          {/* ══ PROJECTS ══ */}
          {activeModules.projects && projectData && (
            <ReportSection icon={<FiLayers />} title="Project Tracker" id="section-projects">
              <div className={styles.statsRow}>
                <StatCard label="Total Projects"   value={projectData.total}          accent />
                <StatCard label="Active Projects"  value={projectData.activeProjects} sub="Currently running" />
                <StatCard label="Completed"        value={projectData.completedOnTime} sub="Marked as completed" />
                <StatCard label="Overdue (Ongoing)" value={projectData.overdueCount}   sub="Past due date, not yet completed" />
              </div>

              <div className={styles.breakdownGrid}>
                <div className={styles.breakdownCard}>
                  <h4 className={styles.breakdownCardTitle}>
                    <FiBarChart2 size={12} style={{ marginRight: 4 }} />
                    Projects by Status
                  </h4>
                  <DonutChart data={projectData.byStatus} colors={DONUT_COLORS_PROJECT} />
                </div>
              </div>
            </ReportSection>
          )}

          {/* ══ USERS ══ */}
          {activeModules.users && userData && (
            <ReportSection icon={<FiUsers />} title="User Management" id="section-users">
              <div className={styles.statsRow}>
                <StatCard label="Total Users"     value={userData.total}       accent />
                <StatCard label="Active Users"    value={userData.activeUsers} />
                <StatCard label="New This Month"  value={userData.newThisMonth} />
                <StatCard label="Deactivated"     value={userData.deactivated} />
              </div>

              {/* BREAKDOWNS */}
              <div className={styles.breakdownSection}>
                <div className={styles.breakdownHeader}>
                  <h3 className={styles.breakdownTitle}>Breakdowns</h3>
                  <span className={styles.breakdownSub}>Distribution by role, location, gender, and account status</span>
                </div>
                <div className={styles.breakdownGrid}>

                  {/* Users by Role */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiBarChart2 size={12} style={{ marginRight: 4 }} />
                      Users by Role
                    </h4>
                    <DonutChart data={userData.byRole} colors={DONUT_COLORS_USER} />
                  </div>

                  {/* Users by City */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiMapPin size={12} style={{ marginRight: 4 }} />
                      Users by City
                    </h4>
                    {Object.keys(userData.byCity).length > 0 ? (
                      <HorizontalBarList
                        entries={Object.entries(userData.byCity)}
                        color="#E8663A"
                        total={userData.total}
                      />
                    ) : (
                      <p className={styles.noData}>No location data available.</p>
                    )}
                  </div>

                  {/* Users by Gender
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiUsers size={12} style={{ marginRight: 4 }} />
                      Users by Gender
                    </h4>
                    <DonutChart data={userData.byGender} colors={DONUT_COLORS_USER} />
                  </div> */}

                  {/* Active vs Deactivated */}
                  <div className={styles.breakdownCard}>
                    <h4 className={styles.breakdownCardTitle}>
                      <FiUserCheck size={12} style={{ marginRight: 4 }} />
                      Active vs. Deactivated
                    </h4>
                    <DonutChart data={userData.activeBreakdown} colors={DONUT_COLORS_BINARY} />
                  </div>

                </div>
              </div>
            </ReportSection>
          )}

        </div>
      )}

      {pdfPreview && (
        <div className={styles.pdfPreviewOverlay} role="dialog" aria-modal="true" aria-label="PDF preview">
          <div className={styles.pdfPreviewModal}>
            <div className={styles.pdfPreviewHeader}>
              <div>
                <h2 className={styles.pdfPreviewTitle}>PDF Preview</h2>
                <p className={styles.pdfPreviewSubtitle}>Review the generated report before downloading.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={closePdfPreview} aria-label="Close PDF preview">
                <FiX />
              </button>
            </div>
            <iframe className={styles.pdfPreviewFrame} src={pdfPreview.url} title="Generated report PDF preview" />
            <div className={styles.pdfPreviewFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closePdfPreview}>Close</button>
              <a className={styles.btnPrimary} href={pdfPreview.url} download={pdfPreview.filename}>
                <FiDownload /> Download PDF
              </a>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
