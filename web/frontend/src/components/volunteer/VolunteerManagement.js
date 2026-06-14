"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./VolunteerManagement.module.css";
import { FiX } from "react-icons/fi";
import ApplicationsTable from "./ApplicationsTable";
import FilterMenu from "./FilterMenu";
import Link from "next/link";
import { IoIosWarning } from "react-icons/io";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function capitalizeStatus(raw) {
  if (!raw) return "Pending";
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getDateRangeFromFilter(filterValue) {
  if (!filterValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate, endDate;

  switch (filterValue) {
    case "today":
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case "thisWeek":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - today.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case "thisYear":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear() + 1, 0, 1);
      break;
    case "last30Days":
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      if (filterValue.startsWith("custom|")) {
        const parts = filterValue.split("|");
        if (parts.length === 3) {
          startDate = new Date(parts[1] + "T00:00:00");
          endDate = new Date(parts[2] + "T23:59:59");
        }
      }
  }
  return startDate && endDate ? { startDate, endDate } : null;
}

function isDateInRange(dateString, startDate, endDate) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date >= startDate && date <= endDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected"];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Pending":   { bg: "#fef9c3", color: "#854d0e" },
  "Reviewing": { bg: "#dbeafe", color: "#1e40af" },
  "Approved":  { bg: "#d1fae5", color: "#065f46" },
  "Rejected":  { bg: "#fee2e2", color: "#991b1b" },
  "Withdrawn": { bg: "#f3f4f6", color: "#374151" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className={styles.statusBadge}
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CARD
// ─────────────────────────────────────────────────────────────────────────────

function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}>
        <span className={styles.actionIcon}>{icon}</span>
      </div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>
          View &rarr;
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SHELL
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, isAdmin, isStaff,}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN APPLICATION MODAL (admin only)
// ─────────────────────────────────────────────────────────────────────────────

