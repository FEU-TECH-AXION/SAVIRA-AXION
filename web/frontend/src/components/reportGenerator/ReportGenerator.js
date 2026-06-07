"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./ReportGenerator.module.css";
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
} from "react-icons/fi";

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

const VOLUNTEER_STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Waitlisted"];

const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed", "Cancelled"];

const USER_ROLES = ["Admin", "Case Officer", "Legal Personnel", "Staff", "User"];

const DATE_RANGES = [
  { label: "All Time",     value: "all" },
  { label: "Today",        value: "today" },
  { label: "This Week",    value: "thisWeek" },
  { label: "This Month",   value: "thisMonth" },
  { label: "This Year",    value: "thisYear" },
  { label: "Last 30 Days", value: "last30Days" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATE RANGE FILTER — applied client-side after fetch
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — transform raw API data into summary shapes
//
// FIX (bar chart "Unknown" bug): previously countBy() and the summary builders
// fell back to "Unknown" when a field was null/undefined.  The backend now
// always sends normalised, human-readable values, but we also guard here by
// skipping records with no usable category value instead of lumping them into
// a single "Unknown" bar.  That way the bar chart only shows bars for
// categories that actually exist in the data.
// ─────────────────────────────────────────────────────────────────────────────

function buildCaseSummary(cases = []) {
  const byStatus = {};
  const byType   = {};
  const byRegion = {};
  let open = 0, closed = 0, totalResolutionDays = 0, resolvedCount = 0;

  // Pre-seed known categories so the order is deterministic in charts
  ALL_CASE_STATUSES.forEach((s) => { byStatus[s] = 0; });
  CASE_TYPES.forEach((t)         => { byType[t]   = 0; });
  REGIONS.forEach((r)            => { byRegion[r] = 0; });

  for (const c of cases) {
    // ── Status ──────────────────────────────────────────────────────────────
    // FIX: only count if we have a real status string; skip nulls so they
    // never create a spurious "Unknown" or "null" bar.
    if (c.status) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    // ── Case type ────────────────────────────────────────────────────────────
    // FIX: same guard — skip records with no case_type rather than bucketing
    // everything into "Unknown".
    if (c.case_type) {
      byType[c.case_type] = (byType[c.case_type] || 0) + 1;
    }

    // ── Region ───────────────────────────────────────────────────────────────
    // FIX: the backend now exposes incident_location_type as "region". We no
    // longer fall back to "Unknown" when neither field is set.
    const region = c.region || c.location_type;
    if (region) {
      byRegion[region] = (byRegion[region] || 0) + 1;
    }

    // ── Open / closed ────────────────────────────────────────────────────────
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

  // Strip categories that have 0 records so charts don't render empty bars
  const filteredByStatus = Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0));
  const filteredByType   = Object.fromEntries(Object.entries(byType).filter(([, v]) => v > 0));
  const filteredByRegion = Object.fromEntries(Object.entries(byRegion).filter(([, v]) => v > 0));

  return {
    total: cases.length,
    byStatus: filteredByStatus,
    byType:   filteredByType,
    byRegion: filteredByRegion,
    openCases:   open,
    closedCases: closed,
    avgResolutionDays: resolvedCount ? Math.round(totalResolutionDays / resolvedCount) : 0,
  };
}

function buildLegalSummary(legalCases = []) {
  const legalStatuses = [
    "Case Filed", "Investigation Ongoing", "Hearing Ongoing",
    "Dismissed", "Perpetrator Convicted",
  ];
  const byStatus = {};
  legalStatuses.forEach((s) => { byStatus[s] = 0; });

  let totalDays = 0, daysCount = 0, referralSuggested = 0, casesFiled = 0, casesResolved = 0;

  for (const c of legalCases) {
    // FIX: guard null status
    if (c.status) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    const filed  = c.date_filed  || c.dateFiled;
    const closed = c.date_closed || c.dateClosed;
    if (filed && closed) {
      const days = (new Date(closed) - new Date(filed)) / (1000 * 60 * 60 * 24);
      if (!isNaN(days)) { totalDays += days; daysCount++; }
    }
    if (c.referral_suggested || c.referralSuggested) referralSuggested++;
    if (c.status === "Case Filed") casesFiled++;
    if (["Perpetrator Convicted", "Dismissed"].includes(c.status)) casesResolved++;
  }

  const filteredByStatus = Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0));

  return {
    total: legalCases.length,
    byStatus: filteredByStatus,
    avgDaysInLegal: daysCount ? Math.round(totalDays / daysCount) : 0,
    casesFiled,
    casesResolved,
    referralSuggested,
  };
}

