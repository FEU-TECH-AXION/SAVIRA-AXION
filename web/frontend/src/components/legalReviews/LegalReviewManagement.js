"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar/navbar";
import styles from "./LegalReviewManagement.module.css";
import { FiSearch, FiX } from "react-icons/fi"; 

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION — uncomment when ready
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_STATUSES = ["Under Review", "Insufficient Context", "For Legal Action", "Referred", "Dismissed"];

const PLACEHOLDER_CASES = [
  { id: "00112233", reporterId: "12345678", region: "NCR",         legalStatus: "Under Review",        assignedOfficer: "Ryan Dela Paz", endorsed: true,  dateReported: "03/01/2026", referralNotes: "" },
  { id: "00112234", reporterId: "12345679", region: "NCR",         legalStatus: "For Legal Action",    assignedOfficer: "Noel Ramos",    endorsed: true,  dateReported: "03/02/2026", referralNotes: "" },
  { id: "00112235", reporterId: "12345680", region: "Region III",  legalStatus: "Insufficient Context",assignedOfficer: "",              endorsed: false, dateReported: "03/03/2026", referralNotes: "Needs more evidence." },
  { id: "00112236", reporterId: "12345681", region: "NCR",         legalStatus: "Referred",            assignedOfficer: "Ryan Dela Paz", endorsed: true,  dateReported: "03/04/2026", referralNotes: "Referred to NBI." },
  { id: "00112237", reporterId: "12345682", region: "Region IV-A", legalStatus: "Dismissed",           assignedOfficer: "Noel Ramos",    endorsed: false, dateReported: "02/28/2026", referralNotes: "" },
  { id: "00112238", reporterId: "12345683", region: "NCR",         legalStatus: "Under Review",        assignedOfficer: "",              endorsed: false, dateReported: "03/05/2026", referralNotes: "" },
  { id: "00112239", reporterId: "12345684", region: "Region VII",  legalStatus: "For Legal Action",    assignedOfficer: "Ryan Dela Paz", endorsed: true,  dateReported: "02/25/2026", referralNotes: "" },
  { id: "00112240", reporterId: "12345685", region: "NCR",         legalStatus: "Under Review",        assignedOfficer: "",              endorsed: false, dateReported: "03/06/2026", referralNotes: "" },
  { id: "00112241", reporterId: "12345686", region: "Region I",    legalStatus: "Referred",            assignedOfficer: "Noel Ramos",    endorsed: true,  dateReported: "03/07/2026", referralNotes: "Referred to CHR." },
  { id: "00112242", reporterId: "12345687", region: "NCR",         legalStatus: "Dismissed",           assignedOfficer: "Ryan Dela Paz", endorsed: false, dateReported: "02/20/2026", referralNotes: "" },
  { id: "00112243", reporterId: "12345688", region: "NCR",         legalStatus: "Under Review",        assignedOfficer: "",              endorsed: false, dateReported: "03/08/2026", referralNotes: "" },
  { id: "00112244", reporterId: "12345689", region: "Region VI",   legalStatus: "For Legal Action",    assignedOfficer: "Ryan Dela Paz", endorsed: true,  dateReported: "03/09/2026", referralNotes: "" },
];

const LEGAL_OFFICERS = ["Ryan Dela Paz", "Noel Ramos", "Lena Cruz"];
const PAGE_SIZE = 8;

