/**
 * reports.controller.js
 *
 * Controller for /api/reports/* endpoints.
 * All DB queries live here; reports.routes.js stays thin.
 *
 * Why this file is needed:
 *   The original reports.routes.js embedded all Supabase logic inline.
 *   Extracting it here keeps the routes file as a pure router and makes
 *   the query/normalization logic independently testable.
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
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

function applyDateFilter(query, rangeStart, dateField = "created_at") {
  if (!rangeStart) return query;
  return query.gte(dateField, rangeStart.toISOString());
}

/**
 * Map DB snake_case application_status values → Title Case strings
 * that match the VOLUNTEER_STATUSES constant in ReportGenerator.js.
 */
function mapVolunteerStatus(raw) {
  const map = {
    pending:      "Pending",
    under_review: "Under Review",
    approved:     "Approved",
    rejected:     "Rejected",
    waitlisted:   "Waitlisted",
  };
  return map[(raw || "").toLowerCase()] || raw || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS — return normalised arrays ready for buildXxxSummary()
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCases(rangeStart) {
  let query = supabase
    .from("case_reports")   // FIX: correct table name (not "cases")
    .select(`
      case_report_id,
      incident_location_type,
      created_at,
      date_resolved,
      case_statuses ( case_status_name ),
      case_types    ( case_type_name )
    `);
  query = applyDateFilter(query, rangeStart, "created_at");

  const { data, error } = await query;
  if (error) {
    console.error("[fetchCases] Supabase error:", error.message);
    return [];
  }

  // Normalise into the flat shape buildCaseSummary() reads
  return (data || []).map((r) => ({
    id:            r.case_report_id,
    status:        r.case_statuses?.case_status_name  || null,
    case_type:     r.case_types?.case_type_name       || null,
    // frontend reads c.region || c.location_type — expose both
    region:        r.incident_location_type            || null,
    location_type: r.incident_location_type            || null,
    date_filed:    r.created_at                        || null,
    date_resolved: r.date_resolved                     || null,
    created_at:    r.created_at                        || null,
  }));
}

async function fetchVolunteers(rangeStart) {
  let query = supabase
    .from("volunteer_applications")
    .select(`
      volunteer_application_id,
      application_status,
      negotiable_score,
      fields_with_background,
      fields_of_interest,
      created_at
    `);
  query = applyDateFilter(query, rangeStart, "created_at");

  const { data, error } = await query;
  if (error) {
    console.error("[fetchVolunteers] Supabase error:", error.message);
    return [];
  }

  return (data || []).map((r) => ({
    id:                  r.volunteer_application_id,
    status:              mapVolunteerStatus(r.application_status),
    score:               r.negotiable_score          ?? null,
    field_of_background: r.fields_with_background    || null,
    fieldsOfExpertise:   r.fields_of_interest        || null,
    created_at:          r.created_at                || null,
  }));
}

async function fetchProjects(rangeStart) {
  let query = supabase
    .from("projects")
    .select("id, status, start_date, end_date, actual_end_date");
  query = applyDateFilter(query, rangeStart, "start_date");

  const { data, error } = await query;
  if (error) {
    console.error("[fetchProjects] Supabase error:", error.message);
    return [];
  }
  return data || [];
}

async function fetchUsers(rangeStart) {
  let query = supabase
    .from("users")
    .select("user_id, is_active, created_at, roles ( role_name )");
  query = applyDateFilter(query, rangeStart, "created_at");

  const { data, error } = await query;
  if (error) {
    console.error("[fetchUsers] Supabase error:", error.message);
    return [];
  }

  return (data || []).map((u) => ({
    id:         u.user_id,
    role_name:  u.roles?.role_name || null,
    is_active:  u.is_active,
    created_at: u.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/reports/aggregate?dateRange=thisMonth
 *
 * Returns all four datasets in one request.
 * Shape: { cases: [...], volunteers: [...], projects: [...], users: [...] }
 */
const getAggregate = async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");

    const [cases, volunteers, projects, users] = await Promise.all([
      fetchCases(rangeStart),
      fetchVolunteers(rangeStart),
      fetchProjects(rangeStart),
      fetchUsers(rangeStart),
    ]);

    res.json({ cases, volunteers, projects, users });
  } catch (err) {
    console.error("[getAggregate]", err);
    res.status(500).json({ error: "Failed to generate aggregate report." });
  }
};

/**
 * GET /api/reports/cases?dateRange=thisMonth
 */
const getCases = async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    const data = await fetchCases(rangeStart);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/volunteers?dateRange=thisMonth
 */
const getVolunteers = async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    const data = await fetchVolunteers(rangeStart);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/projects?dateRange=thisMonth
 */
const getProjects = async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    const data = await fetchProjects(rangeStart);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/reports/users?dateRange=thisMonth
 */
const getUsers = async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    const data = await fetchUsers(rangeStart);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAggregate, getCases, getVolunteers, getProjects, getUsers };