function buildVolunteerSummary(applications = []) {
  const byStatus = {};
  VOLUNTEER_STATUSES.forEach((s) => { byStatus[s] = 0; });

  // FIX: the backend returns negotiable_score as "score" after normalization.
  // Guard for both field names just in case.
  let totalScore = 0, scoreCount = 0;
  const fieldCounts = {};

  for (const a of applications) {
    // FIX: guard null status
    if (a.status) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }

    // FIX: read both "score" (normalised) and "negotiable_score" (raw fallback)
    const rawScore = a.score ?? a.negotiable_score;
    if (typeof rawScore === "number") { totalScore += rawScore; scoreCount++; }

    // FIX: read both field name variants the backend might send
    const field =
      a.field_of_background ||
      a.fieldOfBackground   ||
      a.fields_of_expertise ||
      a.fieldsOfExpertise;

    if (field) {
      const fields = Array.isArray(field) ? field : [field];
      for (const f of fields) {
        if (f) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
      }
    }
  }

  const approved  = byStatus["Approved"] || 0;
  const processed = applications.length - (byStatus["Pending"] || 0);
  const approvalRate = processed > 0 ? Math.round((approved / processed) * 1000) / 10 : 0;

  const topFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f]) => f);

  const filteredByStatus = Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0));

  return {
    total: applications.length,
    byStatus: filteredByStatus,
    avgScore: scoreCount ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
    topFields,
    approvalRate,
  };
}

function buildProjectSummary(projects = []) {
  const byStatus = {};
  PROJECT_STATUSES.forEach((s) => { byStatus[s] = 0; });

  let completedOnTime = 0, totalDays = 0, daysCount = 0;

  for (const p of projects) {
    // FIX: guard null status
    if (p.status) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }

    if (p.status === "Completed") {
      const endDate    = p.end_date        || p.endDate;
      const actualEnd  = p.actual_end_date || p.actualEndDate;
      const startDate  = p.start_date      || p.startDate;

      if (endDate && actualEnd && new Date(actualEnd) <= new Date(endDate)) {
        completedOnTime++;
      }
      if (startDate && actualEnd) {
        const days = (new Date(actualEnd) - new Date(startDate)) / (1000 * 60 * 60 * 24);
        if (!isNaN(days)) { totalDays += days; daysCount++; }
      }
    }
  }

  const filteredByStatus = Object.fromEntries(Object.entries(byStatus).filter(([, v]) => v > 0));

  return {
    total: projects.length,
    byStatus: filteredByStatus,
    completedOnTime,
    avgCompletionDays: daysCount ? Math.round(totalDays / daysCount) : 0,
    activeProjects: byStatus["Active"] || 0,
  };
}

