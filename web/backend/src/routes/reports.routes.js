const express = require("express");
const router  = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { verifyToken } = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.use(verifyToken);
router.use(authorize("Admin"));

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — convert the dateRange string from the frontend into a UTC ISO
// timestamp so we can filter with Supabase's .gte() filter.
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
      return null; // "all" — no filter
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — apply optional date filter to a Supabase query
// ─────────────────────────────────────────────────────────────────────────────

function applyDateFilter(query, rangeStart, dateField = "created_at") {
  if (!rangeStart) return query;
  return query.gte(dateField, rangeStart.toISOString());
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/aggregate?dateRange=thisMonth
//
// FIX: Queries the correct tables:
//   - case_reports  (not "cases" — that table doesn't exist)
//   - volunteer_applications (was already correct)
//   - projects               (was already correct)
//   - users                  (was already correct)
//
// FIX: Selects the correct field names that match what ReportGenerator.js
// reads in buildCaseSummary():
//   - case_type_name  → mapped from case_reports (or join case_types)
//   - case_status_name / status  → from case_statuses join
//   - incident_location_type → used as "region" proxy on the frontend
//
// The frontend buildCaseSummary() reads:
//   c.status          → we alias case_status_name as "status"
//   c.case_type       → we alias case_type_name as "case_type"
//   c.region          → we expose incident_location_type as "region"
//   c.date_filed      → direct column
//   c.date_resolved   → direct column
// ─────────────────────────────────────────────────────────────────────────────

router.get("/aggregate", async (req, res) => {
  try {
    const { dateRange = "all" } = req.query;
    const rangeStart = getRangeStart(dateRange);

    // ── 1. CASE REPORTS ──────────────────────────────────────────────────────
    // FIX: table is "case_reports", not "cases".
    // FIX: join case_statuses and case_types so we get human-readable names
    //      that match the constants in ReportGenerator.js.
    let casesQuery = supabase
      .from("case_reports")
      .select(`
        case_report_id,
        incident_location_type,
        incident_city,
        date_filed:created_at,
        date_resolved,
        case_statuses ( case_status_name ),
        case_types    ( case_type_name )
      `);
    casesQuery = applyDateFilter(casesQuery, rangeStart, "created_at");

    const { data: casesRaw, error: casesErr } = await casesQuery;
    if (casesErr) console.error("Cases query error:", casesErr.message);

    // Normalize into the flat shape buildCaseSummary() expects
    const cases = (casesRaw || []).map((r) => ({
      id:            r.case_report_id,
      status:        r.case_statuses?.case_status_name  || null,
      case_type:     r.case_types?.case_type_name       || null,
      // Frontend reads c.region || c.location_type — supply both
      region:        r.incident_location_type            || null,
      location_type: r.incident_location_type            || null,
      date_filed:    r.date_filed                        || null,
      date_resolved: r.date_resolved                     || null,
      created_at:    r.date_filed                        || null,
    }));

    // ── 2. VOLUNTEER APPLICATIONS ─────────────────────────────────────────────
    // FIX: expose application_status as "status" (frontend reads a.status)
    let volunteersQuery = supabase
      .from("volunteer_applications")
      .select(`
        volunteer_application_id,
        application_status,
        negotiable_score,
        fields_with_background,
        fields_of_interest,
        created_at
      `);
    volunteersQuery = applyDateFilter(volunteersQuery, rangeStart, "created_at");

    const { data: volunteersRaw, error: volunteersErr } = await volunteersQuery;
    if (volunteersErr) console.error("Volunteers query error:", volunteersErr.message);

    // Normalize: frontend buildVolunteerSummary() reads a.status and a.score
    const volunteers = (volunteersRaw || []).map((r) => ({
      id:                 r.volunteer_application_id,
      // Map snake_case DB values to Title Case to match VOLUNTEER_STATUSES constant
      status:             mapVolunteerStatus(r.application_status),
      score:              r.negotiable_score             || null,
      // Frontend reads field_of_background (string) or fields_of_expertise (array)
      field_of_background: r.fields_with_background     || null,
      fieldsOfExpertise:   r.fields_of_interest         || null,
      created_at:          r.created_at                 || null,
    }));

    // ── 3. PROJECTS ───────────────────────────────────────────────────────────
    let projectsQuery = supabase
      .from("projects")
      .select("project_id, project_status, start_date, end_date");
    projectsQuery = applyDateFilter(projectsQuery, rangeStart, "start_date");

    const { data: projectsRaw, error: projectsErr } = await projectsQuery;
    if (projectsErr) console.error("Projects query error:", projectsErr.message);

    const projects = (projectsRaw || []).map((p) => ({
      id: p.project_id,
      project_id: p.project_id,
      status: p.project_status,
      project_status: p.project_status,
      start_date: p.start_date,
      end_date: p.end_date,
    }));

    // ── 4. USERS ──────────────────────────────────────────────────────────────
    let usersQuery = supabase
      .from("users")
      .select("user_id, role_id, is_active, created_at, roles ( role_name )");
    usersQuery = applyDateFilter(usersQuery, rangeStart, "created_at");

    const { data: usersRaw, error: usersErr } = await usersQuery;
    if (usersErr) console.error("Users query error:", usersErr.message);

    // Normalize: frontend buildUserSummary() reads u.role_name || u.roleName || u.role
    const users = (usersRaw || []).map((u) => ({
      id:         u.user_id,
      role_name:  u.roles?.role_name || null,
      is_active:  u.is_active,
      created_at: u.created_at,
    }));

    res.json({
      cases:      cases,
      volunteers: volunteers,
      projects:   projects || [],
      users:      users,
    });

  } catch (err) {
    console.error("Aggregate report error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — map DB snake_case application_status → Title Case
// so values match VOLUNTEER_STATUSES in ReportGenerator.js
// ─────────────────────────────────────────────────────────────────────────────

function mapVolunteerStatus(raw) {
  const map = {
    pending:      "Pending",
    under_review: "Under Review",
    approved:     "Approved",
    rejected:     "Rejected",
    waitlisted:   "Waitlisted",
  };
  return map[(raw || "").toLowerCase()] || raw || "Unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/cases?dateRange=thisMonth  (standalone fallback)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/cases", async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    let query = supabase
      .from("case_reports")
      .select(`
        case_report_id,
        incident_location_type,
        date_filed:created_at,
        date_resolved,
        case_statuses ( case_status_name ),
        case_types    ( case_type_name )
      `);
    query = applyDateFilter(query, rangeStart, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((r) => ({
      id:            r.case_report_id,
      status:        r.case_statuses?.case_status_name || null,
      case_type:     r.case_types?.case_type_name      || null,
      region:        r.incident_location_type           || null,
      location_type: r.incident_location_type           || null,
      date_filed:    r.date_filed                       || null,
      date_resolved: r.date_resolved                    || null,
    }));

    res.json({ data: normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/volunteers?dateRange=thisMonth
// ─────────────────────────────────────────────────────────────────────────────

router.get("/volunteers", async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    let query = supabase
      .from("volunteer_applications")
      .select("volunteer_application_id, application_status, negotiable_score, fields_with_background, fields_of_interest, created_at");
    query = applyDateFilter(query, rangeStart, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((r) => ({
      id:                  r.volunteer_application_id,
      status:              mapVolunteerStatus(r.application_status),
      score:               r.negotiable_score    || null,
      field_of_background: r.fields_with_background || null,
      fieldsOfExpertise:   r.fields_of_interest  || null,
      created_at:          r.created_at          || null,
    }));

    res.json({ data: normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/projects?dateRange=thisMonth
// ─────────────────────────────────────────────────────────────────────────────

router.get("/projects", async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    let query = supabase
      .from("projects")
      .select("project_id, project_status, start_date, end_date");
    query = applyDateFilter(query, rangeStart, "start_date");

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((p) => ({
      id: p.project_id,
      project_id: p.project_id,
      status: p.project_status,
      project_status: p.project_status,
      start_date: p.start_date,
      end_date: p.end_date,
    }));

    res.json({ data: normalized || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/users?dateRange=thisMonth
// ─────────────────────────────────────────────────────────────────────────────

router.get("/users", async (req, res) => {
  try {
    const rangeStart = getRangeStart(req.query.dateRange || "all");
    let query = supabase
      .from("users")
      .select("user_id, is_active, created_at, roles ( role_name )");
    query = applyDateFilter(query, rangeStart, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((u) => ({
      id:         u.user_id,
      role_name:  u.roles?.role_name || null,
      is_active:  u.is_active,
      created_at: u.created_at,
    }));

    res.json({ data: normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
