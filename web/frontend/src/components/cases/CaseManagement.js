"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./CaseManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";

// ─── PLACEHOLDER DATA ────────────────────────────────────────────────────────
const REGIONS = ["NCR", "Region I", "Region II", "Region III", "Region IV-A", "Region V", "Region VI", "Region VII"];
const OFFICERS = ["Alexa Gagan", "Marco Santos", "Ryan Dela Paz", "Ben Mercado", "Camille Torres"];
const STATUSES = ["Submitted", "Active", "Unassigned", "Verified True", "Verified False", "Dismissed"];

function makeCase(id) {
  return {
    id,
    caseId:   "00" + String(100000 + id).slice(-6),
    reporterId: String(10000000 + id * 7).slice(0, 8),
    region:   REGIONS[id % REGIONS.length],
    status:   STATUSES[id % STATUSES.length],
    officer:  OFFICERS[id % OFFICERS.length],
    dateSubmitted: `0${(id % 9) + 1}/0${(id % 7) + 1}/2026`,
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  };
}

const PLACEHOLDER_CASES = Array.from({ length: 28 }, (_, i) => makeCase(i + 1));
const STATUS_FILTERS = ["Unassigned", "Verified True", "Verified False", "Active", "Dismissed"];
const PAGE_SIZE = 11;

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    "Submitted":      styles.badgeSubmitted,
    "Active":         styles.badgeActive,
    "Unassigned":     styles.badgeUnassigned,
    "Verified True":  styles.badgeVerifiedTrue,
    "Verified False": styles.badgeVerifiedFalse,
    "Dismissed":      styles.badgeDismissed,
  };
  return (
    <span className={`${styles.badge} ${map[status] || styles.badgeSubmitted}`}>
      <span className={styles.badgeDot} />
      {status}
    </span>
  );
}

function Pagination({ current, total, onChange }) {
  return (
    <div className={styles.pagination}>
      <button className={styles.pageArrow} onClick={() => onChange(current - 1)} disabled={current === 1}>←</button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
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

// ══════════════════════════════════════════════════════════════════
// MODAL SHELL
// ══════════════════════════════════════════════════════════════════
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
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

// ── View Case Modal ───────────────────────────────────────────────
function ViewCaseModal({ open, onClose, caseData }) {
  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title="Case Details">
      <div className={styles.viewGrid}>
        {[
          ["Case ID", caseData.caseId],
          ["Reporter ID", caseData.reporterId],
          ["Region", caseData.region],
          ["Status", <StatusBadge status={caseData.status} />],
          ["Assigned Officer", caseData.officer],
          ["Date Submitted", caseData.dateSubmitted],
          ["Description", caseData.description],
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

// ── Assign Case Modal ─────────────────────────────────────────────
function AssignCaseModal({ open, onClose, caseData, onSave }) {
  const [officer, setOfficer] = useState("");
  const [error, setError]     = useState("");

  useEffect(() => { if (caseData) setOfficer(caseData.officer || ""); }, [caseData]);

  function handleSave() {
    if (!officer.trim()) { setError("Please select or enter an officer."); return; }
    onSave({ ...caseData, officer, status: "Active" });
    setError("");
    onClose();
  }

  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title="Assign Case">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.caseId} readOnly />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Assign to Officer *</label>
          <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} value={officer} onChange={(e) => setOfficer(e.target.value)}>
            <option value="">— Select Officer —</option>
            {OFFICERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {error && <span className={styles.errorMsg}>{error}</span>}
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave}>Assign Case</button>
      </div>
    </Modal>
  );
}

// ── Manage Status Modal ───────────────────────────────────────────
function ManageStatusModal({ open, onClose, caseData, onSave }) {
  const [status, setStatus] = useState("");
  useEffect(() => { if (caseData) setStatus(caseData.status || ""); }, [caseData]);

  function handleSave() {
    onSave({ ...caseData, status });
    onClose();
  }

  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title="Manage Case Status">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.caseId} readOnly />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Status</label>
          <div className={styles.radioGroup}>
            {STATUSES.map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input type="radio" name="case-status" value={s} checked={status === s} onChange={() => setStatus(s)} className={styles.radioInput} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave}>Save Status</button>
      </div>
    </Modal>
  );
}