function buildUserSummary(users = []) {
  const byRole = {};
  USER_ROLES.forEach((r) => { byRole[r] = 0; });

  let activeUsers = 0, deactivated = 0, newThisMonth = 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const u of users) {
    const rawRole = (
      u.role_name  ||
      u.roleName   ||
      u.role       ||
      u.user_role  ||
      ""
    ).toString().trim();

    // FIX: case-insensitive match so "case officer" matches "Case Officer"
    const matchedRole = USER_ROLES.find((r) => r.toLowerCase() === rawRole.toLowerCase());
    if (matchedRole) {
      byRole[matchedRole]++;
    }
    // FIX: skip unmatched roles rather than lumping them into "Unknown"

    if (u.is_active || u.isActive) activeUsers++;
    else deactivated++;

    const createdAt = u.created_at || u.createdAt;
    if (createdAt && new Date(createdAt) >= startOfMonth) newThisMonth++;
  }

  const filteredByRole = Object.fromEntries(Object.entries(byRole).filter(([, v]) => v > 0));

  return {
    total: users.length,
    byRole: filteredByRole,
    activeUsers,
    newThisMonth,
    deactivated,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function exportToCSV(reportParts) {
  const lines = [];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  for (const { title, summary } of reportParts) {
    lines.push(esc(title));
    lines.push([esc("Metric"), esc("Value")].join(","));

    for (const [key, val] of Object.entries(summary)) {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(val)) {
          lines.push([esc(`${key} — ${subKey}`), esc(subVal)].join(","));
        }
      } else if (Array.isArray(val)) {
        lines.push([esc(key), esc(val.join("; "))].join(","));
      } else {
        lines.push([esc(key), esc(val)].join(","));
      }
    }

    lines.push("");
  }

  const csvContent = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `sasha-report-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToPDF() {
  document.body.classList.add("printing-report");
  window.print();
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-report");
  }, { once: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CHART COMPONENTS (pure SVG, no external deps)
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({ data, colorVar = "--accent-primary", height = 120 }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className={styles.noData}>No data available.</p>;
  const max = Math.max(...entries.map(([, v]) => v));

  return (
    <div className={styles.barChart}>
      {entries.map(([label, value], i) => (
        <div key={i} className={styles.barItem}>
          <div className={styles.barTrack} style={{ height }}>
            <div
              className={styles.barFill}
              style={{
                height: `${Math.max(4, (value / max) * 100)}%`,
                background: `var(${colorVar})`,
                opacity: 0.7 + (i % 3) * 0.1,
              }}
            />
          </div>
          <span className={styles.barLabel}>{label}</span>
          <span className={styles.barValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, colors }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className={styles.noData}>No data available.</p>;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const defaultColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];
  const palette = colors || defaultColors;

  let cumulative = 0;
  const segments = entries.map(([label, value], i) => {
    const pct = value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const r = 40;
    const cx = 50, cy = 50;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: palette[i % palette.length],
      label,
      value,
      pct: Math.round(pct * 100),
    };
  });

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 100 100" className={styles.donutSvg}>
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="var(--bg-primary)" strokeWidth="1" />
        ))}
      </svg>
      <div className={styles.donutLegend}>
        {segments.map((s, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendVal}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCardAccent : ""}`}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportGenerator() {
  const [dateRange, setDateRange]         = useState("thisMonth");
  const [activeModules, setActiveModules] = useState({
    cases:      true,
    legal:      true,
    volunteers: true,
    projects:   true,
    users:      true,
  });
  const [loading, setLoading]             = useState(true);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [error, setError]                 = useState(null);
  const exportMenuRef                     = useRef(null);

  const rawRef = useRef({ cases: [], volunteers: [], projects: [], users: [] });

  const [caseData, setCaseData]           = useState(null);
  const [legalData, setLegalData]         = useState(null);
  const [volunteerData, setVolunteerData] = useState(null);
  const [projectData, setProjectData]     = useState(null);
  const [userData, setUserData]           = useState(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function handleOutsideClick(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [exportMenuOpen]);

  const buildSummaries = useCallback((raw, range) => {
    const legalStatuses = [
      "Case Filed", "Investigation Ongoing", "Hearing Ongoing",
      "Dismissed", "Perpetrator Convicted",
    ];

    const cases      = filterByDateRange(raw.cases,      range, "date_filed",  "dateFiled",  "created_at", "createdAt");
    const volunteers = filterByDateRange(raw.volunteers, range, "created_at",  "createdAt",  "applied_at", "appliedAt");
    const projects   = filterByDateRange(raw.projects,   range, "start_date",  "startDate");
    const users      = filterByDateRange(raw.users,      range, "created_at",  "createdAt");
    const legalCases = cases.filter((c) => legalStatuses.includes(c.status));

    setCaseData(buildCaseSummary(cases));
    setLegalData(buildLegalSummary(legalCases));
    setVolunteerData(buildVolunteerSummary(volunteers));
    setProjectData(buildProjectSummary(projects));
    setUserData(buildUserSummary(users));
    setLastGenerated(new Date());
  }, []);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Preferred: single aggregate call
      const aggRes = await fetch(`${API_URL}/api/reports/aggregate?dateRange=${dateRange}`, {
        credentials: "include",
      }).catch(() => null);

      if (aggRes && aggRes.ok) {
        const agg = await aggRes.json();
        const normalize = (raw) => Array.isArray(raw) ? raw : (raw?.data ?? []);

        rawRef.current = {
          cases:      normalize(agg.cases),
          volunteers: normalize(agg.volunteers),
          projects:   normalize(agg.projects),
          users:      normalize(agg.users),
        };
      } else {
        // Fallback: individual endpoints
        const [cRes, vRes, pRes, uRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/reports/cases`,      { credentials: "include" }),
          fetch(`${API_URL}/api/reports/volunteers`, { credentials: "include" }),
          fetch(`${API_URL}/api/reports/projects`,   { credentials: "include" }),
          fetch(`${API_URL}/api/reports/users`,      { credentials: "include" }),
        ]);

        const failed = [
          cRes.status !== "fulfilled" || !cRes.value.ok ? "cases"      : null,
          vRes.status !== "fulfilled" || !vRes.value.ok ? "volunteers" : null,
          pRes.status !== "fulfilled" || !pRes.value.ok ? "projects"   : null,
          uRes.status !== "fulfilled" || !uRes.value.ok ? "users"      : null,
        ].filter(Boolean);

        if (failed.length) {
          console.warn("Failed endpoints:", failed.join(", "));
        }

        const safeJson = async (settled) => {
          if (settled.status !== "fulfilled" || !settled.value.ok) return null;
          try { return await settled.value.json(); } catch { return null; }
        };

        const [casesRaw, volunteersRaw, projectsRaw, usersRaw] = await Promise.all([
          safeJson(cRes),
          safeJson(vRes),
          safeJson(pRes),
          safeJson(uRes),
        ]);

        const normalize = (raw) => Array.isArray(raw) ? raw : (raw?.data ?? []);

        rawRef.current = {
          cases:      normalize(casesRaw),
          volunteers: normalize(volunteersRaw),
          projects:   normalize(projectsRaw),
          users:      normalize(usersRaw),
        };
      }

      buildSummaries(rawRef.current, dateRange);
    } catch (err) {
      console.error("Report generation failed:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, buildSummaries]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  function toggleModule(key) {
    setActiveModules((prev) => {
      if (prev[key] && Object.values(prev).filter(Boolean).length <= 1) {
        return prev;
      }
      return { ...prev, [key]: !prev[key] };
    });
  }

  function handleExportCSV() {
    const parts = [];
    if (activeModules.cases      && caseData)      parts.push({ title: "Case Management",                  summary: caseData });
    if (activeModules.legal      && legalData)     parts.push({ title: "Legal Review",                     summary: legalData });
    if (activeModules.volunteers && volunteerData) parts.push({ title: "Volunteer Application Management", summary: volunteerData });
    if (activeModules.projects   && projectData)   parts.push({ title: "Project Tracker",                 summary: projectData });
    if (activeModules.users      && userData)      parts.push({ title: "User Management",                  summary: userData });
    if (parts.length) exportToCSV(parts);
    setExportMenuOpen(false);
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            <FiBarChart2 className={styles.titleIcon} />
            Report Generator
          </h1>
          <p className={styles.pageSubtitle}>
            Aggregated summaries across all system modules. Data is anonymized and role-gated.
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
            <button
              className={styles.btnExport}
              onClick={() => setExportMenuOpen((o) => !o)}
            >
              <FiDownload /> Export <FiChevronDown />
            </button>
            {exportMenuOpen && (
              <div className={styles.exportDropdown}>
                <button
                  className={styles.exportOption}
                  onClick={() => {
                    exportToPDF();
                    setExportMenuOpen(false);
                  }}
                >
                  <FiPrinter /> Export as PDF
                </button>
                <button
                  className={styles.exportOption}
                  onClick={handleExportCSV}
                >
                  <FiFileText /> Export as CSV/Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Module toggles ── */}
      <div className={styles.moduleToggles}>
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
            onClick={() => toggleModule(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {lastGenerated && (
        <p className={styles.lastGenerated}>
          Last generated: {lastGenerated.toLocaleString()}
          &nbsp;·&nbsp; Date range: <strong>{DATE_RANGES.find((d) => d.value === dateRange)?.label}</strong>
        </p>
      )}

      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {loading && (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}

      {!loading && !error && (
        <div className={styles.reportContent}>

          {activeModules.cases && caseData && (
            <ReportSection icon={<FiBriefcase />} title="Case Management" id="section-cases">
              <div className={styles.statsRow}>
                <StatCard label="Total Cases" value={caseData.total} accent />
                <StatCard label="Open Cases" value={caseData.openCases} sub="Active / unresolved" />
                <StatCard label="Closed Cases" value={caseData.closedCases} sub="Resolved, dismissed, or withdrawn" />
                <StatCard label="Avg. Resolution Time" value={`${caseData.avgResolutionDays}d`} sub="Days from submission" />
              </div>

              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Cases by Status</h3>
                  <DonutChart data={caseData.byStatus} />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Cases by Region</h3>
                  <BarChart data={caseData.byRegion} colorVar="--accent-primary" height={110} />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Case Types</h3>
                  <BarChart
                    data={Object.fromEntries(
                      Object.entries(caseData.byType).map(([k, v]) => [
                        k.length > 22 ? k.slice(0, 22) + "…" : k,
                        v,
                      ])
                    )}
                    colorVar="--accent-secondary"
                    height={110}
                  />
                </div>
              </div>
            </ReportSection>
          )}

          {activeModules.legal && legalData && (
            <ReportSection icon={<FiShield />} title="Legal Review" id="section-legal">
              <div className={styles.statsRow}>
                <StatCard label="Cases in Legal" value={legalData.total} accent />
                <StatCard label="Cases Filed" value={legalData.casesFiled} sub="Elevated to formal filing" />
                <StatCard label="Cases Resolved" value={legalData.casesResolved} sub="Convictions + dismissals" />
                <StatCard label="Avg. Days in Legal" value={`${legalData.avgDaysInLegal}d`} />
                <StatCard label="Referrals Suggested" value={legalData.referralSuggested} sub="NLP-flagged" />
              </div>

              <div className={styles.chartsRow}>
                <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
                  <h3 className={styles.chartTitle}>Legal Case Status Distribution</h3>
                  <DonutChart
                    data={legalData.byStatus}
                    colors={["#4f46e5", "#7c3aed", "#a78bfa", "#818cf8", "#c4b5fd"]}
                  />
                </div>
              </div>
            </ReportSection>
          )}

          {activeModules.volunteers && volunteerData && (
            <ReportSection icon={<FiUsers />} title="Volunteer Application Management" id="section-volunteers">
              <div className={styles.statsRow}>
                <StatCard label="Total Applications" value={volunteerData.total} accent />
                <StatCard label="Approval Rate" value={`${volunteerData.approvalRate}%`} sub="Of processed applications" />
                <StatCard label="Avg. Score" value={volunteerData.avgScore} sub="NLP + evaluator combined" />
              </div>

              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Applications by Status</h3>
                  <DonutChart
                    data={volunteerData.byStatus}
                    colors={["#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa"]}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Top Fields of Background</h3>
                  <div className={styles.tagList}>
                    {volunteerData.topFields.length > 0
                      ? volunteerData.topFields.map((f, i) => (
                          <span key={i} className={styles.tag}>{f}</span>
                        ))
                      : <p className={styles.noData}>No field data available.</p>
                    }
                  </div>
                </div>
              </div>
            </ReportSection>
          )}

          {activeModules.projects && projectData && (
            <ReportSection icon={<FiLayers />} title="Project Tracker" id="section-projects">
              <div className={styles.statsRow}>
                <StatCard label="Total Projects" value={projectData.total} accent />
                <StatCard label="Active" value={projectData.activeProjects} sub="Currently in progress" />
                <StatCard label="Completed On Time" value={projectData.completedOnTime} />
                <StatCard label="Avg. Completion" value={`${projectData.avgCompletionDays}d`} />
              </div>

              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Projects by Status</h3>
                  <BarChart
                    data={projectData.byStatus}
                    colorVar="--accent-green"
                    height={110}
                  />
                </div>
              </div>
            </ReportSection>
          )}

          {activeModules.users && userData && (
            <ReportSection icon={<FiUsers />} title="User Management" id="section-users">
              <div className={styles.statsRow}>
                <StatCard label="Total Users" value={userData.total} accent />
                <StatCard label="Active Users" value={userData.activeUsers} />
                <StatCard label="New This Month" value={userData.newThisMonth} />
                <StatCard label="Deactivated" value={userData.deactivated} />
              </div>

              <div className={styles.chartsRow}>
                <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
                  <h3 className={styles.chartTitle}>Users by Role</h3>
                  <BarChart
                    data={userData.byRole}
                    colorVar="--accent-secondary"
                    height={110}
                  />
                </div>
              </div>
            </ReportSection>
          )}

        </div>
      )}
    </div>
  );
}