function AssignApplicationModal({ open, onClose, applicantsData: applicantsDataProp, onSave, staff: staffProp = [] }) {
  const [staffIds, setStaffIds] = useState([]);
  const [error, setError] = useState("");

  // Support both single applicant and array of applicants
  const applicants = Array.isArray(applicantsDataProp) ? applicantsDataProp : (applicantsDataProp ? [applicantsDataProp] : []);

  useEffect(() => {
    if (applicants.length > 0) {
      // Reset staff selection when applicants change
      setStaffIds([]);
      setError("");
    }
  }, [applicantsDataProp]);

  if (applicants.length === 0) return null;

  function handleSave() {
    if (staffIds.length === 0) { setError("Please select at least one staff member."); return; }

    onSave({ applicants, staffIds });
  }

  const isBulk = applicants.length > 1;
  const availableStaff = Array.isArray(staffProp) && staffProp.length > 0 ? staffProp : [];

  return (
    <Modal open={open} onClose={onClose} title={isBulk ? `Assign Staff (${applicants.length} Applications)` : "Assign Staff"}>
      <div className={styles.formGrid}>
        {isBulk ? (
          <>
            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.formLabel}>Applications to assign:</label>
              <div style={{ background: "#f3f4f6", borderRadius: 6, padding: 10, fontSize: "0.875rem", maxHeight: 150, overflowY: "auto" }}>
                {applicants.map((a, i) => (
                  <div key={i} style={{ padding: "4px 0", borderBottom: i < applicants.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                    <strong>{a.id}</strong> — {a.name} ({a.status})
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Application ID</label>
              <input className={styles.formInput} value={applicants[0].id} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Applicant Name</label>
              <input className={styles.formInput} value={applicants[0].name} disabled />
            </div>
          </>
        )}
        <div className={styles.formGroup} style={isBulk ? { gridColumn: "1 / -1" } : {}}>
          <label className={styles.formLabel}>
            Assign to Staff Member <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            className={styles.formInput}
            multiple
            size={Math.min(6, Math.max(3, availableStaff.length))}
            value={staffIds}
            onChange={(e) => {
              setStaffIds(Array.from(e.target.selectedOptions).map(option => option.value));
              setError("");
            }}
            style={error ? { borderColor: "#dc2626" } : {}}
          >
            {availableStaff.length > 0 ? (
              availableStaff.map((s) => {
                const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
                return <option key={s.user_id || s.staff_id} value={s.user_id}>{name}</option>;
              })
            ) : (
              <option disabled>No staff available</option>
            )}
          </select>
          <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>Hold Ctrl or Cmd to select multiple evaluators.</span>
          {error && <span style={{ color: "#dc2626", fontSize: "0.8rem" }}>{error}</span>}
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={availableStaff.length === 0}>
          {isBulk ? `Assign ${applicants.length} Application${applicants.length === 1 ? '' : 's'}` : "Assign Staff"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STATUS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function UpdateStatusModal({ open, onClose, applicant, onSave }) {
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (applicant) {
      setStatus(applicant.status);
      setNotes(applicant.notes || "");
    }
  }, [applicant]);

  if (!applicant) return null;

  async function handleSubmit() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications/${applicant.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("token")}`,
          },
          body: JSON.stringify({
            application_status: status.toLowerCase().replace(" ", "_"),
            notes,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status.");
      onSave({ ...applicant, status, notes });
      onClose();
    } catch (err) {
      alert("Something went wrong: " + err.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Application Status">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Applicant</label>
          <input className={styles.formInput} value={applicant.name} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup} style={{ flexWrap: "wrap" }}>
            {APPLICATION_STATUSES.map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="app-status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className={styles.radioInput}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea
            className={styles.formInput}
            rows={3}
            placeholder="Optional reviewer notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VOLUNTEER MANAGEMENT PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function VolunteerManagement() {
  const router = useRouter();
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  const isAdmin   = user.role?.toLowerCase() === "admin";
  const isStaff = user.role?.toLowerCase() === "staff";

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(userCookie);
        setUser({
          id: parsedUser.user_id,
          role: parsedUser.role_name,
          firstName: parsedUser.first_name,
          lastName: parsedUser.last_name,
        });
      } catch (_) {}
    }
  }, []);

  const [applicants, setApplicants] = useState([]);
  const [membershipStaff, setMembershipStaff] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [toast, setToast]           = useState(null);
  const [modal, setModal]           = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [extraColumns, setExtraColumns] = useState([]);


  // Table state
  const [search, setSearch]         = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [sortField, setSortField]   = useState("dateApplied");
  const [sortDir, setSortDir]       = useState("desc");
  const [page, setPage]             = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchApplicants() {
      try {
        const token = getCookie("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Server returned ${res.status}`);
        }

        const data = await res.json();

        // Guard: if data is not an array, the endpoint returned an error object
        if (!Array.isArray(data)) {
          throw new Error(data.error || "Unexpected response from server.");
        }

        const mapped = data.map((app) => ({
          assignedEvaluators:    (app.application_assessments || [])
                                  .filter((aa) => aa.assessment_stage === "application_evaluation")
                                  .map((aa) => `${aa.users?.first_name || ""} ${aa.users?.last_name || ""}`.trim())
                                  .filter(Boolean),
          assignedEvaluatorIds:  (app.application_assessments || [])
                                  .filter((aa) => aa.assessment_stage === "application_evaluation")
                                  .map((aa) => aa.assessor_id),
          id:                   app.volunteer_application_id,
          name:                 app.name || "—",
          email:                app.email || "—",
          contact:              app.contact_number || "—",
          birthday:             app.birthday || "—",
          dateApplied:          app.created_at || "",
          status:               capitalizeStatus(app.application_status),
          notes:                app.notes || "",
          // ── Fix: gender_identity is the DB column name ──
          gender:               app.gender_identity || "—",
          // ── Fix: city lives on volunteer_applications, not a join ──
          city:                 app.city || "—",
          // ── Fix: fields_with_background and fields_of_interest are JSONB arrays ──
          fieldsWithBackground: Array.isArray(app.fields_with_background)
                                  ? app.fields_with_background
                                  : [],
          fieldsOfInterest:     Array.isArray(app.fields_of_interest)
                                  ? app.fields_of_interest
                                  : [],
          hoursPerWeek:         app.hours_per_week || "—",
          organizationId:       app.organization_id || null,
        }));

        setApplicants(mapped);
      } catch (err) {
        console.error("Failed to load volunteer applications:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplicants();
  }, []);

  useEffect(() => {
    async function fetchMembershipStaff() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/staff`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load staff.");
        const data = await res.json();
        setMembershipStaff(
          (Array.isArray(data) ? data : [])
            .filter((s) => Number(s.committee_id || s.committees?.committee_id) === 2)
            .map((s) => ({
              ...s,
              user_id: s.user_id || s.users?.user_id,
              first_name: s.first_name || s.users?.first_name,
              last_name: s.last_name || s.users?.last_name,
              email: s.email || s.users?.email,
              name: `${s.first_name || s.users?.first_name || ""} ${s.last_name || s.users?.last_name || ""}`.trim(),
            }))
        );
      } catch (err) {
        console.error("Failed to load membership staff:", err);
      }
    }
    fetchMembershipStaff();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openUpdate(a) {
    setSelectedApplicant(a);
    setModal("update");
  }

  function handleUpdate(updated) {
    setApplicants((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    showToast(`${updated.name}'s application updated to ${updated.status}.`);
  }

  // ── Sort ───────────────────────────────────────────────────────────────────

  function handleSort(field) {
    setSortDir((prev) => (sortField === field && prev === "asc" ? "desc" : "asc"));
    setSortField(field);
    setPage(1);
  }

  // ── Filter & sort pipeline ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...applicants];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name || "").toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q) ||
          String(a.id).includes(q)
      );
    }

    // Status filter
    if (activeFilters.status && activeFilters.status !== "All") {
      list = list.filter((a) => a.status === activeFilters.status);
    }

    // Date applied filter
    if (activeFilters.dateApplied) {
      const range = getDateRangeFromFilter(activeFilters.dateApplied);
      if (range) {
        list = list.filter((a) =>
          isDateInRange(a.dateApplied, range.startDate, range.endDate)
        );
      }
    }

    // Gender filter (maps to gender_identity in DB, stored as `gender` in mapped obj)
    if (activeFilters.gender && activeFilters.gender !== "All") {
      list = list.filter((a) =>
        (a.gender || "").toLowerCase() === activeFilters.gender.toLowerCase()
      );
    }

    // City filter (add-filter)
    if (activeFilters.city && activeFilters.city !== "All") {
      list = list.filter((a) => a.city === activeFilters.city);
    }

    // Fields with background filter (add-filter) — JSONB array
    if (activeFilters.fieldsWithBackground && activeFilters.fieldsWithBackground !== "All") {
      list = list.filter((a) =>
        Array.isArray(a.fieldsWithBackground) &&
        a.fieldsWithBackground.some(f =>
          f.toLowerCase().includes(activeFilters.fieldsWithBackground.toLowerCase())
        )
      );
    }

    // Fields of interest filter (add-filter) — JSONB array
    if (activeFilters.fieldsOfInterest && activeFilters.fieldsOfInterest !== "All") {
      list = list.filter((a) =>
        Array.isArray(a.fieldsOfInterest) &&
        a.fieldsOfInterest.some(f =>
          f.toLowerCase().includes(activeFilters.fieldsOfInterest.toLowerCase())
        )
      );
    }

    // Sort
    list.sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "id") { av = Number(av); bv = Number(bv); }
      if (sortField === "dateApplied") {
        av = new Date(av).getTime() || 0;
        bv = new Date(bv).getTime() || 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [applicants, search, activeFilters, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [search, activeFilters, sortField]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => [
    { num: applicants.filter((a) => a.status === "Pending").length,   label: "New Applicants",        hasNew: true },
    { num: applicants.filter((a) => a.status === "Reviewing").length, label: "Under Review",           hasNew: true },
    { num: applicants.filter((a) => a.status === "Approved").length,  label: "Approved Applications", hasNew: false },
  ], [applicants]);

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== "All" && v !== "");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      <main className={styles.pageWrapper}>

        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Volunteer Management</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
                      <p className={styles.statNum}>{num}</p>
                      <p className={styles.statLabel}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Action Cards ── */}
        <div className="container-xl py-4">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>
          <div className="row g-3 mb-4">
            {/* <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconPending.png" alt="" className={styles.actionIconImg} />}
                title="See Pending Applications"
                description="Review all applications currently awaiting action."
                onView={() => { setActiveFilters({ status: "Pending" }); setPage(1); }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconReview.png" alt="" className={styles.actionIconImg} />}
                title="Under Review"
                description="Applications currently being reviewed by the team."
                onView={() => { setActiveFilters({ status: "Reviewing" }); setPage(1); }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconApproved.png" alt="" className={styles.actionIconImg} />}
                title="Approved Applications"
                description="View and manage approved volunteer applications."
                onView={() => { setActiveFilters({ status: "Approved" }); setPage(1); }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconAll.png" alt="" className={styles.actionIconImg} />}
                title="View All Applicants"
                description="Browse the complete list of all volunteer applicants."
                onView={() => { setActiveFilters({}); setSearch(""); setPage(1); }}
              />
            </div> */}
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconAll.png" alt="" className={styles.actionIconImg} />}
                title="Applicant Rankings"
                description="Compare screening, hybrid essay, and interview results across all applicants."
                onView={() => router.push("/volunteerRanking")}
              />
            </div>
            <div className="col-12 col-sm-6">
                <Link href="/volunteerInterviews" style={{ textDecoration: 'none' }}>
                  <ActionCard
                    icon={<img src="CaseIconInterview.png" alt="" className={styles.actionIconImg} />}
                    title="Manage Interviews"
                    description="Create interview schedules, manage invitations, and track interview progress."
                    onView={() => router.push("/volunteerInterviews")}
                  />
                </Link>
              </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconScreening.png" alt="" className={styles.actionIconImg} />}
                title="Edit Screening Questions"
                description="Manage the screening questions shown to applicants on the volunteer application form."
                onView={() => router.push("/volunteer/screening-questions")}
              />
            </div>
          </div>
        </div>

        {/* ── Applicants Table ── */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All Volunteer Applicants</h2>
              <div className={styles.headingLine} />
            </div>

            {/* ── Top bar: filter + search ── */}
            <div className={styles.tableTopBar}>
              <FilterMenu
                activeFilters={activeFilters}
                onFilterChange={(f) => { setActiveFilters(f); setPage(1); }}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                searchValue={search}
                onExtraColumnsChange={setExtraColumns}
              />
            </div>

            {/* ── Record count label ── */}
            {/* <p className={styles.recordLabel}>
              {filtered.length === applicants.length
                ? `Showing all ${applicants.length} applicant${applicants.length !== 1 ? "s" : ""}`
                : `Showing ${filtered.length} of ${applicants.length} applicant${applicants.length !== 1 ? "s" : ""}`}
              {(hasActiveFilters || search) && (
                <button
                  className={styles.clearFiltersBtn}
                  onClick={() => { setActiveFilters({}); setSearch(""); }}
                >
                  Clear filters
                </button>
              )}
            </p> */}

            {/* ── Error state ── */}
            {error && (
              <div className={styles.errorState}>
                <IoIosWarning /> Failed to load applications: {error}
              </div>
            )}

            {/* ── Table ── */}
            {loading ? (
              <div className={styles.loadingState}>Loading applicants…</div>
            ) : (
              <ApplicationsTable
                paginated={paginated}
                page={page}
                totalPages={totalPages}
                totalRecords={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onRowClick={(a) => router.push(`/volunteer/view?id=${a.id}`)}
                onAssign={(selected) => {
                    // bulk assign: pass all selected applications
                    setSelectedApplicant(selected);
                    setModal("assign");
                  }}
                onUpdateStatus={(selected) => {
                  const canUpdateSelected =
                    isAdmin ||
                    selected.every((a) =>
                      (a.assignedEvaluatorIds || []).some((id) => String(id) === String(user.id))
                    );
                  if (!canUpdateSelected) {
                    setError("Only assigned Membership Committee staff can update this application's status.");
                    return;
                  }
                  if (selected.length >= 1) openUpdate(selected[0]);
                }}
                isAdmin={isAdmin}
                isStaff={isStaff}
                currentUserId={user.id}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                extraColumns={extraColumns}
              />
            )}
          </div>
        </section>
      </main>

      {/* ── Modals ── */}
      <AssignApplicationModal
        open={modal === "assign"}
        onClose={() => { setModal(null); setSelectedApplicant(null); }}
        applicantsData={selectedApplicant}
        staff={membershipStaff}
        onSave={async ({ applicants: selectedApps, staffIds }) => {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const res = await fetch(`${API_URL}/api/volunteer_applications/assignments`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getCookie("token")}`,
              },
              body: JSON.stringify({
                application_ids: selectedApps.map((app) => app.id),
                assessor_ids: staffIds,
              }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to assign staff.");

            const selectedNames = membershipStaff
              .filter((s) => staffIds.includes(String(s.user_id)))
              .map((s) => s.name)
              .filter(Boolean);
            const selectedAppIds = new Set(selectedApps.map((app) => app.id));
            setApplicants(prev => prev.map(a => selectedAppIds.has(a.id)
              ? { ...a, assignedEvaluators: selectedNames, assignedEvaluatorIds: staffIds, status: "Reviewing" }
              : a
            ));
            showToast("Staff assigned successfully.");
            setModal(null);
            setSelectedApplicant(null);
          } catch (err) {
            showToast(err.message || "Failed to assign staff.", "error");
          }
        }}
      />
      <UpdateStatusModal
        open={modal === "update"}
        onClose={() => setModal(null)}
        applicant={selectedApplicant}
        onSave={handleUpdate}
      />
    </>
  );
}
