"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./LegalReviewManagement.module.css";
import { FiSearch, FiX, FiClock, FiCheck, FiChevronDown, FiChevronUp, FiAlertTriangle } from "react-icons/fi";
import LegalTable from "./LegalTable";
import FilterMenu from "./FilterMenu";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_CASE_STATUSES = [
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
  "Dismissed",
  "Perpetrator Convicted",
];

const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

// These are used as fallbacks; actual lists are fetched from backend
const LEGAL_OFFICERS = ["Ryan Dela Paz", "Noel Ramos", "Lena Cruz", "Mia Villanueva"];
const PARALEGALS = ["Sofia Reyes", "Carlo Tan", "Tricia Bautista"];
const PAGE_SIZE = 8;

// Maps case_status_id (from DB) to status label
const STATUS_STEP = {
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

// Only cases with this status from Case Management are passed to Legal Review
const VERIFIED_TRUE_STATUS = "Verified - True";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS COLORS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.74rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

function PendingBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px dashed #f59e0b" }}>
      <FiClock size={11} /> Pending Approval
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

function ActionCard({ icon, title, description, onView, badge }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionIconWrap}><span className={styles.actionIcon}>{icon}</span></div>
      <div className={styles.actionBody}>
        <h3 className={styles.actionTitle}>{title}</h3>
        {badge && <div style={{ marginBottom: "0.25rem" }}>{badge}</div>}
        <p className={styles.actionDesc}>{description}</p>
      </div>
      <div className={styles.ViewRow}>
        <button className={styles.viewBtn} onClick={onView}>Open →</button>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} style={wide ? { maxWidth: 700 } : {}} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><FiX /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function FormGroup({ label, required, hint, error, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
      {hint && !error && <span className={styles.formHint}>{hint}</span>}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
function FInput({ error, ...props }) { return <input className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props} />; }
function FTextarea({ error, ...props }) { return <textarea className={`${styles.formInput} ${error ? styles.inputError : ""}`} rows={3} style={{ resize: "vertical" }} {...props} />; }
function FSelect({ error, children, ...props }) { return <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>{children}</select>; }

// ─────────────────────────────────────────────────────────────────────────────
// VIEW CASE MODAL — full detail
// ─────────────────────────────────────────────────────────────────────────────

function ViewCaseModal({ open, onClose, caseData }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  if (!caseData) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Legal Case — ${caseData.id}`} wide>
      <div className={styles.viewGrid}>
        {[
          ["Case ID",              caseData.id],
          ["Reporter ID",          caseData.reporterId],
          ["Region",               caseData.region],
          ["Status",               <StatusBadge status={caseData.status} />],
          ["Legal Officer",        caseData.assignedLegalOfficer || "Unassigned"],
          ["Paralegal",            caseData.assignedParalegal || "Unassigned"],
          ["Date Reported",        caseData.dateReported],
          ["Endorsed To",          caseData.endorsedTo || "—"],
          ...(caseData.pendingApproval ? [["Pending Change", <PendingBadge />]] : []),
        ].map(([k, v]) => (
          <div key={k} className={styles.viewRow}>
            <span className={styles.viewKey}>{k}</span>
            <span className={styles.viewVal}>{v}</span>
          </div>
        ))}
      </div>

      {/* Endorsement Details */}
      {caseData.endorsementDetails && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>📁 Endorsement / Filing Details</h4>
          {Object.entries(caseData.endorsementDetails).map(([k, v]) => v ? (
            <div key={k} className={styles.viewRow}>
              <span className={styles.viewKey}>{k}</span>
              <span className={styles.viewVal}>{v}</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* Paralegal Record */}
      {caseData.paralegalRecord && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>📋 Paralegal Support Record</h4>
          <div className={styles.viewRow}><span className={styles.viewKey}>Organized by</span><span className={styles.viewVal}>{caseData.paralegalRecord.organizedBy}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Date</span><span className={styles.viewVal}>{caseData.paralegalRecord.date}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Documents</span><span className={styles.viewVal}>{caseData.paralegalRecord.documents}</span></div>
        </div>
      )}

      {/* Lawyer Record
      {caseData.lawyerRecord && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>⚖️ Lawyer Consultation Record</h4>
          <div className={styles.viewRow}><span className={styles.viewKey}>Assessed by</span><span className={styles.viewVal}>{caseData.lawyerRecord.assessedBy}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Date</span><span className={styles.viewVal}>{caseData.lawyerRecord.date}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Recommendation</span><span className={styles.viewVal}>{caseData.lawyerRecord.recommendation}</span></div>
        </div>
      )} */}

      {/* Monitoring log */}
      {(caseData.monitoringLog?.length > 0) && (
        <>
          <button className={styles.historyToggle} onClick={() => setShowMonitoring(!showMonitoring)}>
            {showMonitoring ? <FiChevronUp /> : <FiChevronDown />}
            {showMonitoring ? "Hide" : "Show"} Monitoring Log ({caseData.monitoringLog.length} entries)
          </button>
          {showMonitoring && (
            <div className={styles.historyList}>
              {caseData.monitoringLog.map((m, i) => (
                <div key={i} className={styles.historyItem}>
                  <div className={styles.historyDot} />
                  <div className={styles.historyContent}>
                    <span className={styles.historyMeta}>{m.date} · {m.by}</span>
                    <p className={styles.historyNotes}>{m.update}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Status history */}
      {(caseData.statusHistory?.length > 0) && (
        <>
          <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? <FiChevronUp /> : <FiChevronDown />}
            {showHistory ? "Hide" : "Show"} Status History ({caseData.statusHistory.length} entries)
          </button>
          {showHistory && (
            <div className={styles.historyList}>
              {caseData.statusHistory.map((h, i) => (
                <div key={i} className={styles.historyItem}>
                  <div className={styles.historyDot} />
                  <div className={styles.historyContent}>
                    <StatusBadge status={h.status} />
                    <span className={styles.historyMeta}>{h.date} · {h.by}</span>
                    {h.notes && <p className={styles.historyNotes}>{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN LEGAL OFFICER / PARALEGAL
// ─────────────────────────────────────────────────────────────────────────────

function AssignPersonnelModal({ open, onClose, caseData, onSave }) {
  const [officer, setOfficer] = useState("");
  const [paralegal, setParalegal] = useState("");
  useEffect(() => { if (caseData) { setOfficer(caseData.assignedLegalOfficer || ""); setParalegal(caseData.assignedParalegal || ""); } }, [caseData]);
  if (!caseData) return null;

  return (
    <Modal open={open} onClose={onClose} title="Assign Legal Personnel">
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.id} disabled /></FormGroup>
        <FormGroup label="Assign Legal Officer">
          <FSelect value={officer} onChange={(e) => setOfficer(e.target.value)}>
            <option value="">— Select Legal Officer —</option>
            {LEGAL_OFFICERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </FSelect>
        </FormGroup>
        <FormGroup label="Assign Paralegal">
          <FSelect value={paralegal} onChange={(e) => setParalegal(e.target.value)}>
            <option value="">— Select Paralegal (optional) —</option>
            {PARALEGALS.map((p) => <option key={p} value={p}>{p}</option>)}
          </FSelect>
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={() => { onSave({ ...caseData, assignedLegalOfficer: officer, assignedParalegal: paralegal }); onClose(); }}>Assign</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALEGAL SUPPORT MODAL — organize case facts and documents
// ─────────────────────────────────────────────────────────────────────────────

function ParalegalSupportModal({ open, onClose, caseData, onSave, actorName }) {
  const [form, setForm] = useState({ documents: [], timeline: "", swornStatement: "", screenshots: "", idDocuments: "", incidentDetails: "", otherNotes: "" });
  useEffect(() => { if (open && caseData) {
    const r = caseData.paralegalRecord;
    setForm({ documents: r?.documents?.split(", ") || [], timeline: r?.timeline || "", swornStatement: r?.swornStatement || "", screenshots: r?.screenshots || "", idDocuments: r?.idDocuments || "", incidentDetails: r?.incidentDetails || "", otherNotes: r?.otherNotes || "" });
  }}, [open, caseData]);
  if (!caseData) return null;

  const DOCS = ["Sworn statement", "Incident timeline", "Screenshots / digital evidence", "Complainant ID / identity documents", "Medical or medico-legal report", "Witness statements", "Correspondence / messages", "Photographs"];

  const toggle = (d) => setForm((p) => ({ ...p, documents: p.documents.includes(d) ? p.documents.filter((x) => x !== d) : [...p.documents, d] }));
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleSave() {
    const record = { organizedBy: actorName, date: new Date().toLocaleDateString(), documents: form.documents.join(", "), timeline: form.timeline, swornStatement: form.swornStatement, screenshots: form.screenshots, idDocuments: form.idDocuments, incidentDetails: form.incidentDetails, otherNotes: form.otherNotes };
    onSave({ ...caseData, paralegalRecord: record });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Paralegal Support — Case File Organization" wide>
      <p className={styles.formDesc}>As a paralegal, organize and document the facts, evidence, and supporting materials for this case. This record will inform lawyer consultation and referral decisions.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.id} disabled /></FormGroup>
        <FormGroup label="Documents / Evidence Organized" hint="Check all items that have been collected and organized.">
          <div className={styles.checkGroup}>
            {DOCS.map((d) => (
              <label key={d} className={styles.checkLabel}>
                <input type="checkbox" checked={form.documents.includes(d)} onChange={() => toggle(d)} className={styles.checkInput} />
                {d}
              </label>
            ))}
          </div>
        </FormGroup>
        <FormGroup label="Incident Timeline Summary" hint="Summarize the chronological sequence of events.">
          <FTextarea placeholder="e.g. January 5: First incident. January 12: Repeated contact. January 20: Complainant reported to supervisor..." value={form.timeline} onChange={set("timeline")} />
        </FormGroup>
        <FormGroup label="Sworn Statement Status">
          <FSelect value={form.swornStatement} onChange={set("swornStatement")}>
            <option value="">— Select —</option>
            <option>Obtained and filed</option>
            <option>Drafted — awaiting signature</option>
            <option>Not yet obtained</option>
            <option>Survivor declined</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Digital Evidence Notes" hint="Screenshots, messages, social media posts, etc.">
          <FTextarea placeholder="Describe digital evidence collected and its relevance…" value={form.screenshots} onChange={set("screenshots")} />
        </FormGroup>
        <FormGroup label="Identity Documents">
          <FInput placeholder="e.g. Complainant ID obtained, respondent identified" value={form.idDocuments} onChange={set("idDocuments")} />
        </FormGroup>
        <FormGroup label="Key Incident Details" hint="Facts that are most legally relevant.">
          <FTextarea placeholder="Document specific acts, dates, places, witnesses…" value={form.incidentDetails} onChange={set("incidentDetails")} />
        </FormGroup>
        <FormGroup label="Additional Notes">
          <FTextarea placeholder="Other paralegal observations or referral document notes…" value={form.otherNotes} onChange={set("otherNotes")} />
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave}>Save Paralegal Record</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAWYER CONSULTATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

// function LawyerConsultModal({ open, onClose, caseData, onSave, actorName }) {
//   const [form, setForm] = useState({ applicableLaws: [], actionType: [], evidenceGaps: "", recommendation: "", additionalNotes: "" });
//   useEffect(() => { if (open && caseData) {
//     const r = caseData.lawyerRecord;
//     setForm({ applicableLaws: r?.applicableLaws || [], actionType: r?.actionType || [], evidenceGaps: r?.evidenceGaps || "", recommendation: r?.recommendation || "", additionalNotes: r?.additionalNotes || "" });
//   }}, [open, caseData]);
//   if (!caseData) return null;

//   const LAWS = ["RA 11313 (Safe Spaces Act)", "RA 9262 (VAWC)", "RA 7877 (Anti-Sexual Harassment Act)", "RA 9995 (Anti-Photo and Video Voyeurism Act)", "RA 10175 (Cybercrime Prevention Act)", "RA 11930 (Anti-OSAEC and Anti-CSAEM Act)", "Revised Penal Code — Rape provisions", "RA 9208 (Anti-Trafficking in Persons Act)", "Administrative / institutional rules"];
//   const ACTIONS = ["Administrative action", "Civil action", "Criminal action"];

//   const toggleLaw = (l) => setForm((p) => ({ ...p, applicableLaws: p.applicableLaws.includes(l) ? p.applicableLaws.filter((x) => x !== l) : [...p.applicableLaws, l] }));
//   const toggleAction = (a) => setForm((p) => ({ ...p, actionType: p.actionType.includes(a) ? p.actionType.filter((x) => x !== a) : [...p.actionType, a] }));
//   const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

//   function handleSave() {
//     const record = { assessedBy: actorName, date: new Date().toLocaleDateString(), applicableLaws: form.applicableLaws, actionType: form.actionType, evidenceGaps: form.evidenceGaps, recommendation: form.recommendation, additionalNotes: form.additionalNotes };
//     onSave({ ...caseData, lawyerRecord: record });
//     onClose();
//   }

//   return (
//     <Modal open={open} onClose={onClose} title="Lawyer Consultation — Legal Assessment" wide>
//       <p className={styles.formDesc}>Assess the facts and identify applicable laws, possible courses of action, and evidence gaps. This record informs the referral decision and is documented for the survivor's benefit.</p>
//       <div className={styles.formGrid}>
//         <FormGroup label="Case ID"><FInput value={caseData.id} disabled /></FormGroup>
//         <FormGroup label="Applicable Laws / Provisions" hint="Select all that may apply based on the facts presented.">
//           <div className={styles.checkGroup}>
//             {LAWS.map((l) => (
//               <label key={l} className={styles.checkLabel}>
//                 <input type="checkbox" checked={form.applicableLaws.includes(l)} onChange={() => toggleLaw(l)} className={styles.checkInput} />
//                 {l}
//               </label>
//             ))}
//           </div>
//         </FormGroup>
//         <FormGroup label="Possible Courses of Action">
//           <div className={styles.checkGroup}>
//             {ACTIONS.map((a) => (
//               <label key={a} className={styles.checkLabel}>
//                 <input type="checkbox" checked={form.actionType.includes(a)} onChange={() => toggleAction(a)} className={styles.checkInput} />
//                 {a}
//               </label>
//             ))}
//           </div>
//         </FormGroup>
//         <FormGroup label="Evidence Gaps Identified" hint="What evidence or information is still missing?">
//           <FTextarea placeholder="e.g. No medico-legal report yet, respondent identity unconfirmed…" value={form.evidenceGaps} onChange={set("evidenceGaps")} />
//         </FormGroup>
//         <FormGroup label="Legal Recommendation" hint="What does the lawyer recommend as next steps for this case?">
//           <FTextarea placeholder="Provide clear recommendation — referral, filing, further investigation, etc." value={form.recommendation} onChange={set("recommendation")} />
//         </FormGroup>
//         <FormGroup label="Additional Notes">
//           <FTextarea placeholder="Other legal observations, risks, or notes…" value={form.additionalNotes} onChange={set("additionalNotes")} />
//         </FormGroup>
//       </div>
//       <div className={styles.modalFooter}>
//         <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
//         <button className={styles.btnPrimary} onClick={handleSave}>Save Consultation Record</button>
//       </div>
//     </Modal>
//   );
// }

// ─────────────────────────────────────────────────────────────────────────────
// ENDORSEMENT / REFERRAL MODAL — with full per-institution tracking
// ─────────────────────────────────────────────────────────────────────────────

function EndorseModal({ open, onClose, caseData, onSave, actorName }) {
  const [body, setBody] = useState("");
  const [details, setDetails] = useState({});
  useEffect(() => { if (open && caseData) { setBody(caseData.endorsedTo || ""); setDetails(caseData.endorsementDetails || {}); } }, [open, caseData]);
  if (!caseData) return null;

  const set = (k) => (e) => setDetails((p) => ({ ...p, [k]: e.target.value }));

  function handleSave() {
    onSave({ ...caseData, endorsedTo: body, endorsementDetails: details });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Endorse / Track Referral" wide>
      <p className={styles.formDesc}>Record all endorsement and referral details for this case. SASHA monitors whether services were actually provided and whether the receiving institution is acting properly.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.id} disabled /></FormGroup>
        <FormGroup label="Endorse to institution" required>
          <FSelect value={body} onChange={(e) => { setBody(e.target.value); setDetails({}); }}>
            <option value="">— Select institution —</option>
            {ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
          </FSelect>
        </FormGroup>

        {/* ── DSWD ── */}
        {body === "DSWD" && (
          <>
            <div className={styles.sectionDivider}><span>DSWD Monitoring Details</span></div>
            <FormGroup label="Date of Endorsement"><FInput type="date" value={details["Date of Endorsement"] || ""} onChange={set("Date of Endorsement")} /></FormGroup>
            <FormGroup label="Receiving Office / Person"><FInput placeholder="e.g. DSWD-NCR, Social Worker Dela Cruz" value={details["Receiving Office"] || ""} onChange={set("Receiving Office")} /></FormGroup>
            <FormGroup label="Referral Reference Number"><FInput placeholder="If provided" value={details["Reference No."] || ""} onChange={set("Reference No.")} /></FormGroup>
            <FormGroup label="Next Scheduled Follow-Up"><FInput type="date" value={details["Follow-up Date"] || ""} onChange={set("Follow-up Date")} /></FormGroup>
            <FormGroup label="Survivor / Family Contacted?">
              <FSelect value={details["Survivor Contacted"] || ""} onChange={set("Survivor Contacted")}>
                <option value="">— Select —</option>
                <option>Yes</option><option>No — pending</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Services Actually Provided" hint="What specific services has DSWD rendered so far?">
              <FTextarea placeholder="e.g. Counseling started, temporary shelter provided, livelihood referral…" value={details["Services Provided"] || ""} onChange={set("Services Provided")} />
            </FormGroup>
          </>
        )}

        {/* ── PNP ── */}
        {body === "PNP Women and Children Protection Desk" && (
          <>
            <div className={styles.sectionDivider}><span>PNP-WCPD Monitoring Details</span></div>
            <FormGroup label="Date of Endorsement"><FInput type="date" value={details["Date of Endorsement"] || ""} onChange={set("Date of Endorsement")} /></FormGroup>
            <FormGroup label="Station and Desk Details"><FInput placeholder="e.g. QCPD Women and Children Protection Desk" value={details["Station"] || ""} onChange={set("Station")} /></FormGroup>
            <FormGroup label="Blotter / Reference Number"><FInput placeholder="e.g. BLO-2026-042" value={details["Blotter No."] || ""} onChange={set("Blotter No.")} /></FormGroup>
            <FormGroup label="Assigned Investigator"><FInput placeholder="Name and rank" value={details["Investigator"] || ""} onChange={set("Investigator")} /></FormGroup>
            <FormGroup label="Sworn Statements Taken?">
              <FSelect value={details["Sworn Statements"] || ""} onChange={set("Sworn Statements")}>
                <option value="">— Select —</option>
                <option>Yes</option><option>No — pending</option><option>Not applicable</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Medico-Legal / Evidence Preservation Advised?">
              <FSelect value={details["Medico-Legal Advised"] || ""} onChange={set("Medico-Legal Advised")}>
                <option value="">— Select —</option>
                <option>Yes — advised and acted on</option>
                <option>Yes — advised, pending</option>
                <option>Not applicable</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Case Forwarded to Prosecutor?">
              <FSelect value={details["Forwarded to Prosecutor"] || ""} onChange={set("Forwarded to Prosecutor")}>
                <option value="">— Select —</option>
                <option>Yes — forwarded</option>
                <option>Pending</option>
                <option>Not yet — investigation ongoing</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {/* ── BSP/GSP ── */}
        {body === "BSP/GSP Mechanism" && (
          <>
            <div className={styles.sectionDivider}><span>BSP/GSP Monitoring Details</span></div>
            <FormGroup label="Date of Endorsement"><FInput type="date" value={details["Date of Endorsement"] || ""} onChange={set("Date of Endorsement")} /></FormGroup>
            <FormGroup label="Chapter / Council / Unit Involved"><FInput placeholder="e.g. Manila Council, Troop 42" value={details["Chapter/Unit"] || ""} onChange={set("Chapter/Unit")} /></FormGroup>
            <FormGroup label="Receiving Official"><FInput placeholder="Name and position" value={details["Receiving Official"] || ""} onChange={set("Receiving Official")} /></FormGroup>
            <FormGroup label="Fact-Finding Started?">
              <FSelect value={details["Fact-Finding Started"] || ""} onChange={set("Fact-Finding Started")}>
                <option value="">— Select —</option>
                <option>Yes — ongoing</option>
                <option>Yes — completed</option>
                <option>No — pending</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Interim Safety Measures in Place?">
              <FSelect value={details["Safety Measures"] || ""} onChange={set("Safety Measures")}>
                <option value="">— Select —</option>
                <option>Yes — measures in place</option>
                <option>Pending implementation</option>
                <option>None reported</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Sanctions / Inaction Noted" hint="What sanctions (if any) have been issued? Note any inaction.">
              <FTextarea placeholder="e.g. Respondent suspended pending investigation, no action noted yet…" value={details["Sanctions/Inaction"] || ""} onChange={set("Sanctions/Inaction")} />
            </FormGroup>
            <FormGroup label="Closure Report Received?">
              <FSelect value={details["Closure Report"] || ""} onChange={set("Closure Report")}>
                <option value="">— Select —</option>
                <option>Yes — received</option>
                <option>No — awaiting</option>
                <option>Not applicable</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {/* ── CODI ── */}
        {body === "School/Workplace CODI" && (
          <>
            <div className={styles.sectionDivider}><span>CODI Monitoring Details</span></div>
            <FormGroup label="Date of Endorsement"><FInput type="date" value={details["Date of Endorsement"] || ""} onChange={set("Date of Endorsement")} /></FormGroup>
            <FormGroup label="Institution Name"><FInput placeholder="Name of school, workplace, or organization" value={details["Institution"] || ""} onChange={set("Institution")} /></FormGroup>
            <FormGroup label="CODI Focal Person"><FInput placeholder="Name and designation" value={details["CODI Focal Person"] || ""} onChange={set("CODI Focal Person")} /></FormGroup>
            <FormGroup label="Complaint Receipt Confirmed?">
              <FSelect value={details["Receipt Confirmed"] || ""} onChange={set("Receipt Confirmed")}>
                <option value="">— Select —</option>
                <option>Yes — confirmed in writing</option>
                <option>Yes — verbal confirmation</option>
                <option>Pending confirmation</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Hearing / Investigation Schedule">
              <FInput placeholder="e.g. Investigation: Jan 15–Feb 15, First hearing: Feb 20" value={details["Investigation Schedule"] || ""} onChange={set("Investigation Schedule")} />
            </FormGroup>
            <FormGroup label="Status Updates from CODI">
              <FTextarea placeholder="Latest updates on investigation or hearing progress…" value={details["Status Updates"] || ""} onChange={set("Status Updates")} />
            </FormGroup>
            <FormGroup label="Anti-Retaliation Measures Confirmed?">
              <FSelect value={details["Anti-Retaliation Confirmed"] || ""} onChange={set("Anti-Retaliation Confirmed")}>
                <option value="">— Select —</option>
                <option>Yes — confirmed in place</option>
                <option>Pending verification</option>
                <option>Not confirmed — flagged for follow-up</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Confidentiality Measures Confirmed?">
              <FSelect value={details["Confidentiality Confirmed"] || ""} onChange={set("Confidentiality Confirmed")}>
                <option value="">— Select —</option>
                <option>Yes</option><option>Unclear</option><option>No — concern raised</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Final Administrative Decision">
              <FTextarea placeholder="e.g. Respondent dismissed, reprimanded, cleared, case pending…" value={details["Final Decision"] || ""} onChange={set("Final Decision")} />
            </FormGroup>
          </>
        )}

        {/* ── Court ── */}
        {body === "Court (with lawyer)" && (
          <>
            <div className={styles.sectionDivider}><span>Court Monitoring Details</span></div>
            <div className={styles.formDesc} style={{ background: "#fef9c3", borderRadius: 8, padding: "0.75rem", border: "1px solid #fde047", color: "#713f12", marginBottom: 0 }}>
              ⚖️ Court cases are handled in coordination with a lawyer. Record all details as provided by counsel.
            </div>
            <FormGroup label="Case Number and Court Branch"><FInput placeholder="e.g. Criminal Case 2026-1234, RTC Branch 42, QC" value={details["Case No."] || ""} onChange={set("Case No.")} /></FormGroup>
            <FormGroup label="Filing Date"><FInput type="date" value={details["Filing Date"] || ""} onChange={set("Filing Date")} /></FormGroup>
            <FormGroup label="Prosecutor / Counsel Details"><FInput placeholder="Name and contact of handling counsel" value={details["Counsel"] || ""} onChange={set("Counsel")} /></FormGroup>
            <FormGroup label="Upcoming Hearing Dates"><FTextarea placeholder="List all scheduled hearing dates…" value={details["Hearing Dates"] || ""} onChange={set("Hearing Dates")} /></FormGroup>
            <FormGroup label="Postponements / Changes" hint="Note any postponements with reason.">
              <FTextarea placeholder="e.g. April 10: postponed — respondent's counsel unavailable…" value={details["Postponements"] || ""} onChange={set("Postponements")} />
            </FormGroup>
            <FormGroup label="Witness Preparation Needs">
              <FTextarea placeholder="Does any witness or the complainant need preparation support?" value={details["Witness Preparation"] || ""} onChange={set("Witness Preparation")} />
            </FormGroup>
            <FormGroup label="Final Judgment / Resolution" hint="Fill in once the court issues a decision.">
              <FTextarea placeholder="e.g. Guilty — 6–12 years, Acquitted, Case dismissed without prejudice…" value={details["Judgment"] || ""} onChange={set("Judgment")} />
            </FormGroup>
          </>
        )}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={!body}>Save Endorsement</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONITORING LOG MODAL — add an update entry
// ─────────────────────────────────────────────────────────────────────────────

function MonitoringModal({ open, onClose, caseData, onSave, actorName }) {
  const [update, setUpdate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  useEffect(() => { if (open) { setUpdate(""); setDate(new Date().toISOString().split("T")[0]); } }, [open]);
  if (!caseData) return null;

  function handleSave() {
    if (!update.trim()) return;
    const entry = { date: new Date(date).toLocaleDateString(), by: actorName, update };
    onSave({ ...caseData, monitoringLog: [...(caseData.monitoringLog || []), entry] });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Monitoring Update" wide>
      <p className={styles.formDesc}>SASHA monitors whether the referral was received, whether the complainant was contacted, and whether the case is progressing. Log each follow-up here.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.id} disabled /></FormGroup>
        <FormGroup label="Current Institution"><FInput value={caseData.endorsedTo || "Not yet endorsed"} disabled /></FormGroup>
        <FormGroup label="Date of Follow-up" required><FInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormGroup>
        <FormGroup label="Update / Findings" required hint="What did SASHA find out from this follow-up? Was there progress?">
          <FTextarea placeholder="e.g. Called PNP WCPD — investigation ongoing, next update in 2 weeks. Complainant contacted, reported feeling safe…" value={update} onChange={(e) => setUpdate(e.target.value)} rows={5} />
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={!update.trim()}>Add Entry</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CHANGE MODAL — with approval flow
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  "Under Case Evaluation": ["Case Filed"],
  "Case Filed":            ["Investigation Ongoing"],
  "Investigation Ongoing": ["Hearing Ongoing", "Dismissed"],
  "Hearing Ongoing":       ["Dismissed", "Perpetrator Convicted"],
};

const STATUS_COLORS2 = STATUS_COLORS;

function StatusChangeModal({ open, onClose, caseData, onSubmit, actorName, isAdmin }) {
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) { setSelected(null); setNotes(""); } }, [open]);
  if (!caseData) return null;

  const available = isAdmin
    ? LEGAL_CASE_STATUSES.filter((s) => s !== caseData.status)
    : (STATUS_TRANSITIONS[caseData.status] || []);

  function handleSubmit() {
    if (!selected) return;
    onSubmit(caseData, selected, {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: notes || `Status changed to ${selected}.`,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Update Status — ${caseData.id}`} wide>
      <div className={styles.approvalNotice}>
        <FiClock style={{ flexShrink: 0 }} />
        <span>This change will be submitted for <strong>Admin approval</strong> before taking effect. The complainant will be informed after approval.</span>
      </div>
      <p className={styles.formDesc}>Current status: <StatusBadge status={caseData.status} /></p>
      {available.length === 0 ? (
        <p className={styles.emptyState}>No available transitions at this stage or role level.</p>
      ) : (
        <>
          <p className={styles.formDesc} style={{ marginTop: "0.5rem" }}>Select the new status:</p>
          <div className={styles.transitionGrid}>
            {available.map((s) => {
              const c = STATUS_COLORS2[s] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <button
                  key={s}
                  className={`${styles.transitionBtn} ${selected === s ? styles.transitionBtnSelected : ""}`}
                  style={{ background: c.bg, color: c.color, borderColor: c.color + "44" }}
                  onClick={() => setSelected(s)}
                >
                  {s} →
                </button>
              );
            })}
          </div>
          {selected && (
            <div className={styles.formGrid} style={{ marginTop: "1rem" }}>
              <FormGroup label="Reason / Notes" hint="Explain why the status is being changed.">
                <FTextarea placeholder="e.g. Complaint formally filed with PNP WCPD on May 10…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormGroup>
            </div>
          )}
        </>
      )}
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!selected}>Submit for Approval</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN APPROVAL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalModal({ open, onClose, caseData, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  if (!caseData || !caseData.pendingApproval) return null;
  const pa = caseData.pendingApproval;

  return (
    <Modal open={open} onClose={onClose} title="Review Pending Status Change" wide>
      <div className={styles.approvalReviewBlock}>
        {[
          ["Case ID", caseData.id],
          ["Current Status", <StatusBadge status={caseData.status} />],
          ["Proposed Status", <StatusBadge status={pa.proposedStatus} />],
          ["Submitted by", pa.submittedBy],
          ["Date", pa.date],
          ["Notes", pa.notes],
        ].map(([k, v]) => (
          <div key={k} className={styles.approvalRow}>
            <span className={styles.approvalKey}>{k}</span>
            <span className={styles.approvalVal}>{v}</span>
          </div>
        ))}
      </div>

      {showReject ? (
        <div className={styles.formGrid} style={{ marginTop: "1rem" }}>
          <FormGroup label="Reason for rejection" required>
            <FTextarea placeholder="Explain why this status change is being rejected…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </FormGroup>
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={() => setShowReject(false)}>Back</button>
            <button className={styles.btnDanger} onClick={() => { onReject(caseData, rejectReason); onClose(); }} disabled={!rejectReason.trim()}>Confirm Rejection</button>
          </div>
        </div>
      ) : (
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={styles.btnDanger} onClick={() => setShowReject(true)}>Reject</button>
          <button className={styles.btnSuccess} onClick={() => { onApprove(caseData); onClose(); }}><FiCheck size={14} /> Approve &amp; Apply</button>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN LEGAL MODAL — assign case to legal team member + send email notification
// ─────────────────────────────────────────────────────────────────────────────

function AssignLegalModal({ open, onClose, caseData, legalPersonnels = [], onSave, showToast }) {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setSelectedPersonnelId(""); setError(""); }
  }, [open]);

  if (!caseData) return null;

  async function handleAssign() {
    if (!selectedPersonnelId) { setError("Please select a legal team member."); return; }
    setSaving(true);
    setError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // Assign the case to the legal personnel
      const res = await fetch(`${API_URL}/api/legal_personnels/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          case_report_id: caseData.id,
          legal_personnel_id: selectedPersonnelId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to assign case.");
      }
      const selected = legalPersonnels.find((p) => String(p.legal_personnel_id) === String(selectedPersonnelId));
      const personnelName = selected
        ? `${selected.first_name || ""} ${selected.last_name || ""}`.trim() || selected.name || selectedPersonnelId
        : selectedPersonnelId;
      onSave({ ...caseData, assignedLegalOfficer: personnelName });
      showToast(`Case ${caseData.id || caseData.caseId} assigned to ${personnelName}. Email notification sent.`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign to Legal Team Member" wide>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.caseId || caseData.id} disabled /></FormGroup>
        <FormGroup label="Legal Team Member" required error={error}>
          <FSelect
            value={selectedPersonnelId}
            onChange={(e) => { setSelectedPersonnelId(e.target.value); setError(""); }}
            error={error}
          >
            <option value="">— Select Legal Team Member —</option>
            {legalPersonnels.length > 0 ? (
              legalPersonnels.map((p) => {
                const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.name || `Personnel #${p.legal_personnel_id}`;
                return (
                  <option key={p.legal_personnel_id} value={p.legal_personnel_id}>
                    {name}{p.role ? ` — ${p.role}` : ""}
                  </option>
                );
              })
            ) : (
              <option disabled>No legal personnel found</option>
            )}
          </FSelect>
        </FormGroup>
      </div>
      <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
        The assigned legal team member will receive an email notification about this case.
      </p>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleAssign} disabled={saving || legalPersonnels.length === 0}>
          {saving ? "Assigning…" : "Assign & Notify"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECT CASE MODAL (for action cards)
// ─────────────────────────────────────────────────────────────────────────────

function SelectCaseModal({ open, onClose, cases, title, actionLabel, onAction, filterFn }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const base = filterFn ? cases.filter(filterFn) : cases;
    if (!q.trim()) return base;
    return base.filter((c) => c.id.includes(q) || c.region.toLowerCase().includes(q.toLowerCase()));
  }, [cases, q, filterFn]);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} placeholder="Search cases…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Case ID</th><th>Region</th><th>Status</th><th>Officer</th><th>Action</th></tr></thead>
          <tbody>
            {list.length === 0
              ? <tr><td colSpan={5} className={styles.emptyState}>No cases found.</td></tr>
              : list.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.region}</td>
                  <td><StatusBadge status={c.status} />{c.pendingApproval && <span style={{ marginLeft: 4 }}><PendingBadge /></span>}</td>
                  <td>{c.assignedLegalOfficer || "—"}</td>
                  <td><button className={styles.tblBtnEdit} onClick={() => { onAction(c); onClose(); }}>{actionLabel}</button></td>
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

