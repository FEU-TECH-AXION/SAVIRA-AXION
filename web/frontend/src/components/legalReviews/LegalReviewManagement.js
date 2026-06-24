"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./LegalReviewManagement.module.css";
import { FiSearch, FiClock, FiCheck, FiChevronDown, FiChevronUp, FiCalendar } from "react-icons/fi";
import LegalTable from "./LegalTable";
import FilterMenu from "./FilterMenu";
import UpdateStatusModal from "../cases/UpdateStatusModals";
import Tooltip from "../ui/Tooltip";
import { ConfirmDialog } from "../ui/Dialog";
import { getLegalCaseDeadlines, normalizeLegalList } from "./legalReviewCalendar";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import {
  Modal,
  FormGroup,
  FInput,
  FTextarea,
  FSelect,
  ParalegalSupportModal,
  EndorseModal,
  MonitoringModal,
} from "./LegalReviewModals";

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
  "Resolved",
];

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
function assignedPeople(caseData, role) {
  return (caseData?.assignedLegal || []).filter((person) => person.assignment_role === role);
}

function assignedNames(caseData, role) {
  return assignedPeople(caseData, role).map((person) => person.name).filter(Boolean).join(", ") || "Unassigned";
}

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
        <Tooltip text={`Open ${title}`}>
          <button className={styles.viewBtn} onClick={onView}>Open →</button>
        </Tooltip>
      </div>
    </div>
  );
}