// ── Status Badge ──────────────────────────────────────────────────────────────
function LegalBadge({ status }) {
  const map = {
    "Under Review":         { bg: "#dbeafe", color: "#1e40af" },
    "Insufficient Context": { bg: "#fef3c7", color: "#92400e" },
    "For Legal Action":     { bg: "#fce7f3", color: "#9d174d" },
    "Referred":             { bg: "#d1fae5", color: "#065f46" },
    "Dismissed":            { bg: "#fee2e2", color: "#991b1b" },
  };
  const style = map[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
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

// ── View Case Modal ───────────────────────────────────────────────────────────
function ViewCaseModal({ open, onClose, caseData }) {
  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title="Legal Case Details">
      <div className={styles.viewGrid}>
        {[
          ["Case ID",          caseData.id],
          ["Reporter ID",      caseData.reporterId],
          ["Region",           caseData.region],
          ["Legal Status",     <LegalBadge status={caseData.legalStatus} />],
          ["Assigned Officer", caseData.assignedOfficer || "Unassigned"],
          ["Endorsed",         caseData.endorsed ? "Yes" : "No"],
          ["Date Reported",    caseData.dateReported],
          ["Referral Notes",   caseData.referralNotes || "—"],
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

// ── Paralegal Support Modal ───────────────────────────────────────────────────
function ParalegalModal({ open, onClose, caseData, onSave }) {
  const [officer, setOfficer] = useState("");
  useEffect(() => { if (caseData) setOfficer(caseData.assignedOfficer || ""); }, [caseData]);
  if (!caseData) return null;
  function handleSubmit() {
    onSave({ ...caseData, assignedOfficer: officer });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Paralegal Support — Assign Officer">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.id} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Assign Legal Officer *</label>
          <select className={styles.formInput} value={officer} onChange={(e) => setOfficer(e.target.value)}>
            <option value="">— Select Legal Officer —</option>
            {LEGAL_OFFICERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!officer}>Assign</button>
      </div>
    </Modal>
  );
}

// ── Request Legal Advice / Update Status Modal ────────────────────────────────
function LegalAdviceModal({ open, onClose, caseData, onSave }) {
  const [legalStatus, setLegalStatus] = useState("Under Review");
  const [referralNotes, setReferralNotes] = useState("");
  useEffect(() => { if (caseData) { setLegalStatus(caseData.legalStatus); setReferralNotes(caseData.referralNotes || ""); } }, [caseData]);
  if (!caseData) return null;
  function handleSubmit() {
    onSave({ ...caseData, legalStatus, referralNotes });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Request Legal Advice / Update Status">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.id} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Legal Status</label>
          <select className={styles.formInput} value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)}>
            {LEGAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Referral Notes</label>
          <textarea className={styles.formInput} rows={3} placeholder="Notes on legal advice or referral details…" value={referralNotes} onChange={(e) => setReferralNotes(e.target.value)} style={{ resize: "vertical" }} />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ── Track Referrals / Endorse Modal ──────────────────────────────────────────
function ReferralModal({ open, onClose, caseData, onSave }) {
  const [endorsed, setEndorsed] = useState(false);
  const [referralNotes, setReferralNotes] = useState("");
  useEffect(() => { if (caseData) { setEndorsed(caseData.endorsed); setReferralNotes(caseData.referralNotes || ""); } }, [caseData]);
  if (!caseData) return null;
  function handleSubmit() {
    onSave({ ...caseData, endorsed, referralNotes, legalStatus: endorsed ? "Referred" : caseData.legalStatus });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Track Referral / Endorse Case">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.id} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Endorsed?</label>
          <div className={styles.radioGroup}>
            {[true, false].map((v) => (
              <label key={String(v)} className={styles.radioLabel}>
                <input type="radio" name="endorsed" value={String(v)} checked={endorsed === v} onChange={() => setEndorsed(v)} className={styles.radioInput} />
                {v ? "Yes — Endorsed" : "No — Not Endorsed"}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Referral Notes</label>
          <textarea className={styles.formInput} rows={3} placeholder="e.g. Referred to NBI, CHR, etc." value={referralNotes} onChange={(e) => setReferralNotes(e.target.value)} style={{ resize: "vertical" }} />
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save Referral</button>
      </div>
    </Modal>
  );
}

// ── Verify Case Modal ─────────────────────────────────────────────────────────
function VerifyModal({ open, onClose, caseData, onSave }) {
  const [legalStatus, setLegalStatus] = useState("Under Review");
  useEffect(() => { if (caseData) setLegalStatus(caseData.legalStatus); }, [caseData]);
  if (!caseData) return null;
  function handleSubmit() { onSave({ ...caseData, legalStatus }); onClose(); }
  return (
    <Modal open={open} onClose={onClose} title="Verify Case — Set Legal Status">
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Case ID</label>
          <input className={styles.formInput} value={caseData.id} disabled />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Legal Status</label>
          <div className={styles.radioGroup} style={{ flexWrap: "wrap" }}>
            {LEGAL_STATUSES.map((s) => (
              <label key={s} className={styles.radioLabel}>
                <input type="radio" name="verify-status" value={s} checked={legalStatus === s} onChange={() => setLegalStatus(s)} className={styles.radioInput} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit}>Save</button>
      </div>
    </Modal>
  );
}

// ── Select Case Modal (action card → modal chaining) ──────────────────────────
function SelectCaseModal({ open, onClose, cases, title, filterStatus, actionLabel, actionBtnClass, onAction }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const base = filterStatus ? cases.filter((c) => c.legalStatus === filterStatus) : cases;
    if (!q.trim()) return base;
    return base.filter((c) => c.id.includes(q) || c.region.toLowerCase().includes(q.toLowerCase()));
  }, [cases, q, filterStatus]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} type="text" placeholder="Search cases…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Case ID</th><th>Region</th><th>Legal Status</th><th>Action</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyState}>No cases found.</td></tr>
            ) : (
              list.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.region}</td>
                  <td><LegalBadge status={c.legalStatus} /></td>
                  <td><button className={actionBtnClass} onClick={() => { onAction(c); onClose(); }}>{actionLabel}</button></td>
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

// ── Cookies ─────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
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
export default function LegalReviewManagement() {
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  useEffect(() => {
  const userCookie = getCookie('user');
  if (userCookie) {
    const storedUser = JSON.parse(userCookie);
    setUser({
      role: storedUser.role_name,
      firstName: storedUser.first_name,
      lastName: storedUser.last_name,
    });
  }
}, []);

  const [cases, setCases] = useState(PLACEHOLDER_CASES);
  const [search, setSearch] = useState("");
  const [activeSort, setActiveSort] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function closeModal() { setModal(null); }
  function openView(c)       { setSelectedCase(c); setModal("view"); }
  function openParalegal(c)  { setSelectedCase(c); setModal("paralegal"); }
  function openAdvice(c)     { setSelectedCase(c); setModal("advice"); }
  function openReferral(c)   { setSelectedCase(c); setModal("referral"); }
  function openVerify(c)     { setSelectedCase(c); setModal("verify"); }

  function handleUpdate(updated) {
    setCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    showToast(`Case ${updated.id} updated.`);
  }

  const stats = useMemo(() => [
    { num: cases.filter((c) => c.legalStatus === "Under Review").length,    label: "Pending Review",  hasNew: true },
    { num: cases.filter((c) => c.legalStatus === "For Legal Action").length, label: "Active Cases",    hasNew: true },
    { num: cases.filter((c) => c.endorsed).length,                           label: "Endorsed Cases",  hasNew: true },
  ], [cases]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch = !search.trim() || c.id.includes(search) || c.region.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (activeSort) return c.legalStatus === activeSort;
      return true;
    });
  }, [cases, search, activeSort]);

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
              <h1 className={styles.heroTitle}>Legal Review</h1>
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
              <ActionCard icon="⚖️" title="Paralegal Support" description="Assign a legal officer to provide paralegal support for a case." onView={() => setModal("selectParalegal")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="📋" title="Request Legal Advice" description="Update the legal status or add legal advice notes to a case." onView={() => setModal("selectAdvice")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="📁" title="Track Referrals" description="Mark cases as endorsed and track referral details." onView={() => setModal("selectReferral")} />
            </div>
            <div className="col-12 col-sm-6">
              <ActionCard icon="✅" title="Verify Cases" description="Set the final legal verification status for a case." onView={() => setModal("selectVerify")} />
            </div>
          </div>
        </div>

        {/* ── All Cases Table ── */}
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
                      <th>Legal Status</th>
                      <th>Assigned Officer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={6} className={styles.emptyState}>No cases found.</td></tr>
                    ) : (
                      paginated.map((c) => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td>{c.reporterId}</td>
                          <td>{c.region}</td>
                          <td><LegalBadge status={c.legalStatus} /></td>
                          <td>{c.assignedOfficer || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Unassigned</span>}</td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button className={styles.tblBtnView}   onClick={() => openView(c)}>View</button>
                              <button className={styles.tblBtnEdit}   onClick={() => openAdvice(c)}>Status</button>
                              <button className={styles.tblBtnDelete} onClick={() => openReferral(c)}>Refer</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
                    {LEGAL_STATUSES.map((s) => (
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
      <SelectCaseModal open={modal === "selectParalegal"} onClose={closeModal} cases={cases} title="Select a Case for Paralegal Support" filterStatus={null}           actionLabel="Assign"  actionBtnClass={styles.tblBtnEdit}   onAction={(c) => { closeModal(); openParalegal(c); }} />
      <SelectCaseModal open={modal === "selectAdvice"}    onClose={closeModal} cases={cases} title="Select a Case for Legal Advice"     filterStatus={null}           actionLabel="Advise"  actionBtnClass={styles.tblBtnEdit}   onAction={(c) => { closeModal(); openAdvice(c); }} />
      <SelectCaseModal open={modal === "selectReferral"}  onClose={closeModal} cases={cases} title="Select a Case to Track Referral"    filterStatus={null}           actionLabel="Refer"   actionBtnClass={styles.tblBtnDelete} onAction={(c) => { closeModal(); openReferral(c); }} />
      <SelectCaseModal open={modal === "selectVerify"}    onClose={closeModal} cases={cases} title="Select a Case to Verify"           filterStatus="Under Review"   actionLabel="Verify"  actionBtnClass={styles.tblBtnView}   onAction={(c) => { closeModal(); openVerify(c); }} />

      <ViewCaseModal     open={modal === "view"}      onClose={closeModal} caseData={selectedCase} />
      <ParalegalModal    open={modal === "paralegal"} onClose={closeModal} caseData={selectedCase} onSave={handleUpdate} />
      <LegalAdviceModal  open={modal === "advice"}    onClose={closeModal} caseData={selectedCase} onSave={handleUpdate} />
      <ReferralModal     open={modal === "referral"}  onClose={closeModal} caseData={selectedCase} onSave={handleUpdate} />
      <VerifyModal       open={modal === "verify"}    onClose={closeModal} caseData={selectedCase} onSave={handleUpdate} />
    </>
  );
}