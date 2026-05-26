"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./VolunteerManagement.module.css";
import { FiX } from "react-icons/fi";
import ApplicationsTable from "./ApplicationsTable";
import FilterMenu from "./FilterMenu";

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
const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected", "Withdrawn"];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE (for modals)
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

function Modal({ open, onClose, title, children }) {
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

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      const parsedUser = JSON.parse(userCookie);
      setUser({
        role: parsedUser.role_name,
        firstName: parsedUser.first_name,
        lastName: parsedUser.last_name,
      });
    }
  }, []);

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [modal, setModal]           = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Table state
  const [search, setSearch]       = useState("");
  const [filters, setFilters]     = useState({});
  const [sortField, setSortField] = useState("dateApplied");
  const [sortDir, setSortDir]     = useState("desc");
  const [page, setPage]           = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchApplicants() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications`,
          { headers: { Authorization: `Bearer ${getCookie("token")}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((app) => ({
            id:           app.volunteer_application_id,
            name:         app.name,
            email:        app.email,
            contact:      app.contact_number,
            birthday:     app.birthday || "—",
            dateApplied:  app.created_at || "",
            status:       capitalizeStatus(app.application_status),
            notes:        app.notes || "",
            organization: app.organization || "",
            fieldsWithBackground: app.fields_with_background || [],
            fieldsOfInterest:     app.fields_of_interest     || [],
            hoursPerWeek:         app.hours_per_week         || "—",
          }));
          setApplicants(mapped);
        }
      } catch (err) {
        console.error("Failed to load volunteer applications", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplicants();
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
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          String(a.id).includes(q)
      );
    }

    // Status filter
    if (filters.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    // Date applied filter
    if (filters.dateApplied) {
      const range = getDateRangeFromFilter(filters.dateApplied);
      if (range) {
        list = list.filter((a) =>
          isDateInRange(a.dateApplied, range.startDate, range.endDate)
        );
      }
    }

    // Organization filter
    if (filters.organization) {
      list = list.filter((a) => a.organization === filters.organization);
    }

    // Extra text filters
    if (filters.name) {
      const q = filters.name.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (filters.email) {
      const q = filters.email.toLowerCase();
      list = list.filter((a) => a.email.toLowerCase().includes(q));
    }
    if (filters.contact) {
      list = list.filter((a) => (a.contact || "").includes(filters.contact));
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
  }, [applicants, search, filters, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [search, filters, sortField]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => [
    { num: applicants.filter((a) => a.status === "Pending").length,   label: "New Applicants",          hasNew: true },
    { num: applicants.filter((a) => a.status === "Reviewing").length, label: "Under Review",             hasNew: true },
    { num: applicants.filter((a) => a.status === "Approved").length,  label: "Approved Applications",   hasNew: false },
  ], [applicants]);

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
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconPending.png" alt="" className={styles.actionIconImg} />}
                title="See Pending Applications"
                description="Review all applications currently awaiting action."
                onView={() => setFilters({ status: "Pending" })}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconReview.png" alt="" className={styles.actionIconImg} />}
                title="Under Review"
                description="Applications currently being reviewed by the team."
                onView={() => setFilters({ status: "Reviewing" })}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconApproved.png" alt="" className={styles.actionIconImg} />}
                title="Approved Applications"
                description="View and manage approved volunteer applications."
                onView={() => setFilters({ status: "Approved" })}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconAll.png" alt="" className={styles.actionIconImg} />}
                title="View All Applicants"
                description="Browse the complete list of all volunteer applicants."
                onView={() => setFilters({})}
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
                filters={filters}
                onFilterChange={(f) => { setFilters(f); setPage(1); }}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                searchValue={search}
              />
            </div>

            {/* ── Record count label ── */}
            <p className={styles.recordLabel}>
              {filtered.length === applicants.length
                ? `Showing all ${applicants.length} applicant${applicants.length !== 1 ? "s" : ""}`
                : `Showing ${filtered.length} of ${applicants.length} applicant${applicants.length !== 1 ? "s" : ""}`}
              {Object.keys(filters).some(k => filters[k]) && (
                <button
                  className={styles.clearFiltersBtn}
                  onClick={() => { setFilters({}); setSearch(""); }}
                >
                  Clear filters
                </button>
              )}
            </p>

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
                onUpdateStatus={(selected) => {
                  // Bulk update: open modal for the first selected
                  if (selected.length === 1) {
                    openUpdate(selected[0]);
                  } else {
                    // Multi-select: for now open the modal on first
                    openUpdate(selected[0]);
                  }
                }}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            )}
          </div>
        </section>
      </main>

      {/* ── Modals ── */}
      <UpdateStatusModal
        open={modal === "update"}
        onClose={() => setModal(null)}
        applicant={selectedApplicant}
        onSave={handleUpdate}
      />
    </>
  );
}