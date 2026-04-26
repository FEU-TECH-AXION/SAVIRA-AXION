"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./VolunteerManagement.module.css";
import { FiSearch, FiX } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION — uncomment when ready
// ─────────────────────────────────────────────────────────────────────────────

const APPLICATION_STATUSES = ["Pending", "Reviewing", "Approved", "Rejected"];

const PLACEHOLDER_APPLICANTS = [
  { id: "00111222333", name: "Alexa Gagan",    email: "alexa@example.com", contact: "+63 9 1234 5678", dateApplied: "03/03/2026", status: "Pending",   notes: "" },
  { id: "00111222334", name: "Shane Oxina",    email: "shane@example.com", contact: "+63 9 1234 5678", dateApplied: "03/03/2026", status: "Reviewing", notes: "" },
  { id: "00111222335", name: "Maria Bautista", email: "maria@example.com", contact: "+63 9 8765 4321", dateApplied: "02/28/2026", status: "Approved",  notes: "" },
  { id: "00111222336", name: "Carlo Navarro",  email: "carlo@example.com", contact: "+63 9 5555 1234", dateApplied: "03/01/2026", status: "Pending",   notes: "" },
  { id: "00111222337", name: "Diana Flores",   email: "diana@example.com", contact: "+63 9 2222 3333", dateApplied: "02/20/2026", status: "Rejected",  notes: "Does not meet requirements." },
  { id: "00111222338", name: "Noel Ramos",     email: "noel@example.com",  contact: "+63 9 4444 5555", dateApplied: "03/05/2026", status: "Reviewing", notes: "" },
  { id: "00111222339", name: "Grace Ocampo",   email: "grace@example.com", contact: "+63 9 6666 7777", dateApplied: "03/06/2026", status: "Pending",   notes: "" },
  { id: "00111222340", name: "Andrei Lim",     email: "andrei@example.com",contact: "+63 9 8888 9999", dateApplied: "03/07/2026", status: "Approved",  notes: "" },
  { id: "00111222341", name: "Issa Valdez",    email: "issa@example.com",  contact: "+63 9 0000 1111", dateApplied: "03/08/2026", status: "Pending",   notes: "" },
  { id: "00111222342", name: "Leo Aquino",     email: "leo@example.com",   contact: "+63 9 1212 3434", dateApplied: "03/09/2026", status: "Pending",   notes: "" },
];

