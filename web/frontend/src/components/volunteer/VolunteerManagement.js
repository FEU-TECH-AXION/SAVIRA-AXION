"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./VolunteerManagement.module.css";
import { FiX } from "react-icons/fi";
import ApplicationsTable from "./ApplicationsTable";
import FilterMenu from "./FilterMenu";
import Link from "next/link";
import { IoIosWarning } from "react-icons/io";
import { ConfirmDialog } from "@/components/ui/Dialog";
import VolunteerStatusDialog from "./VolunteerStatusDialog";

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

function AssignApplicationModal({ open, onClose, applicantsData, onSave, staff = [] }) {
  const [assigned, setAssigned]               = useState([])
  const [existingAssigned, setExistingAssigned] = useState([])
  const [search, setSearch]                   = useState("")
  const [error, setError]                     = useState("")
  const [saving, setSaving]                   = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [duplicateDialog, setDuplicateDialog] = useState(null)
  const [removalTarget, setRemovalTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [removedAssignmentKeys, setRemovedAssignmentKeys] = useState([])

  const applicants = Array.isArray(applicantsData)
    ? applicantsData
    : applicantsData ? [applicantsData] : []

  useEffect(() => {
    if (open) {
      setAssigned([])
      setSearch("")
      setError("")
      setExistingAssigned([])
      setDuplicateDialog(null)
      setLoadingExisting(false)
      setRemovalTarget(null)
      setRemovedAssignmentKeys([])

      if (applicants.length === 1) {
        setLoadingExisting(true)
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_application_assignments/${applicants[0].id}`,
          { credentials: "include" }
        )
          .then(res => res.ok ? res.json() : { data: [] })
          .then(json => setExistingAssigned(json.data || []))
          .catch(() => setExistingAssigned([]))
          .finally(() => setLoadingExisting(false))
      }
    }
  }, [open, applicantsData])

  if (applicants.length === 0) return null

  const assignedIds          = assigned.map(s => s.user_id)
  const alreadyAssignedIds   = existingAssigned.map(a => a.assessor_id)
  const unavailableStaffIds = new Set(
    staff
      .filter((staffMember) =>
        applicants.every((applicant) =>
          (applicant.assignedEvaluatorIds || []).map(String).some(
            (id) =>
              id === String(staffMember.user_id) &&
              !removedAssignmentKeys.includes(`${applicant.id}:${id}`)
          )
        )
      )
      .map((staffMember) => String(staffMember.user_id))
  )
  if (applicants.length === 1) {
    alreadyAssignedIds.forEach((id) => unavailableStaffIds.add(String(id)))
  }
  const availableStaff = staff.filter(
    (staffMember) => !unavailableStaffIds.has(String(staffMember.user_id))
  )
  const noAvailableStaff = availableStaff.length === 0

  // ← same pattern as legal modal: show all when no search, filter when typing
  const searchResults = availableStaff.filter(s => {
    const name          = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase()
    const notYetPicked  = !assignedIds.includes(s.user_id)
    if (!search.trim()) return notYetPicked
    return notYetPicked && name.includes(search.toLowerCase())
  })

  function addPerson(s) {
    setAssigned(prev => [...prev, s])
    setSearch("")
    setError("")
  }

  function removePerson(userId) {
    setAssigned(prev => prev.filter(a => a.user_id !== userId))
  }

  async function confirmRemoval() {
    if (!removalTarget) return
    setRemoving(true)
    setError("")
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const res = await fetch(
        `${API_URL}/api/volunteer_application_assignments/${removalTarget.applicationId}/${removalTarget.assessorId}`,
        { method: "DELETE", credentials: "include" }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Failed to remove staff assignment.")

      const key = `${removalTarget.applicationId}:${removalTarget.assessorId}`
      setRemovedAssignmentKeys((current) => [...current, key])
      setExistingAssigned((current) =>
        current.filter((assignment) => String(assignment.assessor_id) !== String(removalTarget.assessorId))
      )
      setRemovalTarget(null)
    } catch (err) {
      setError(err.message || "Failed to remove staff assignment.")
    } finally {
      setRemoving(false)
    }
  }

  async function handleAssign() {
    if (assigned.length === 0) { setError("Please select at least one staff member."); return; }
    setSaving(true)
    try {
      const result = await onSave({ applicants, assessor_ids: assigned.map(a => a.user_id) })
      const duplicateFailures = (result?.failed || []).filter((failure) =>
        String(failure.reason || "").toLowerCase().includes("already")
      )
      if (duplicateFailures.length > 0) {
        setDuplicateDialog({
          count: duplicateFailures.length,
          detail: duplicateFailures
            .map((failure) => `Application #${failure.volunteer_application_id} · Staff ${failure.assessor_id}`)
            .join(", "),
        })
      }
      if (!result?.failed?.length) onClose()
    } catch (err) {
      setError(err.message || "Failed to assign staff.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title={`Assign Staff${applicants.length > 1 ? ` (${applicants.length} Applications)` : ""}`}>
      <div className={styles.formGrid}>

        {/* Application info */}
        {applicants.length === 1 ? (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Application ID</label>
            <input className={styles.formInput} value={`APP-${String(applicants[0].id).padStart(4, "0")}`} disabled />
          </div>
        ) : (
          <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.formLabel}>Applications to assign ({applicants.length})</label>
            <div style={{ background: "#f3f4f6", borderRadius: 6, padding: 10, fontSize: "0.875rem", maxHeight: 120, overflowY: "auto" }}>
              {applicants.map((a, i) => (
                <div key={i} style={{ padding: "3px 0" }}>
                  <strong>APP-{String(a.id).padStart(4, "0")}</strong> — {a.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {applicants.length > 1 && (
          <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.formLabel}>Currently Assigned</label>
            <div style={{
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              padding: "0.5rem 0.75rem",
              maxHeight: 160,
              overflowY: "auto",
            }}>
              {applicants.map((applicant) => {
                const currentNames = applicant.assignedEvaluators || applicant.assignedStaff || []
                const currentIds = (applicant.assignedEvaluatorIds || []).map(String)
                const currentAssignments = currentNames
                  .map((name, index) => ({ name, assessorId: currentIds[index] }))
                  .filter(({ assessorId }) =>
                    assessorId && !removedAssignmentKeys.includes(`${applicant.id}:${assessorId}`)
                  )
                return (
                  <div key={applicant.id} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    padding: "0.35rem 0",
                    borderBottom: "1px solid #eef2f7",
                  }}>
                    <strong style={{ minWidth: 90, fontSize: "0.8rem", color: "#374151" }}>
                      APP-{String(applicant.id).padStart(4, "0")}
                    </strong>
                    {currentAssignments.length === 0 ? (
                      <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        No staff currently assigned.
                      </span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {currentAssignments.map(({ name, assessorId }) => (
                          <span key={`${applicant.id}-${assessorId}`} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: 999,
                            background: "#d1fae5",
                            color: "#065f46",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}>
                            ✓ {name}
                            <button
                              type="button"
                              onClick={() => setRemovalTarget({
                                applicationId: applicant.id,
                                assessorId,
                                name,
                              })}
                              title={`Remove ${name}`}
                              style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: 0, lineHeight: 1 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Existing assignments preview */}
        {applicants.length === 1 && (
          <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.formLabel}>Currently Assigned</label>
            <div style={{
              background: "#f9fafb", borderRadius: 8,
              border: "1px solid #e5e7eb", padding: "0.5rem 0.75rem",
              minHeight: "2.25rem",
            }}>
              {loadingExisting ? (
                <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Loading…</span>
              ) : existingAssigned.length === 0 ? (
                <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>No staff currently assigned.</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {existingAssigned.map(a => {
                    const name = a.users
                      ? `${a.users.first_name} ${a.users.last_name}`.trim()
                      : `Staff #${a.assessor_id}`
                    return (
                      <span key={a.assignment_id} style={{
                        display: "inline-flex", alignItems: "center", gap: "0.35rem",
                        padding: "0.25rem 0.6rem", borderRadius: 999,
                        background: "#d1fae5", color: "#065f46",
                        fontSize: "0.8rem", fontWeight: 600,
                      }}>
                        ✓ {name}
                        <button
                          type="button"
                          onClick={() => setRemovalTarget({
                            applicationId: applicants[0].id,
                            assessorId: a.assessor_id,
                            name,
                          })}
                          title={`Remove ${name}`}
                          style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chip display — who will be newly assigned */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.formLabel}>Selected Staff</label>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "0.4rem",
            minHeight: "2.25rem", padding: "0.5rem",
            borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb",
          }}>
            {assigned.length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "#9ca3af", alignSelf: "center" }}>
                No one selected yet — browse below to add.
              </span>
            ) : (
              assigned.map(s => (
                <span key={s.user_id} style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.25rem 0.6rem", borderRadius: 999,
                  background: "#e1f5f5", color: "#037F81",
                  fontSize: "0.8rem", fontWeight: 600,
                }}>
                  {`${s.first_name} ${s.last_name}`.trim()}
                  <button
                    onClick={() => removePerson(s.user_id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#037F81", padding: 0, fontSize: "0.85rem" }}
                  >×</button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Search + browseable dropdown — always visible like legal modal */}
        <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.formLabel}>
            Search Personnel
            <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: "0.78rem", marginLeft: 6 }}>
              Browse the list or type to filter by name.
            </span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              className={styles.formInput}
              placeholder={staff.length === 0
                ? "No Membership Committee staff are available."
                : noAvailableStaff
                ? "All Membership Committee staff are already assigned."
                : "e.g. Juan, Maria…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              disabled={noAvailableStaff}
            />

            {/* Always visible dropdown — same as legal modal */}
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 100,
                maxHeight: 200, overflowY: "auto",
              }}>
                {searchResults.map(s => (
                  <button
                    key={s.user_id}
                    onClick={() => addPerson(s)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "0.6rem 0.85rem",
                      background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer", textAlign: "left", fontSize: "0.875rem",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ fontWeight: 500 }}>
                      {`${s.first_name} ${s.last_name}`.trim()}
                    </span>
                    <span style={{
                      fontSize: "0.75rem", color: "#6b7280",
                      background: "#f3f4f6", padding: "2px 8px", borderRadius: 999,
                    }}>
                      Membership Committee
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {search.trim().length > 0 && searchResults.length === 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "0.75rem", fontSize: "0.8rem", color: "#9ca3af", zIndex: 100,
              }}>
                No staff found matching "{search}".
              </div>
            )}

            {/* Empty state — no membership staff at all */}
            {staff.length === 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "0.75rem", fontSize: "0.8rem", color: "#9ca3af", zIndex: 100,
              }}>
                No Membership Committee staff available.
              </div>
            )}
            {staff.length > 0 && noAvailableStaff && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#6b7280" }}>
                No additional staff can be assigned to the selected {applicants.length > 1 ? "applications" : "application"}.
              </div>
            )}
          </div>
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0, gridColumn: "1 / -1" }}>
            {error}
          </p>
        )}
      </div>

      <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Only Membership Committee staff are shown. The same person cannot be assigned to the same application twice.
      </p>

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
        <button
          className={styles.btnPrimary}
          onClick={handleAssign}
          disabled={saving || assigned.length === 0}
        >
          {saving
            ? `Assigning ${assigned.length}…`
            : `Assign${assigned.length > 0 ? ` (${assigned.length})` : ""}`}
        </button>
      </div>
    </Modal>
    <ConfirmDialog
      open={Boolean(duplicateDialog)}
      title="Staff Already Assigned"
      description={`${duplicateDialog?.count || 0} selected assignment(s) already exist and were not added again. Refresh the page to display the latest volunteer application assignments.`}
      detail={duplicateDialog?.detail ? `${duplicateDialog.detail}. Any other valid assignments were still saved.` : "Any other valid assignments were still saved."}
      confirmLabel="Refresh Page"
      cancelLabel="Close"
      onCancel={() => setDuplicateDialog(null)}
      onConfirm={() => window.location.reload()}
    />
    <ConfirmDialog
      open={Boolean(removalTarget)}
      title="Remove Assigned Staff"
      description={`Remove ${removalTarget?.name || "this staff member"} from this volunteer application?`}
      detail="Their active application assignment will be deactivated immediately."
      confirmLabel="Remove"
      cancelLabel="Cancel"
      tone="danger"
      busy={removing}
      dismissible={!removing}
      onCancel={() => { if (!removing) setRemovalTarget(null) }}
      onConfirm={confirmRemoval}
    />
    </>
  )
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
      // Wait until user is loaded before fetching
      if (!user.role) return;

      async function fetchApplicants() {
          try {
              const token = getCookie("token");
              const res = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/volunteer_applications`,
                  {
                      credentials: "include",
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                  }
              );

              if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body.error || `Server returned ${res.status}`);
              }

              const data = await res.json();
              if (!Array.isArray(data)) {
                  throw new Error(data.error || "Unexpected response from server.");
              }

              let mapped = data.map((app) => ({
                  assignedEvaluators: (app.volunteer_application_assignments || [])
                      .filter((aa) => aa.is_active === true)
                      .map((aa) => `${aa.users?.first_name || ""} ${aa.users?.last_name || ""}`.trim())
                      .filter(Boolean),
                  assignedEvaluatorIds: (app.volunteer_application_assignments || [])
                      .filter((aa) => aa.is_active === true)
                      .map((aa) => aa.assessor_id),
                  id:                   app.volunteer_application_id,
                  name:                 app.name || "—",
                  email:                app.email || "—",
                  contact:              app.contact_number || "—",
                  birthday:             app.birthday || "—",
                  dateApplied:          app.created_at || "",
                  status:               capitalizeStatus(app.application_status),
                  notes:                app.notes || "",
                  gender:               app.gender_identity || "—",
                  city:                 app.city || "—",
                  fieldsWithBackground: Array.isArray(app.fields_with_background)
                                          ? app.fields_with_background : [],
                  fieldsOfInterest:     Array.isArray(app.fields_of_interest)
                                          ? app.fields_of_interest : [],
                  hoursPerWeek:         app.hours_per_week || "—",
                  organizationId:       app.organization_id || null,
              }));

              // Staff only see applications assigned to them
              if (isStaff && user.id) {
                  mapped = mapped.filter(app =>
                      (app.assignedEvaluatorIds || []).some(id => String(id) === String(user.id))
                  );
              }

              setApplicants(mapped);
          } catch (err) {
              console.error("Failed to load volunteer applications:", err);
          } finally {
              setLoading(false);
          }
      }

      fetchApplicants();
  }, [user.role, user.id, isStaff]); 

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
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="VolunteerIconScreening.png" alt="" className={styles.actionIconImg} />}
                title="Chapter Formation"
                description="Manage volunteer chapter formation."
                onView={() => router.push("/volunteer/chapters")}
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
                  if (selected.length >= 1) {
                    setSelectedApplicant(selected);
                    setModal("update");
                  }
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
        onSave={async ({ applicants: selectedApps, assessor_ids }) => {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
          const res = await fetch(`${API_URL}/api/volunteer_application_assignments/assign-bulk`, {
            method:      "POST",
            credentials: "include",
            headers:     { "Content-Type": "application/json" },
            body: JSON.stringify({
              application_ids: selectedApps.map(a => a.id),
              assessor_ids,
            }),
          })
          const body = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(body.error || "Failed to assign staff.")

          if (body.data?.length > 0) showToast("Staff assigned successfully.")
          return body
        }}
      />
      <VolunteerStatusDialog
        key={`status-${modal}-${Array.isArray(selectedApplicant)
          ? selectedApplicant.map((item) => item.id).join("-")
          : selectedApplicant?.id || "none"}`}
        open={modal === "update"}
        onCancel={() => {
          setModal(null);
          setSelectedApplicant(null);
        }}
        applicants={selectedApplicant}
        onSave={async ({ applicants: selectedApps, status, notes }) => {
          const token = getCookie("token");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
          const updatedApplicants = [];

          for (const applicant of selectedApps) {
            const res = await fetch(`${API_URL}/api/volunteer_applications/${applicant.id}`, {
              method: "PUT",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                application_status: status.toLowerCase().replace(" ", "_"),
                notes,
              }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                body.error || `Failed to update APP-${String(applicant.id).padStart(4, "0")}.`
              );
            }
            updatedApplicants.push({ ...applicant, status, notes });
          }

          setApplicants((current) =>
            current.map(
              (applicant) =>
                updatedApplicants.find((updated) => updated.id === applicant.id) || applicant
            )
          );
          showToast(
            updatedApplicants.length === 1
              ? `${updatedApplicants[0].name}'s application updated to ${status}.`
              : `${updatedApplicants.length} applications updated to ${status}.`
          );
          setModal(null);
          setSelectedApplicant(null);
        }}
      />
    </>
  );
}