function CaseCalendarModal({ open, onClose, cases, onFullView }) {
  const deadlines = useMemo(() => cases.flatMap(getLegalCaseDeadlines), [cases]);
  const today = new Date(new Date().toDateString());
  return (
    <Modal open={open} onClose={onClose} title="Case Calendar" wide>
      <p className={styles.formDesc}>Upcoming and overdue hearing, investigation, and referral follow-up dates.</p>
      {deadlines.length === 0 ? <p className={styles.emptyState}>No structured deadlines have been recorded for these cases yet.</p> : (
        <div className={styles.historyList}>
          {deadlines.map((deadline, index) => {
            const date = deadline.date;
            const dayDelta = Math.ceil((date - today) / 86400000);
            return (
              <div key={`${deadline.caseId}-${deadline.label}-${deadline.value}-${index}`} className={styles.historyItem}>
                <div className={styles.historyDot} />
                <div className={styles.historyContent}>
                  <strong>{deadline.caseId} · {deadline.label}</strong>
                  <span className={styles.historyMeta}>{date.toLocaleDateString("en-PH")} · {dayDelta < 0 ? `${Math.abs(dayDelta)} day(s) overdue` : dayDelta === 0 ? "Today" : `in ${dayDelta} day(s)`}</span>
                  <span className={styles.historyNotes}>{deadline.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Close</button>
        <button className={styles.btnPrimary} onClick={onFullView}>Open Full Calendar</button>
      </div>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// VIEW CASE MODAL — full detail
// ─────────────────────────────────────────────────────────────────────────────

function ViewCaseModal({ open, onClose, caseData }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  if (!caseData) return null;
  const deadlineCandidates = [
    { label: "Referral follow-up", value: caseData.endorsementDetails?.["Follow-up Date"] },
    ...(caseData.statusHistory || []).map((entry) => ({
      label: "Next hearing",
      value: entry.formData?.nextHearingDate || entry.form_data?.nextHearingDate,
    })),
  ].filter((item) => item.value && !Number.isNaN(new Date(item.value).getTime()));
  const nextDeadline = deadlineCandidates
    .filter((item) => new Date(item.value) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.value) - new Date(b.value))[0];

  return (
    <Modal open={open} onClose={onClose} title={`Legal Case — ${caseData.id}`} wide>
      <div className={styles.viewGrid}>
        {[
          ["Case ID",              caseData.id],
          ["Reporter ID",          caseData.reporterId],
          ["Region",               caseData.region],
          ["Status",               <StatusBadge status={caseData.status} />],
          ["Lawyer(s)",            assignedNames(caseData, "lawyer")],
          ["Paralegal(s)",         assignedNames(caseData, "paralegal")],
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

      {nextDeadline && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>Next Deadline</h4>
          <div className={styles.viewRow}>
            <span className={styles.viewKey}>{nextDeadline.label}</span>
            <span className={styles.viewVal}>{new Date(nextDeadline.value).toLocaleDateString("en-PH")}</span>
          </div>
        </div>
      )}

      {/* Endorsement Details */}
      {caseData.endorsementDetails && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>Endorsement / Filing Details</h4>
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
          <h4 className={styles.detailTitle}>Paralegal Support Record</h4>
          <div className={styles.viewRow}><span className={styles.viewKey}>Organized by</span><span className={styles.viewVal}>{caseData.paralegalRecord.organizedBy}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Date</span><span className={styles.viewVal}>{caseData.paralegalRecord.date}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Documents</span><span className={styles.viewVal}>{caseData.paralegalRecord.documents}</span></div>
        </div>
      )}

      {/* Lawyer Record */}
      {caseData.lawyerRecord && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>Lawyer Consultation Record</h4>
          <div className={styles.viewRow}><span className={styles.viewKey}>Assessed by</span><span className={styles.viewVal}>{caseData.lawyerRecord.assessedBy}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Date</span><span className={styles.viewVal}>{caseData.lawyerRecord.date}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Recommendation</span><span className={styles.viewVal}>{caseData.lawyerRecord.recommendation}</span></div>
        </div>
      )}

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

// ─────────────────────────────────────────────────────────────────────────────
// PARALEGAL SUPPORT MODAL — organize case facts and documents
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// LAWYER CONSULTATION MODAL
// ─────────────────────────────────────────────────────────────────────────────


function LawyerConsultModal({ open, onClose, caseData, onSave, actorName }) {
  const [form, setForm] = useState({
    consultationType: "Initial",
    consultationDate: new Date().toISOString().split("T")[0],
    engagementStatus: "Advisory input only",
    applicableLaws: [],
    actionType: [],
    evidenceGaps: "",
    recommendation: "",
    additionalNotes: "",
  });
  const laws = ["RA 11313 (Safe Spaces Act)", "RA 9262 (VAWC)", "RA 7877 (Anti-Sexual Harassment Act)", "RA 9995 (Anti-Photo and Video Voyeurism Act)", "RA 10175 (Cybercrime Prevention Act)", "RA 11930 (Anti-OSAEC and Anti-CSAEM Act)", "Revised Penal Code — Rape provisions", "RA 9208 (Anti-Trafficking in Persons Act)", "Administrative / institutional rules"];
  const actions = ["Administrative action", "Civil action", "Criminal action"];
  const automaticGaps = Object.entries(caseData?.paralegalRecord?.evidenceItems || {})
    .filter(([, item]) => item.status !== "Obtained")
    .map(([label, item]) => `${label}: ${item.status}`)
    .join("\n");

  useEffect(() => {
    if (!open || !caseData) return;
    const record = caseData.lawyerRecord || {};
    setForm({
      consultationType: "Follow-up",
      consultationDate: new Date().toISOString().split("T")[0],
      engagementStatus: record.engagementStatus || "Advisory input only",
      applicableLaws: record.applicableLaws || [],
      actionType: record.actionType || [],
      evidenceGaps: record.evidenceGaps || automaticGaps,
      recommendation: record.recommendation || "",
      additionalNotes: record.additionalNotes || "",
    });
  }, [open, caseData, automaticGaps]);

  if (!caseData) return null;
  const toggle = (key, value) => setForm((previous) => ({
    ...previous,
    [key]: previous[key].includes(value) ? previous[key].filter((item) => item !== value) : [...previous[key], value],
  }));

  async function handleSave() {
    const consultation = {
      assessedBy: actorName,
      date: form.consultationDate,
      consultationType: form.consultationType,
      engagementStatus: form.engagementStatus,
      applicableLaws: form.applicableLaws,
      actionType: form.actionType,
      evidenceGaps: form.evidenceGaps,
      recommendation: form.recommendation,
      additionalNotes: form.additionalNotes,
      savedAt: new Date().toISOString(),
    };
    await onSave({
      ...caseData,
      lawyerRecord: {
        ...consultation,
        consultations: [...(caseData.lawyerRecord?.consultations || []), consultation],
      },
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Lawyer Consultation — Legal Assessment" wide>
      {caseData.paralegalRecord?.readyForLawyerReview && <p className={styles.approvalNotice}>The paralegal marked this file ready for lawyer review.</p>}
      <div className={styles.formGrid}>
        <FormGroup label="Consultation type"><FSelect value={form.consultationType} onChange={(event) => setForm((previous) => ({ ...previous, consultationType: event.target.value }))}><option>Initial</option><option>Follow-up</option></FSelect></FormGroup>
        <FormGroup label="Consultation date"><FInput type="date" value={form.consultationDate} onChange={(event) => setForm((previous) => ({ ...previous, consultationDate: event.target.value }))} /></FormGroup>
        <FormGroup label="Engagement status"><FSelect value={form.engagementStatus} onChange={(event) => setForm((previous) => ({ ...previous, engagementStatus: event.target.value }))}><option>Advisory input only</option><option>Counsel of record</option></FSelect></FormGroup>
        <FormGroup label="Applicable laws / provisions"><div className={styles.checkGroup}>{laws.map((law) => <label key={law} className={styles.checkLabel}><input type="checkbox" className={styles.checkInput} checked={form.applicableLaws.includes(law)} onChange={() => toggle("applicableLaws", law)} />{law}</label>)}</div></FormGroup>
        <FormGroup label="Possible courses of action"><div className={styles.checkGroup}>{actions.map((action) => <label key={action} className={styles.checkLabel}><input type="checkbox" className={styles.checkInput} checked={form.actionType.includes(action)} onChange={() => toggle("actionType", action)} />{action}</label>)}</div></FormGroup>
        <FormGroup label="Evidence gaps identified" hint="Pre-filled from evidence items that are not yet obtained."><FTextarea value={form.evidenceGaps} onChange={(event) => setForm((previous) => ({ ...previous, evidenceGaps: event.target.value }))} /></FormGroup>
        <FormGroup label="Legal recommendation" required><FTextarea value={form.recommendation} onChange={(event) => setForm((previous) => ({ ...previous, recommendation: event.target.value }))} /></FormGroup>
        <FormGroup label="Additional notes"><FTextarea value={form.additionalNotes} onChange={(event) => setForm((previous) => ({ ...previous, additionalNotes: event.target.value }))} /></FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={!form.recommendation.trim()}>Save Consultation</button>
      </div>
    </Modal>
  );
}

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


// ─────────────────────────────────────────────────────────────────────────────
// MONITORING LOG MODAL — add an update entry
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// STATUS CHANGE MODAL — with approval flow
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  "Verified - True":       ["Under Case Evaluation"],
  "Under Case Evaluation": ["Case Filed", "Dismissed"],
  "Case Filed":            ["Investigation Ongoing"],
  "Investigation Ongoing": ["Hearing Ongoing", "Dismissed"],
  "Hearing Ongoing":       ["Dismissed", "Perpetrator Convicted"],
  "Perpetrator Convicted": ["Resolved"],
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
  const [saving, setSaving] = useState(false);
  if (!caseData || !caseData.pendingApproval) return null;
  const pa = caseData.pendingApproval;

  async function approve() {
    setSaving(true);
    try {
      await onApprove(caseData);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    setSaving(true);
    try {
      await onReject(caseData, rejectReason);
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
            <button className={styles.btnSecondary} onClick={() => setShowReject(false)} disabled={saving}>Back</button>
            <button className={styles.btnDanger} onClick={reject} disabled={!rejectReason.trim() || saving}>{saving ? "Saving…" : "Confirm Rejection"}</button>
          </div>
        </div>
      ) : (
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.btnDanger} onClick={() => setShowReject(true)} disabled={saving}>Reject</button>
          <button className={styles.btnSuccess} onClick={approve} disabled={saving}><FiCheck size={14} /> {saving ? "Applying…" : "Approve & Apply"}</button>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN LEGAL MODAL — assign case to legal team member + send email notification
// ─────────────────────────────────────────────────────────────────────────────

function AssignLegalModal({ open, onClose, caseData, legalPersonnels = [], onSave, showToast }) {
  const [search,      setSearch]      = useState("");
  const [assigned,    setAssigned]    = useState([]); // { legal_personnel_id, first_name, last_name, legal_personnel_type }
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [duplicateDialog, setDuplicateDialog] = useState(null);
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch("");
      setAssigned([]);
      setError("");
      setDuplicateDialog(null);
      setRemovalTarget(null);
    }
  }, [open]);

  if (!caseData) return null;

  // Filter out already-assigned people from the search results
  const assignedIds = assigned.map(p => String(p.legal_personnel_id));
  const currentlyAssignedIds = new Set(
    (caseData.assignedLegal || [])
      .map((person) => person.legal_personnel_id)
      .filter(Boolean)
      .map(String)
  );
  const availableLegalPersonnels = legalPersonnels.filter(
    (person) =>
      !currentlyAssignedIds.has(String(person.legal_personnel_id)) &&
      !["On Leave", "Out of Office"].includes(person.availability_status)
  );
  const noAvailableLegalPersonnel = availableLegalPersonnels.length === 0;

  const searchResults = availableLegalPersonnels.filter(p => {
  const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
  const type     = (p.legal_personnel_type || "").toLowerCase();
  const query    = search.toLowerCase();
  const notYetAdded = !assignedIds.includes(String(p.legal_personnel_id));
  // If no search query, show everyone not yet added
  if (!search.trim()) return notYetAdded;
  return notYetAdded && (fullName.includes(query) || type.includes(query));
});

  function addPerson(person) {
    setAssigned(prev => [...prev, person]);
    setSearch("");
    setError("");
  }

  function removePerson(id) {
    setAssigned(prev => prev.filter(p => String(p.legal_personnel_id) !== String(id)));
  }

  async function confirmRemoval() {
    if (!removalTarget) return;
    setRemoving(true);
    setError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(
        `${API_URL}/api/legal_case_assignments/${caseData.id}/${removalTarget.legal_personnel_id}`,
        { method: "DELETE", credentials: "include" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to remove legal personnel.");

      onSave({
        ...caseData,
        assignedLegal: (caseData.assignedLegal || []).filter(
          (person) => String(person.legal_personnel_id) !== String(removalTarget.legal_personnel_id)
        ),
      });
      showToast(body.message || "Legal personnel removed.");
      setRemovalTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  async function handleAssign() {
      if (assigned.length === 0) {
          setError("Please select at least one legal team member.");
          return;
      }
      setSaving(true);
      setError("");

      try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
          const res = await fetch(`${API_URL}/api/legal_case_assignments/assign-bulk`, {
              method:      "POST",
              headers:     { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                  case_report_id:      caseData.id,
                  legal_personnel_ids: assigned.map(p => p.legal_personnel_id),
              }),
          });

          const body = await res.json().catch(() => ({}));

          if (!res.ok) {
              throw new Error(body.error || "Failed to assign.");
          }

          // Show partial failure message if some failed
          if (body.failed?.length > 0) {
              const failMsgs = body.failed
                  .map(f => `Personnel #${f.legal_personnel_id}: ${f.reason}`)
                  .join(" · ");
              setError(`Some assignments failed — ${failMsgs}`);
              const duplicateFailures = body.failed.filter((failure) =>
                  String(failure.reason || "").toLowerCase().includes("already")
              );
              if (duplicateFailures.length > 0) {
                  setDuplicateDialog({
                      count: duplicateFailures.length,
                      detail: duplicateFailures
                          .map((failure) => `Personnel #${failure.legal_personnel_id}`)
                          .join(", "),
                  });
              }
          }

          // Update local state with whoever was successfully assigned
          if (body.data?.length > 0) {
              const newlyAssigned = body.data.map(p => ({
                  legal_personnel_id: p.legal_personnel_id,
                  assignment_role: p.assignment_role === "legal_officer" ? "lawyer" : p.assignment_role,
                  name: p.name,
              }));
              onSave({
                  ...caseData,
                  assignedLegal: [
                      ...(caseData.assignedLegal || []),
                      ...newlyAssigned,
                  ],
              });
              showToast(`Assigned: ${body.data.map(p => p.name).join(", ")}.`);
          }

          if (!body.failed?.length) onClose();

      } catch (err) {
          setError(err.message);
      } finally {
          setSaving(false);
      }
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Assign Legal Team" wide>
      <div className={styles.formGrid}>

        {/* Case ID */}
        <FormGroup label="Case ID">
          <FInput value={caseData.caseId || caseData.id} disabled />
        </FormGroup>

        {/* Chip display — who will be assigned */}
        <FormGroup label="Currently Assigned">
          <div style={{
            background: "#f9fafb",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            padding: "0.5rem 0.75rem",
            minHeight: "2.25rem",
          }}>
            {(caseData.assignedLegal || []).length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No legal personnel currently assigned.
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {(caseData.assignedLegal || []).map((person) => (
                  <span
                    key={person.legal_personnel_id || `${person.assignment_role}-${person.name}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.6rem",
                      borderRadius: 999,
                      background: "#d1fae5",
                      color: "#065f46",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    ✓ {person.name || `Personnel #${person.legal_personnel_id}`}
                    <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>
                      {person.assignment_role === "lawyer" ? "Lawyer" : "Paralegal"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemovalTarget(person)}
                      title={`Remove ${person.name || "legal personnel"}`}
                      style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </FormGroup>

        <FormGroup label="Selected Personnel">
          <div style={{
            display:      "flex",
            flexWrap:     "wrap",
            gap:          "0.4rem",
            minHeight:    "2.25rem",
            padding:      "0.5rem",
            borderRadius: 8,
            border:       "1px solid #e5e7eb",
            background:   "#f9fafb",
          }}>
            {assigned.length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "#9ca3af", alignSelf: "center" }}>
                No one selected yet — search below to add.
              </span>
            ) : (
              assigned.map(p => (
                <span
                  key={p.legal_personnel_id}
                  style={{
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          "0.35rem",
                    padding:      "0.25rem 0.6rem",
                    borderRadius: 999,
                    background:   "#ede9fe",
                    color:        "#5b21b6",
                    fontSize:     "0.8rem",
                    fontWeight:   600,
                  }}
                >
                  {`${p.first_name} ${p.last_name}`.trim()}
                  <span style={{ fontSize: "0.7rem", color: "#7c3aed", opacity: 0.7 }}>
                    {p.legal_personnel_type}
                  </span>
                  <button
                    onClick={() => removePerson(p.legal_personnel_id)}
                    style={{
                      background: "none",
                      border:     "none",
                      cursor:     "pointer",
                      color:      "#7c3aed",
                      padding:    0,
                      lineHeight: 1,
                      fontSize:   "0.85rem",
                      marginLeft: "0.1rem",
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </FormGroup>

        {/* Search input */}
        <FormGroup
          label="Search Personnel"
          hint="Browse the list or type to filter by name or role."
        >
          <div style={{ position: "relative" }}>
            <FInput
              placeholder={legalPersonnels.length === 0
                ? "No legal personnel are available."
                : noAvailableLegalPersonnel
                ? "All legal personnel are already assigned."
                : "e.g. Ryan, paralegal…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              disabled={noAvailableLegalPersonnel}
            />

            {/* Dropdown results */}
            {searchResults.length > 0 && (
              <div style={{
                position:     "absolute",
                top:          "calc(100% + 4px)",
                left:         0,
                right:        0,
                background:   "#fff",
                border:       "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
                zIndex:       100,
                maxHeight:    "200px",
                overflowY:    "auto",
              }}>
                {searchResults.map(p => (
                  <button
                    key={p.legal_personnel_id}
                    onClick={() => addPerson(p)}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "space-between",
                      width:          "100%",
                      padding:        "0.6rem 0.85rem",
                      background:     "none",
                      border:         "none",
                      borderBottom:   "1px solid #f3f4f6",
                      color:          "#292929",
                      cursor:         "pointer",
                      textAlign:      "left",
                      fontSize:       "0.875rem",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ fontWeight: 500 }}>
                      {`${p.first_name} ${p.last_name}`.trim()}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{p.legal_personnel_type}</span>
                      <AvailabilityBadge
                        compact
                        status={p.availability_status}
                        currentLoad={p.active_legal_assignments}
                        maxLoad={p.max_legal_assignments}
                        loadLabel="legal assignments"
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results state */}
            {search.trim().length > 0 && searchResults.length === 0 && (
              <div style={{
                position:     "absolute",
                top:          "calc(100% + 4px)",
                left:         0,
                right:        0,
                background:   "#fff",
                border:       "1px solid #e5e7eb",
                borderRadius: 8,
                padding:      "0.75rem",
                fontSize:     "0.8rem",
                color:        "#9ca3af",
                zIndex:       100,
              }}>
                No personnel found matching "{search}".
              </div>
            )}
            {legalPersonnels.length > 0 && noAvailableLegalPersonnel && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#6b7280" }}>
                No additional legal personnel can be assigned to this case.
              </div>
            )}
          </div>
        </FormGroup>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}>{error}</p>
        )}
      </div>

      <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
        The same person cannot be assigned to the same case twice simultaneously.
      </p>

      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className={styles.btnPrimary}
          onClick={handleAssign}
          disabled={saving || assigned.length === 0}
        >
          {saving
            ? `Assigning ${assigned.length}…`
            : `Assign${assigned.length > 0 ? ` (${assigned.length})` : ""}`
          }
        </button>
      </div>
    </Modal>
    <ConfirmDialog
      open={Boolean(duplicateDialog)}
      title="Legal Personnel Already Assigned"
      description={`${duplicateDialog?.count || 0} selected person(s) are already assigned to this legal case. Refresh the page to display the latest legal assignments.`}
      detail={duplicateDialog?.detail ? `${duplicateDialog.detail}. Any other valid assignments were still saved.` : "Any other valid assignments were still saved."}
      confirmLabel="Refresh Page"
      cancelLabel="Close"
      onCancel={() => setDuplicateDialog(null)}
      onConfirm={() => window.location.reload()}
    />
    <ConfirmDialog
      open={Boolean(removalTarget)}
      title="Remove Legal Personnel"
      description={`Remove ${removalTarget?.name || "this person"} from this legal case?`}
      detail="Their active legal assignment will be deactivated immediately."
      confirmLabel="Remove"
      cancelLabel="Cancel"
      tone="danger"
      busy={removing}
      dismissible={!removing}
      onCancel={() => { if (!removing) setRemovalTarget(null); }}
      onConfirm={confirmRemoval}
    />
    </>
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
                  <td>{assignedNames(c, "lawyer")}</td>
                  <td><button className={styles.tblBtnEdit} onClick={() => onAction(c)}>{actionLabel}</button></td>
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

function getUserDataFromCookie() {
  try {
    const userCookie = getCookie("user");
    return userCookie ? JSON.parse(userCookie) : {};
  } catch {
    return {};
  }
}

function mergeLegalReviewData(caseData, review) {
  if (!review) return caseData;
  return {
    ...caseData,
    legalReviewId: review.legal_review_id,
    legalReviewLogs: review.logs || [],
    paralegalRecord: review.paralegal_record || null,
    lawyerRecord: review.lawyer_record || null,
    endorsedTo: review.endorsed_to || caseData.endorsedTo || null,
    endorsementStatus: review.endorsed_to ? `Endorsed to ${review.endorsed_to}` : caseData.endorsementStatus,
    endorsementDetails: review.endorsement_details || null,
    monitoringLog: review.monitoring_log || [],
    documentRepository: review.document_repository || [],
  };
}

function mergeStatusHistory(caseData, history = []) {
  const pending = [...history].reverse().find((entry) => entry.approvalStatus === "pending");
  return {
    ...caseData,
    pendingApproval: pending ? {
      historyId: pending.historyId,
      proposedStatus: pending.status,
      submittedBy: pending.by,
      date: pending.date,
      notes: pending.notes,
      formData: pending.formData,
    } : null,
    statusHistory: history,
  };
}

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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${API_URL}/api/case_reports/all`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to fetch cases: ${res.status}`);
        const { data } = await res.json();

        // Only cases that are Verified - True are passed to Legal Review
        const mapped = data
          .filter((r) => STATUS_STEP[r.case_status_id] === VERIFIED_TRUE_STATUS ||
            // also include cases already in legal review pipeline
            ["Under Case Evaluation","Case Filed","Investigation Ongoing","Hearing Ongoing","Dismissed","Perpetrator Convicted","Resolved"]
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
              assignedLegal:         (r.assigned_legal || []).map((person) => ({
                ...person,
                assignment_role: person.assignment_role === "legal_officer" ? "lawyer" : person.assignment_role,
              })),
              dateReported:          r.created_at,
              caseType:              r.case_type || null,
              primaryCategory:       r.primary_category || null,
              additionalCategories:  r.additional_categories || [],
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
        const synced = await Promise.all(mapped.map(async (caseItem) => {
          try {
            const [reviewRes, historyRes] = await Promise.all([
              fetch(`${API_URL}/api/legal_reviews/case/${caseItem.id}`, { credentials: "include" }),
              fetch(`${API_URL}/api/case_status_history/${caseItem.id}?staffView=true`, { credentials: "include" }),
            ]);
            const reviewPayload = reviewRes.ok ? await reviewRes.json().catch(() => ({})) : {};
            const historyPayload = historyRes.ok ? await historyRes.json().catch(() => ({})) : {};
            return mergeStatusHistory(
              mergeLegalReviewData(caseItem, reviewPayload.data),
              historyPayload.data || caseItem.statusHistory,
            );
          } catch {
            return caseItem;
          }
        }));
        setCases(synced);
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
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
    assignedParalegal: "",
    caseType: "",
    caseCategory: "",
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
  const [calendarCases, setCalendarCases] = useState([]);
  const [bulkDialog, setBulkDialog] = useState(null);
  const [removeAssignedDialog, setRemoveAssignedDialog] = useState(null);
  const [removingAssigned, setRemovingAssigned] = useState(false);

  function showToast(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }
  function closeModal() { setModal(null); }
  function open(c, m) { setSelectedCase(c); setModal(m); }
  function openSingleCaseAction(selectedCases, modalName, label) {
    if (selectedCases.length <= 1) {
      open(selectedCases[0], modalName);
      return;
    }
    setBulkDialog({ selectedCases, modalName, label });
  }

  async function saveCase(updated) {
    const reviewDetailsChanged =
      updated.paralegalRecord !== selectedCase?.paralegalRecord ||
      updated.lawyerRecord !== selectedCase?.lawyerRecord ||
      updated.documentRepository !== selectedCase?.documentRepository ||
      updated.endorsedTo !== selectedCase?.endorsedTo ||
      updated.endorsementDetails !== selectedCase?.endorsementDetails ||
      (updated.monitoringLog || []).length > (selectedCase?.monitoringLog || []).length;

    if (!reviewDetailsChanged) {
      setCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setSelectedCase(updated);
      showToast(`Case ${updated.id} updated.`);
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const userData = getUserDataFromCookie();
    const performedByUserId = userData.user_id || userData.id;

    let body = {
      performed_by_user_id: performedByUserId,
      action_type: "legal_review_updated",
      remarks: `Legal review updated for case ${updated.id}.`,
    };

    if (updated.paralegalRecord !== selectedCase?.paralegalRecord) {
      body = {
        ...body,
        action_type: "paralegal_record_saved",
        remarks: "Paralegal support record saved.",
        paralegal_record: updated.paralegalRecord,
        document_repository: updated.documentRepository || [],
      };
    } else if (updated.lawyerRecord !== selectedCase?.lawyerRecord) {
      body = {
        ...body,
        action_type: "lawyer_consultation_saved",
        remarks: "Lawyer consultation record saved.",
        lawyer_record: updated.lawyerRecord,
      };
    } else if (updated.endorsedTo !== selectedCase?.endorsedTo || updated.endorsementDetails !== selectedCase?.endorsementDetails) {
      body = {
        ...body,
        action_type: "endorsement_saved",
        remarks: `Endorsement saved${updated.endorsedTo ? ` to ${updated.endorsedTo}` : ""}.`,
        endorsed_to: updated.endorsedTo || null,
        endorsement_details: updated.endorsementDetails || null,
      };
    } else if ((updated.monitoringLog || []).length > (selectedCase?.monitoringLog || []).length) {
      body = {
        ...body,
        action_type: "monitoring_update_added",
        remarks: "Monitoring update added.",
        monitoring_entry: updated.monitoringLog[updated.monitoringLog.length - 1],
      };
    }

    try {
      const res = await fetch(`${API_URL}/api/legal_reviews/case/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to save legal review details.");

      const merged = mergeLegalReviewData(updated, payload.data);
      setCases((prev) => prev.map((c) => c.id === updated.id ? merged : c));
      setSelectedCase(merged);
      showToast(`Case ${updated.id} updated.`);
    } catch (err) {
      showToast(err.message, "danger");
      throw err;
    }
  }

  function requestRemoveAssignedStaff(selectedCases) {
    const casesToUpdate = Array.isArray(selectedCases) ? selectedCases : [selectedCases];
    setRemoveAssignedDialog(casesToUpdate.filter(Boolean));
  }

  async function confirmRemoveAssignedStaff() {
    const casesToUpdate = removeAssignedDialog || [];
    const assignments = casesToUpdate.flatMap((caseItem) =>
      (caseItem.assignedLegal || [])
        .filter((person) => person.legal_personnel_id)
        .map((person) => ({
          caseId: caseItem.id,
          legalPersonnelId: person.legal_personnel_id,
        }))
    );

    if (assignments.length === 0) {
      setRemoveAssignedDialog(null);
      showToast("No assigned legal personnel to remove.", "danger");
      return;
    }

    setRemovingAssigned(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      await Promise.all(assignments.map(async ({ caseId, legalPersonnelId }) => {
        const res = await fetch(`${API_URL}/api/legal_case_assignments/${caseId}/${legalPersonnelId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to remove assigned legal personnel.");
      }));

      const updatedCaseIds = new Set(casesToUpdate.map((caseItem) => caseItem.id));
      setCases((current) =>
        current.map((caseItem) =>
          updatedCaseIds.has(caseItem.id)
            ? { ...caseItem, assignedLegal: [], assignedLawyer: null, assignedParalegal: null }
            : caseItem
        )
      );
      setRemoveAssignedDialog(null);
      showToast("Assigned legal personnel removed.");
    } catch (err) {
      showToast(err.message || "Failed to remove assigned legal personnel.", "danger");
    } finally {
      setRemovingAssigned(false);
    }
  }

  async function submitForApproval(caseData, proposedStatus, changeDetails) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const userData = getUserDataFromCookie();
    try {
      const res = await fetch(`${API_URL}/api/case_status_history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          case_report_id: caseData.id,
          proposed_status: proposedStatus,
          changed_by_id: userData.user_id || userData.id,
          changed_by_role: userData.role_name || user.role || "Legal Personnel",
          notes: changeDetails.notes,
          form_data: changeDetails.formData || {},
          assessment_type: proposedStatus,
          findings: changeDetails.notes,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to save status change.");
      const historyEntry = {
        historyId: payload.historyRow.history_id,
        status: proposedStatus,
        date: changeDetails.date,
        by: changeDetails.submittedBy,
        notes: changeDetails.notes,
        formData: changeDetails.formData,
        approvalStatus: payload.requiresApproval ? "pending" : "approved",
      };
      setCases((previous) => previous.map((item) => item.id === caseData.id ? {
        ...item,
        status: payload.requiresApproval ? item.status : proposedStatus,
        pendingApproval: payload.requiresApproval ? {
          historyId: payload.historyRow.history_id,
          proposedStatus,
          ...changeDetails,
        } : null,
        statusHistory: [...(item.statusHistory || []), historyEntry],
      } : item));
      showToast(payload.message);
    } catch (error) {
      showToast(error.message, "danger");
      throw error;
    }
  }

  async function approveChange(caseData) {
    const pa = caseData.pendingApproval;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const userData = getUserDataFromCookie();
    try {
      const res = await fetch(`${API_URL}/api/case_status_history/${pa.historyId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved_by_id: userData.user_id || userData.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to approve status change.");
      setCases((previous) => previous.map((item) => item.id === caseData.id ? {
        ...item,
        status: pa.proposedStatus,
        pendingApproval: null,
        statusHistory: (item.statusHistory || []).map((entry) => entry.historyId === pa.historyId ? { ...entry, approvalStatus: "approved" } : entry),
      } : item));
      showToast(payload.message);
    } catch (error) {
      showToast(error.message, "danger");
      throw error;
    }
  }

  async function rejectChange(caseData, reason) {
    const pa = caseData.pendingApproval;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const userData = getUserDataFromCookie();
    try {
      const res = await fetch(`${API_URL}/api/case_status_history/${pa.historyId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          approved_by_id: userData.user_id || userData.id,
          rejection_reason: reason,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to reject status change.");
      setCases((previous) => previous.map((item) => item.id === caseData.id ? {
        ...item,
        pendingApproval: null,
        statusHistory: (item.statusHistory || []).map((entry) => entry.historyId === pa.historyId ? { ...entry, approvalStatus: "rejected", rejectionReason: reason } : entry),
      } : item));
      showToast(payload.message, "danger");
    } catch (error) {
      showToast(error.message, "danger");
      throw error;
    }
  }

  const stats = useMemo(() => {
    const pending = cases.filter((c) => c.pendingApproval).length;
    return [
      { num: cases.filter((c) => c.status === "Under Case Evaluation").length, label: "Under Evaluation" },
      { num: cases.filter((c) => [ "Verified - True", "Under Case Evaluation", "Case Filed", "Investigation Ongoing", "Hearing Ongoing",].includes(c.status)).length, label: "Active Cases" },
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
        mf = mf && assignedNames(c, "lawyer").toLowerCase().includes(activeFilters.assignedLegalOfficer.toLowerCase());
      }
      if (activeFilters.assignedParalegal && activeFilters.assignedParalegal !== "" && activeFilters.assignedParalegal !== "All") {
        mf = mf && assignedNames(c, "paralegal").toLowerCase().includes(activeFilters.assignedParalegal.toLowerCase());
      }
      if (activeFilters.caseType && activeFilters.caseType !== "" && activeFilters.caseType !== "All") {
        mf = mf && normalizeLegalList(c.caseType).includes(activeFilters.caseType);
      }
      if (activeFilters.caseCategory && activeFilters.caseCategory !== "" && activeFilters.caseCategory !== "All") {
        mf = mf && [...normalizeLegalList(c.primaryCategory), ...normalizeLegalList(c.additionalCategories)].includes(activeFilters.caseCategory);
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
              <ActionCard icon={<img src="/LegalIconParalegal.png" alt="" className={styles.actionIconImg} />} title="Paralegal Support" description="Organize case facts, timelines, evidence, sworn statements, and referral documents for a case." onView={() => setModal("selectParalegal")} />
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="/LegalIconLawyer.png" alt="" className={styles.actionIconImg} />} title="Lawyer Consultation" description="Record legal assessment: applicable laws, possible actions (criminal/civil/admin), and evidence gaps." onView={() => setModal("selectLawyer")} />
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="/LegalIconEndorse.png" alt="" className={styles.actionIconImg} />} title="Endorse / Track Referrals" description="Endorse a case to DSWD, PNP, BSP/GSP, CODI, or Court — with full institution-specific monitoring." onView={() => setModal("selectEndorse")} />
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<img src="/LegalIconUpdate.png" alt="" className={styles.actionIconImg} />} title="Update Case Status" description="Record routine progress immediately; filing and terminal outcomes require admin approval." onView={() => setModal("selectStatus")} />
            </div>
            <div className="col-12 col-sm-6 col-lg-4">
              <ActionCard icon={<FiCalendar size={30} />} title="Case Calendar" description="See upcoming and overdue hearings, investigation follow-ups, and referral deadlines." onView={() => { setCalendarCases(cases); setModal("calendar"); }} />
            </div>
            {(isAdmin || isLegal) && (
              <div className="col-12 col-sm-6 col-lg-4">
                <ActionCard icon={<img src="/LegalIconAssign.png" alt="" className={styles.actionIconImg} />} title="Assign Legal Personnel" description="Assign one or more lawyers and paralegals to a case." onView={() => setModal("selectAssign")} />
              </div>
            )}
            {isAdmin && (
              <div className="col-12 col-sm-6 col-lg-4">
                <ActionCard
                  icon={<img src="/LegalIconApprove.png" alt="" className={styles.actionIconImg} />}
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
                lawyerOptions={legalPersonnels
                  .filter((person) => ["lawyer", "legal officer"].includes((person.legal_personnel_type || "").toLowerCase()))
                  .map((person) => `${person.first_name || ""} ${person.last_name || ""}`.trim())
                  .filter(Boolean)}
                paralegalOptions={legalPersonnels
                  .filter((person) => (person.legal_personnel_type || "").toLowerCase() === "paralegal")
                  .map((person) => `${person.first_name || ""} ${person.last_name || ""}`.trim())
                  .filter(Boolean)}
              />
            </div>

            <LegalTable
              paginated={paginated}
              page={page}
              totalPages={totalPages}
              totalRecords={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onRowDoubleClick={(c) => router.push(`/legalReviews/view?caseId=${c.id}&from=legalReviews`)}
              onParalegal={(selected) => openSingleCaseAction(selected, "paralegal", "Paralegal Support")}
              onConsult={(selected) => openSingleCaseAction(selected, "lawyer", "Lawyer Consultation")}
              onEndorse={(selected) => openSingleCaseAction(selected, "endorse", "Endorsement")}
              onMonitor={(selected) => openSingleCaseAction(selected, "monitor", "Monitoring Update")}
              onCalendar={(selected) => { setCalendarCases(selected); setModal("calendar"); }}
              onStatus={(selected) => openSingleCaseAction(selected, "statusChange", "Status Update")}
              onAssignLegal={(selected) => openSingleCaseAction(selected, "assignLegal", "Legal Assignment")}
              onRemoveAssignedStaff={requestRemoveAssignedStaff}
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
      <ParalegalSupportModal open={modal === "paralegal"} onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <LawyerConsultModal   open={modal === "lawyer"}       onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <EndorseModal         open={modal === "endorse"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <MonitoringModal      open={modal === "monitor"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <UpdateStatusModal
        open={modal === "statusChange"}
        onClose={closeModal}
        caseData={selectedCase}
        onSubmit={submitForApproval}
        actorName={actorName}
        isAdmin={isAdmin}
        isLegal={isLegal}
        allowedStatuses={LEGAL_CASE_STATUSES}
      />
      <ApprovalModal        open={modal === "approval"}     onClose={closeModal} caseData={selectedCase} onApprove={approveChange} onReject={rejectChange} />
      <AssignLegalModal     open={modal === "assignLegal"}  onClose={closeModal} caseData={selectedCase} legalPersonnels={legalPersonnels} onSave={saveCase} showToast={showToast} />
      <ConfirmDialog
        open={Boolean(removeAssignedDialog)}
        title="Remove Assigned Staff"
        description={`Remove assigned legal personnel from ${removeAssignedDialog?.length || 0} selected case${removeAssignedDialog?.length === 1 ? "" : "s"}?`}
        detail="Selected lawyers and paralegals will immediately lose access through these legal assignments."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        tone="danger"
        busy={removingAssigned}
        dismissible={!removingAssigned}
        onCancel={() => { if (!removingAssigned) setRemoveAssignedDialog(null); }}
        onConfirm={confirmRemoveAssignedStaff}
      />
      <CaseCalendarModal
        open={modal === "calendar"}
        onClose={closeModal}
        cases={calendarCases}
        onFullView={() => {
          const ids = calendarCases.map((caseData) => caseData.id).filter(Boolean);
          router.push(`/legalReviews/calendar${ids.length > 0 && ids.length < cases.length ? `?caseIds=${ids.join(",")}` : ""}`);
        }}
      />
      <ConfirmDialog
        open={Boolean(bulkDialog)}
        title={`Open ${bulkDialog?.label || "action"}?`}
        description="This workflow records case-specific details and must be completed one case at a time."
        detail={`${bulkDialog?.selectedCases?.length || 0} cases are selected. The first selected case will open now; repeat the action for the remaining cases.`}
        confirmLabel="Open first case"
        onCancel={() => setBulkDialog(null)}
        onConfirm={() => {
          const pending = bulkDialog;
          setBulkDialog(null);
          if (pending?.selectedCases?.[0]) open(pending.selectedCases[0], pending.modalName);
        }}
      />

      {/* Action card → select case → action */}
      <SelectCaseModal open={modal === "selectParalegal"} onClose={closeModal} cases={cases} title="Select Case for Paralegal Support" actionLabel="Paralegal" onAction={(c) => open(c, "paralegal")} />
      <SelectCaseModal open={modal === "selectLawyer"}    onClose={closeModal} cases={cases} title="Select Case for Lawyer Consultation" actionLabel="Consult" onAction={(c) => open(c, "lawyer")} />
      <SelectCaseModal open={modal === "selectEndorse"}   onClose={closeModal} cases={cases} title="Select Case to Endorse / Track Referral" actionLabel="Endorse" onAction={(c) => open(c, "endorse")} />
      <SelectCaseModal open={modal === "selectMonitor"}   onClose={closeModal} cases={cases.filter((c) => c.endorsedTo)} title="Select Case for Monitoring Update" actionLabel="Monitor" onAction={(c) => open(c, "monitor")} />
      <SelectCaseModal open={modal === "selectStatus"}    onClose={closeModal} cases={cases.filter((c) => !c.pendingApproval && (STATUS_TRANSITIONS[c.status]?.length > 0 || isAdmin))} title="Select Case to Update Status" actionLabel="Update" onAction={(c) => open(c, "statusChange")} />
      <SelectCaseModal open={modal === "selectAssign"} onClose={closeModal} cases={cases} title="Select Case to Assign Legal Personnel" actionLabel="Assign" onAction={(c) => open(c, "assignLegal")} />

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