// ─────────────────────────────────────────────────────────────────────────────
// COOKIES
// ─────────────────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LegalReviewManagement() {
  const router = useRouter();
  const [user, setUser] = useState({ role: "", firstName: "", lastName: "" });

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const stored = JSON.parse(userCookie);
        setUser({ role: stored.role_name, firstName: stored.first_name, lastName: stored.last_name });
      } catch (_) {}
    }
  }, []);

  const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Legal Personnel";
  const isAdmin   = user.role?.toLowerCase() === "admin";
  const isLegal   = user.role?.toLowerCase() === "legal personnel" || user.role?.toLowerCase() === "legal_personnel";

  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  // Legal personnels fetched from backend (for assign dropdown + filter)
  const [legalPersonnels, setLegalPersonnels] = useState([]);

  // Fetch verified-true cases from Case Management API
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/all`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to fetch cases: ${res.status}`);
        const { data } = await res.json();

        // Only cases that are Verified - True are passed to Legal Review
        const mapped = data
          .filter((r) => STATUS_STEP[r.case_status_id] === VERIFIED_TRUE_STATUS ||
            // also include cases already in legal review pipeline
            ["Under Case Evaluation","Case Filed","Investigation Ongoing","Hearing Ongoing","Dismissed","Perpetrator Convicted"]
              .includes(STATUS_STEP[r.case_status_id])
          )
          .map((r) => {
            const year = new Date(r.created_at).getFullYear();
            return {
              id:                    r.case_report_id,
              caseId:                `${year}-` + String(r.case_report_id).padStart(3, "0"),
              reporterId:            String(r.complainant_id),
              region:                r.incident_province || r.incident_city || "—",
              city:                  r.incident_city || "—",
              status:                STATUS_STEP[r.case_status_id] || "Verified - True",
              assignedOfficer:       r.assigned_officer || null,
              assignedLegalOfficer:  r.assigned_legal_officer || null,
              assignedParalegal:     r.assigned_paralegal || null,
              dateReported:          r.created_at,
              caseType:              r.case_type || null,
              pendingApproval:       null,
              endorsedTo:            null,
              endorsementDetails:    null,
              paralegalRecord:       null,
              lawyerRecord:          null,
              monitoringLog:         [],
              statusHistory: [{
                status: STATUS_STEP[r.case_status_id] || "Verified - True",
                date:   new Date(r.created_at).toLocaleDateString("en-PH"),
                by:     r.assigned_officer || "System",
                notes:  "Case passed to Legal Review.",
              }],
            };
          });
        setCases(mapped);
      } catch (err) {
        console.error("[LegalReview] fetch error:", err);
      } finally {
        setCasesLoading(false);
      }
    };
    fetchCases();
  }, []);

  // Fetch legal personnels for filters and assign dropdown
  useEffect(() => {
    const fetchPersonnels = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/legal_personnels`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setLegalPersonnels(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("[LegalReview] failed to fetch legal personnels:", err);
      }
    };
    fetchPersonnels();
  }, []); 
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    assignedLegalOfficer: "",
    caseType: "",
    dateReported: "",
    endorsedTo: "",
    city: "",
  });
  const [sortField, setSortField] = useState("dateReported");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  function showToast(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }
  function closeModal() { setModal(null); }
  function open(c, m) { setSelectedCase(c); setModal(m); }

  function saveCase(updated) {
    setCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    showToast(`Case ${updated.id} updated.`);
  }

  function submitForApproval(caseData, proposedStatus, changeDetails) {
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? { ...c, pendingApproval: { proposedStatus, ...changeDetails } }
      : c
    ));
    showToast(`Status change for ${caseData.id} submitted for admin approval.`);
  }

  function approveChange(caseData) {
    const pa = caseData.pendingApproval;
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? { ...c, status: pa.proposedStatus, pendingApproval: null, statusHistory: [...(c.statusHistory || []), { status: pa.proposedStatus, date: pa.date, by: pa.submittedBy, notes: pa.notes }] }
      : c
    ));
    showToast(`Case ${caseData.id} status updated to "${pa.proposedStatus}".`);
  }

  function rejectChange(caseData, reason) {
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? { ...c, pendingApproval: null, statusHistory: [...(c.statusHistory || []), { status: c.status, date: new Date().toLocaleDateString(), by: "Admin", notes: `Status change REJECTED: ${reason}` }] }
      : c
    ));
    showToast(`Status change for ${caseData.id} rejected.`, "danger");
  }

  const stats = useMemo(() => {
    const pending = cases.filter((c) => c.pendingApproval).length;
    return [
      { num: cases.filter((c) => c.status === "Under Case Evaluation").length, label: "Under Evaluation" },
      { num: cases.filter((c) => ["Case Filed", "Investigation Ongoing", "Hearing Ongoing"].includes(c.status)).length, label: "Active Cases" },
      { num: cases.filter((c) => c.endorsedTo).length, label: "Endorsed Cases" },
      ...(isAdmin ? [{ num: pending, label: "Pending Approvals", highlight: pending > 0 }] : []),
    ];
  }, [cases, isAdmin]);

  const filtered = useMemo(() =>
    cases.filter((c) => {
      const ms = !search.trim() || String(c.id).includes(search) || c.caseId?.includes(search) || (c.region || "").toLowerCase().includes(search.toLowerCase());
      let mf = true;
      if (activeFilters.status && activeFilters.status !== "" && activeFilters.status !== "All") {
        mf = mf && c.status === activeFilters.status;
      }
      if (activeFilters.assignedLegalOfficer && activeFilters.assignedLegalOfficer !== "" && activeFilters.assignedLegalOfficer !== "All") {
        mf = mf && (c.assignedLegalOfficer || "").toLowerCase().includes(activeFilters.assignedLegalOfficer.toLowerCase());
      }
      if (activeFilters.caseType && activeFilters.caseType !== "" && activeFilters.caseType !== "All") {
        mf = mf && (c.caseType || "") === activeFilters.caseType;
      }
      if (activeFilters.dateReported && activeFilters.dateReported !== "") {
        const getDateRangeFromFilter = (filterValue) => {
          if (!filterValue) return null;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          let startDate, endDate;
          switch (filterValue) {
            case "today":      startDate = new Date(today); endDate = new Date(today); endDate.setDate(endDate.getDate() + 1); break;
            case "thisWeek":   startDate = new Date(today); startDate.setDate(startDate.getDate() - today.getDay()); endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 7); break;
            case "thisMonth":  startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); break;
            case "thisYear":   startDate = new Date(today.getFullYear(), 0, 1); endDate = new Date(today.getFullYear() + 1, 0, 1); break;
            case "last30Days": endDate = new Date(today); endDate.setDate(endDate.getDate() + 1); startDate = new Date(today); startDate.setDate(startDate.getDate() - 30); break;
            default:
              if (filterValue.startsWith("custom|")) {
                const parts = filterValue.split("|");
                if (parts.length === 3) { startDate = new Date(parts[1] + "T00:00:00"); endDate = new Date(parts[2] + "T23:59:59"); }
              }
          }
          return startDate && endDate ? { startDate, endDate } : null;
        };
        const range = getDateRangeFromFilter(activeFilters.dateReported);
        if (range) {
          const d = c.dateReported ? new Date(c.dateReported) : null;
          mf = mf && !!d && d >= range.startDate && d <= range.endDate;
        }
      }
      if (activeFilters.endorsedTo && activeFilters.endorsedTo !== "" && activeFilters.endorsedTo !== "All") {
        mf = mf && (c.endorsedTo || "") === activeFilters.endorsedTo;
      }
      if (activeFilters.city && activeFilters.city !== "" && activeFilters.city !== "All") {
        mf = mf && (c.city || c.region || "").toLowerCase().includes(activeFilters.city.toLowerCase());
      }
      return ms && mf;
    }),
    [cases, search, activeFilters]
  );
  useEffect(() => setPage(1), [search, activeFilters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pendingCases = useMemo(() => cases.filter((c) => c.pendingApproval), [cases]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type || "success"}`]}`}>{toast.msg}</div>}

      <main className={styles.pageWrapper}>
        {/* Hero */}
        <section className={styles.heroBanner}>
          <div className="container-xl">
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Legal Review</h1>
              <div className="row g-3 justify-content-center">
                {stats.map(({ num, label, highlight }) => (
                  <div key={label} className="col-12 col-md-3">
                    <div className={`${styles.statCard} ${highlight ? styles.statCardHighlight : ""}`}>
                      {/* <span className={styles.statDot} /> */}
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
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="LegalIconParalegal.png" alt="" className={styles.actionIconImg} />} title="Paralegal Support" description="Organize case facts, timelines, evidence, sworn statements, and referral documents for a case." onView={() => setModal("selectParalegal")} />
            </div>
            {/* <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="LegalIconLawyer.png" alt="" className={styles.actionIconImg} />} title="Lawyer Consultation" description="Record legal assessment: applicable laws, possible actions (criminal/civil/admin), and evidence gaps." onView={() => setModal("selectLawyer")} />
            </div> */}
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="LegalIconEndorse.png" alt="" className={styles.actionIconImg} />} title="Endorse / Track Referrals" description="Endorse a case to DSWD, PNP, BSP/GSP, CODI, or Court — with full institution-specific monitoring." onView={() => setModal("selectEndorse")} />
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="LegalIconUpdate.png" alt="" className={styles.actionIconImg} />} title="Update Case Status" description="Advance a case through Case Filed → Investigation → Hearing → Dismissed / Convicted. Requires admin approval." onView={() => setModal("selectStatus")} />
            </div>
            {(isAdmin || isLegal) && (
              <div className="col-12 col-sm-6 col-lg-4">
                <ActionCard icon={<img src="LegalIconAssign.png" alt="" className={styles.actionIconImg} />} title="Assign Legal Personnel" description="Assign a legal officer and paralegal to a case for support and tracking." onView={() => setModal("selectAssign")} />
              </div>
            )}
            {isAdmin && (
              <div className="col-12 col-sm-6 col-lg-4">
                <ActionCard
                  icon={<img src="LegalIconApprove.png" alt="" className={styles.actionIconImg} />}
                  title="Approve Status Changes"
                  description="Review and approve or reject pending status change requests."
                  badge={pendingCases.length > 0 ? <span className={styles.pendingCount}>{pendingCases.length} pending</span> : null}
                  onView={() => setModal("viewPending")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All Legal Cases</h2>
              <div className={styles.headingLine} />
            </div>

            {/* Search + Filter bar */}
            <div className={styles.tableTopBar}>
              <div className={styles.searchWrap} style={{ flex: 1 }}>
                <input className={styles.searchInput} placeholder="Search Case ID, region…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <span className={styles.searchIcon}><FiSearch /></span>
              </div>
              <FilterMenu
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
              />
            </div>

            <LegalTable
              paginated={paginated}
              page={page}
              totalPages={totalPages}
              totalRecords={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onRowDoubleClick={(c) => router.push(`/legal-review/view?caseId=${c.id}&from=legal-review`)}
              onParalegal={(cases) => { setSelectedCase(cases[0]); setModal("paralegal"); }}
              onEndorse={(cases) => { setSelectedCase(cases[0]); setModal("endorse"); }}
              onMonitor={(cases) => { setSelectedCase(cases[0]); setModal("monitor"); }}
              onStatus={(cases) => { setSelectedCase(cases[0]); setModal("statusChange"); }}
              onAssignLegal={(cases) => { setSelectedCase(cases[0]); setModal("assignLegal"); }}
              isAdmin={isAdmin}
              sortField={sortField}
              sortDir={sortDir}
              onSort={(field) => {
                if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
                else { setSortField(field); setSortDir("asc"); }
              }}
              activeFilters={activeFilters}
            />
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}
      <AssignPersonnelModal open={modal === "assign"}       onClose={closeModal} caseData={selectedCase} onSave={saveCase} />
      <ParalegalSupportModal open={modal === "paralegal"}   onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      {/* <LawyerConsultModal   open={modal === "lawyer"}       onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} /> */}
      <EndorseModal         open={modal === "endorse"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <MonitoringModal      open={modal === "monitor"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <StatusChangeModal    open={modal === "statusChange"} onClose={closeModal} caseData={selectedCase} onSubmit={submitForApproval} actorName={actorName} isAdmin={isAdmin} />
      <ApprovalModal        open={modal === "approval"}     onClose={closeModal} caseData={selectedCase} onApprove={approveChange} onReject={rejectChange} />
      <AssignLegalModal     open={modal === "assignLegal"}  onClose={closeModal} caseData={selectedCase} legalPersonnels={legalPersonnels} onSave={saveCase} showToast={showToast} />

      {/* Action card → select case → action */}
      <SelectCaseModal open={modal === "selectParalegal"} onClose={closeModal} cases={cases} title="Select Case for Paralegal Support" actionLabel="Paralegal" onAction={(c) => open(c, "paralegal")} />
      {/* <SelectCaseModal open={modal === "selectLawyer"}    onClose={closeModal} cases={cases} title="Select Case for Lawyer Consultation" actionLabel="Consult" onAction={(c) => open(c, "lawyer")} /> */}
      <SelectCaseModal open={modal === "selectEndorse"}   onClose={closeModal} cases={cases} title="Select Case to Endorse / Track Referral" actionLabel="Endorse" onAction={(c) => open(c, "endorse")} />
      <SelectCaseModal open={modal === "selectMonitor"}   onClose={closeModal} cases={cases.filter((c) => c.endorsedTo)} title="Select Case for Monitoring Update" actionLabel="Monitor" onAction={(c) => open(c, "monitor")} />
      <SelectCaseModal open={modal === "selectStatus"}    onClose={closeModal} cases={cases.filter((c) => !c.pendingApproval && (STATUS_TRANSITIONS[c.status]?.length > 0 || isAdmin))} title="Select Case to Update Status" actionLabel="Update" onAction={(c) => open(c, "statusChange")} />
      <SelectCaseModal open={modal === "selectAssign"}    onClose={closeModal} cases={cases} title="Select Case to Assign Legal Personnel" actionLabel="Assign" onAction={(c) => open(c, "assign")} />

      {/* Admin: pending approvals */}
      {modal === "viewPending" && (
        <Modal open onClose={closeModal} title="Pending Status Approvals" wide>
          {pendingCases.length === 0 ? (
            <p className={styles.emptyState}>No pending status changes.</p>
          ) : (
            <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
              <table className={styles.table}>
                <thead><tr><th>Case ID</th><th>Current</th><th>Proposed</th><th>By</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingCases.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td><StatusBadge status={c.pendingApproval.proposedStatus} /></td>
                      <td>{c.pendingApproval.submittedBy}</td>
                      <td>{c.pendingApproval.date}</td>
                      <td><button className={styles.tblBtnApprove} onClick={() => { setSelectedCase(c); setModal("approval"); }}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.modalFooter}>
            <button className={styles.btnPrimary} onClick={closeModal}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}