// ── Verify Case Modal ─────────────────────────────────────────────
function VerifyCaseModal({ open, onClose, caseData, onSave }) {
  const [verdict, setVerdict] = useState("Verified True");
  const [notes, setNotes]     = useState("");
  useEffect(() => { if (caseData) { setVerdict("Verified True"); setNotes(""); } }, [caseData]);

  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title="Verify Case">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.caseId} readOnly />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Verification Result</label>
          <div className={styles.radioGroup}>
            {["Verified True", "Verified False"].map((v) => (
              <label key={v} className={styles.radioLabel}>
                <input type="radio" name="verdict" value={v} checked={verdict === v} onChange={() => setVerdict(v)} className={styles.radioInput} />
                {v}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea className={styles.formInput} rows={3} placeholder="Add verification notes…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={() => { onSave({ ...caseData, status: verdict }); onClose(); }}>Submit Verification</button>
      </div>
    </Modal>
  );
}

// ── View All Cases Modal ──────────────────────────────────────────
function ViewAllCasesModal({ open, onClose, cases, onView, onAssign, onStatus, onVerify }) {
  const [q, setQ] = useState("");
  const filtered  = useMemo(() => cases.filter((c) =>
    c.caseId.includes(q) || c.officer.toLowerCase().includes(q.toLowerCase()) || c.region.toLowerCase().includes(q.toLowerCase())
  ), [cases, q]);

  return (
    <Modal open={open} onClose={onClose} title="All Cases">
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} type="text" placeholder="Search by Case ID, officer, region…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Case ID</th><th>Region</th><th>Status</th><th>Officer</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} className={styles.emptyState}>No cases found.</td></tr>
              : filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.caseId}</td>
                  <td>{c.region}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.officer}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.tblBtnView}   onClick={() => { onView(c);   onClose(); }}>View</button>
                      <button className={styles.tblBtnEdit}   onClick={() => { onAssign(c); onClose(); }}>Assign</button>
                      <button className={styles.tblBtnStatus} onClick={() => { onStatus(c); onClose(); }}>Status</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ── Cookies ─────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function CaseManagement() {
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  useEffect(() => {
    const userCookie = getCookie('user');  // ← NEW
    if (userCookie) {
      const storedUser = JSON.parse(userCookie);
      setUser({
        role: storedUser.role_name,        // ← note: role_name not roles?.role_name
        firstName: storedUser.first_name,
        lastName: storedUser.last_name,
      });
    }
  }, []);

  const [cases, setCases]           = useState(PLACEHOLDER_CASES);
  const [search, setSearch]         = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [toast, setToast]           = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const stats = useMemo(() => [
    { num: cases.filter((c) => c.status === "Unassigned").length, label: "Unassigned Cases" },
    { num: cases.filter((c) => c.status === "Active").length,     label: "Active Cases"     },
    { num: cases.length,                                            label: "Total Cases"      },
  ], [cases]);

  function updateCase(updated) {
    setCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    showToast(`Case ${updated.caseId} updated successfully.`);
  }

  const filtered = useMemo(() => cases.filter((c) => {
    const matchSearch = !search || c.caseId.includes(search) || c.officer.toLowerCase().includes(search.toLowerCase()) || c.region.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !activeFilter || c.status === activeFilter;
    return matchSearch && matchFilter;
  }), [cases, search, activeFilter]);

  useEffect(() => setPage(1), [search, activeFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openView(c)   { setSelected(c); setModal("view"); }
  function openAssign(c) { setSelected(c); setModal("assign"); }
  function openStatus(c) { setSelected(c); setModal("status"); }
  function openVerify(c) { setSelected(c); setModal("verify"); }
  function closeModal()  { setModal(null); }

  return (
    <>
      <Navbar user={user} />

      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      <main className={styles.pageWrapper}>
        {/* Hero */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Case Management</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label }) => (
                  <div key={label} className="col-12 col-md-4">
                    <div className={styles.statCard}>
                      <span className={styles.statDot} />
                      <p className={styles.statNum}>{num}</p>
                      <p className={styles.statLabel}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <div className="container-xl py-4">
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconView.png" alt="" className={styles.actionIconImg} />}
                title="View Cases"
                description="Browse all submitted cases and their current statuses."
                onView={() => setModal("viewAll")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconAssign.png" alt="" className={styles.actionIconImg} />}
                title="Assign Cases"
                description="Assign unassigned cases to available case officers."
                onView={() => setModal("viewAll")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconManage.png" alt="" className={styles.actionIconImg} />}
                title="Manage Case Status"
                description="Update the status of active or submitted cases."
                onView={() => setModal("viewAll")}
              />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard
                icon={<img src="CaseIconVerify.png" alt="" className={styles.actionIconImg} />}
                title="Verify Cases"
                description="Review and verify the authenticity of reported cases."
                onView={() => setModal("viewAll")}
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All the List of Cases</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Reporter ID</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Assigned Officer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0
                      ? <tr><td colSpan={6} className={styles.emptyState}>No cases found.</td></tr>
                      : paginated.map((c) => (
                        <tr key={c.id}>
                          <td>{c.caseId}</td>
                          <td>{c.reporterId}</td>
                          <td>{c.region}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>{c.officer}</td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button className={styles.tblBtnView}   onClick={() => openView(c)}>View</button>
                              <button className={styles.tblBtnEdit}   onClick={() => openAssign(c)}>Assign</button>
                              <button className={styles.tblBtnStatus} onClick={() => openStatus(c)}>Status</button>
                              <button className={styles.tblBtnVerify} onClick={() => openVerify(c)}>Verify</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                <Pagination current={page} total={totalPages} onChange={setPage} />
              </div>

              {/* Sidebar */}
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
                  <div className={styles.filterList}>
                    {STATUS_FILTERS.map((f) => (
                      <button key={f} className={`${styles.filterBtn} ${activeFilter === f ? styles.filterBtnActive : ""}`} onClick={() => setActiveFilter(activeFilter === f ? null : f)}>{f}</button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <ViewCaseModal      open={modal === "view"}    onClose={closeModal} caseData={selected} />
      <AssignCaseModal    open={modal === "assign"}  onClose={closeModal} caseData={selected} onSave={updateCase} />
      <ManageStatusModal  open={modal === "status"}  onClose={closeModal} caseData={selected} onSave={updateCase} />
      <VerifyCaseModal    open={modal === "verify"}  onClose={closeModal} caseData={selected} onSave={updateCase} />
      <ViewAllCasesModal  open={modal === "viewAll"} onClose={closeModal} cases={cases} onView={openView} onAssign={openAssign} onStatus={openStatus} onVerify={openVerify} />
    </>
  );
}