const PAGE_SIZE = 6;

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Pending:   { bg: "#fef3c7", color: "#92400e" },
    Reviewing: { bg: "#dbeafe", color: "#1e40af" },
    Approved:  { bg: "#d1fae5", color: "#065f46" },
    Rejected:  { bg: "#fee2e2", color: "#991b1b" },
  };
  const style = map[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Status Progress Track ─────────────────────────────────────────────────────
function StatusTrack({ status }) {
  const steps = ["Pending", "Reviewing", "Approved"];
  const idx = steps.indexOf(status);
  if (status === "Rejected") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: "0.75rem", color: "#991b1b", fontWeight: 600 }}>Application Rejected</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12 }}>
      {steps.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: `3px solid ${i <= idx ? "#E8663A" : "#d1d5db"}`,
              background: i < idx ? "#E8663A" : "#fff",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.7rem", color: i === idx ? "#292929" : "#9ca3af", fontWeight: i === idx ? 700 : 400, marginTop: 4, textAlign: "center" }}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? "#E8663A" : "#d1d5db", margin: "0 0 1rem" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className={styles.pagination}>
      <button className={styles.pageArrow} onClick={() => onChange(current - 1)} disabled={current === 1}>←</button>
      {pages.map((p) => (
        <button key={p} className={`${styles.pageBtn} ${p === current ? styles.pageBtnActive : ""}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={styles.pageArrow} onClick={() => onChange(current + 1)} disabled={current === total}>→</button>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ icon, title, description, onView }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}><span className={styles.actionIcon}>{icon}</span></div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>View &rarr;</button>
      </div>
    </div>
  );
}

// ── Modal Shell ───────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><FiX /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ── View Applicant Modal ──────────────────────────────────────────────────────
function ViewApplicantModal({ open, onClose, applicant }) {
  if (!applicant) return null;
  return (
    <Modal open={open} onClose={onClose} title="Applicant Details">
      <div className={styles.viewGrid}>
        {[
          ["ID", applicant.id],
          ["Full Name", applicant.name],
          ["Email", applicant.email],
          ["Contact", applicant.contact],
          ["Date Applied", applicant.dateApplied],
          ["Status", <StatusBadge status={applicant.status} />],
          ["Notes", applicant.notes || "—"],
        ].map(([k, v]) => (
          <div key={k} className={styles.viewRow}>
            <span className={styles.viewKey}>{k}</span>
            <span className={styles.viewVal}>{v}</span>
          </div>
        ))}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ── Update Status Modal ───────────────────────────────────────────────────────
function UpdateStatusModal({ open, onClose, applicant, onSave }) {
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  useEffect(() => { if (applicant) { setStatus(applicant.status); setNotes(applicant.notes || ""); } }, [applicant]);
  if (!applicant) return null;
  function handleSubmit() { onSave({ ...applicant, status, notes }); onClose(); }
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
                <input type="radio" name="app-status" value={s} checked={status === s} onChange={() => setStatus(s)} className={styles.radioInput} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea className={styles.formInput} rows={3} placeholder="Optional reviewer notes…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ── Select Applicant Modal (action card → modal chaining) ─────────────────────
function SelectApplicantModal({ open, onClose, applicants, title, filterStatus, actionLabel, actionBtnClass, onAction }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const base = filterStatus ? applicants.filter((a) => a.status === filterStatus) : applicants;
    if (!q.trim()) return base;
    return base.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.id.includes(q));
  }, [applicants, q, filterStatus]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} type="text" placeholder="Search applicants…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Name</th><th>Date Applied</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No applicants found.</td></tr>
            ) : (
              list.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.dateApplied}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><button className={actionBtnClass} onClick={() => { onAction(a); onClose(); }}>{actionLabel}</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function VolunteerManagement() {
  const user = { role: "admin", firstName: "Admin", lastName: "User" };

  const [applicants, setApplicants] = useState(PLACEHOLDER_APPLICANTS);
  const [search, setSearch] = useState("");
  const [activeSort, setActiveSort] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function closeModal() { setModal(null); }
  function openView(a)   { setSelectedApplicant(a); setModal("view"); }
  function openUpdate(a) { setSelectedApplicant(a); setModal("update"); }

  function handleUpdate(updated) {
    setApplicants((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    showToast(`${updated.name}'s application updated to ${updated.status}.`);
  }

  const stats = useMemo(() => [
    { num: applicants.filter((a) => a.status === "Pending").length,   label: "New Applicants",        hasNew: true },
    { num: applicants.filter((a) => a.status === "Reviewing").length, label: "Unreviewed Application", hasNew: true },
  ], [applicants]);

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      const matchSearch = !search.trim() || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search);
      if (!matchSearch) return false;
      if (activeSort) return a.status === activeSort;
      return true;
    });
  }, [applicants, search, activeSort]);

  useEffect(() => { setPage(1); }, [search, activeSort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Navbar user={user} />
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      <main className={styles.pageWrapper}>
        {/* ── Hero Banner ── */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Volunteer Management</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, hasNew }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
                      {hasNew && <span className={styles.statDot} />}
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
              <ActionCard icon="⏳" title="See Pending Applications" description="Review all applications currently awaiting action." onView={() => setModal("selectPending")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="🔍" title="Under Review" description="Applications currently being reviewed by the team." onView={() => setModal("selectReviewing")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="✅" title="Approved Application" description="View and manage approved volunteer applications." onView={() => setModal("selectApproved")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="👥" title="View All Applicants" description="Browse the complete list of all volunteer applicants." onView={() => setModal("selectAll")} />
            </div>
          </div>
        </div>

        {/* ── All Applicants List ── */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Applicants</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div>
                {paginated.length === 0 ? (
                  <div className={styles.emptyState}>No applicants found.</div>
                ) : (
                  paginated.map((a) => (
                    <div key={a.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, marginBottom: "1rem", overflow: "hidden" }}>
                      <div style={{ background: "#037F81", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1.25rem" }}>
                        <span style={{ color: "#fff", fontWeight: 700 }}>{a.name}</span>
                        <button className={styles.viewBtn} onClick={() => openView(a)}>View →</button>
                      </div>
                      <div style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>Email: {a.email}</span>
                          <span style={{ fontSize: "0.82rem", color: "#292929", fontWeight: 600 }}>ID: {a.id}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>Contact Number: {a.contact}</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "4px 0 0" }}>Date Applied: {a.dateApplied}</p>
                        <StatusTrack status={a.status} />
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                          <button className={styles.tblBtnEdit} onClick={() => openUpdate(a)}>Update Status</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Pagination current={page} total={totalPages} onChange={setPage} />
              </div>

              <aside className={styles.sidebar}>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Search</h3>
                  <div className={styles.searchWrap}>
                    <input className={styles.searchInput} type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                </div>
                <div className={styles.sidebarBlock}>
                  <h3 className={styles.sidebarLabel}>Sort By</h3>
                  <div className={styles.roleList}>
                    {APPLICATION_STATUSES.map((s) => (
                      <button key={s} className={`${styles.roleBtn} ${activeSort === s ? styles.roleBtnActive : ""}`} onClick={() => setActiveSort(activeSort === s ? null : s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}
      <SelectApplicantModal open={modal === "selectPending"}   onClose={closeModal} applicants={applicants} title="Pending Applications"   filterStatus="Pending"   actionLabel="Review" actionBtnClass={styles.tblBtnEdit} onAction={(a) => { closeModal(); openUpdate(a); }} />
      <SelectApplicantModal open={modal === "selectReviewing"} onClose={closeModal} applicants={applicants} title="Under Review"           filterStatus="Reviewing" actionLabel="Update" actionBtnClass={styles.tblBtnEdit} onAction={(a) => { closeModal(); openUpdate(a); }} />
      <SelectApplicantModal open={modal === "selectApproved"}  onClose={closeModal} applicants={applicants} title="Approved Applications"  filterStatus="Approved"  actionLabel="View"   actionBtnClass={styles.tblBtnView} onAction={(a) => { closeModal(); openView(a); }} />
      <SelectApplicantModal open={modal === "selectAll"}       onClose={closeModal} applicants={applicants} title="All Applicants"         filterStatus={null}      actionLabel="View"   actionBtnClass={styles.tblBtnView} onAction={(a) => { closeModal(); openView(a); }} />
      <ViewApplicantModal   open={modal === "view"}   onClose={closeModal} applicant={selectedApplicant} />
      <UpdateStatusModal    open={modal === "update"} onClose={closeModal} applicant={selectedApplicant} onSave={handleUpdate} />
    </>
  );
}