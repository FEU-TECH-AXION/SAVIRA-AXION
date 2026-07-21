"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./LegalReviewManagement.module.css";
import pendingApprovalStyles from "../cases/PendingStatusApproval.module.css";
import { FiSearch, FiClock, FiCheck, FiChevronDown, FiChevronUp, FiCalendar, FiHelpCircle, FiX } from "react-icons/fi";
import LegalTable from "./LegalTable";
import FilterMenu from "./FilterMenu";
import UpdateStatusModal from "../cases/UpdateStatusModals";
import Tooltip from "../ui/Tooltip";
import { ConfirmDialog } from "../ui/Dialog";
import RemoveAssignedStaffDialog from "../ui/RemoveAssignedStaffDialog";
import { getLegalCaseDeadlines, normalizeLegalList } from "./legalReviewCalendar";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import { useAuth, authFetch } from "@/lib/AuthContext";
import {
  Modal,
  FormGroup,
  FInput,
  FTextarea,
  FSelect,
  ParalegalSupportModal,
  LawyerConsultModal as SharedLawyerConsultModal,
  EndorseModal,
  MonitoringModal,
} from "./LegalReviewModals";
import LegalGuide from "./LegalGuide";
import ActorByline from "@/components/ui/ActorByline";

import { internalApiFetch, API_URL } from "@/lib/internalApiFetch";

async function parseErrorPayload(response, fallback) {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text);
    const message = payload.error || payload.message || fallback;
    const details = cleanErrorDetails(payload.details);
    return shouldShowErrorDetails(message, details) ? `${message}: ${details}` : message;
  } catch (_) {
    return `${fallback} (${response.status})${text ? `: ${cleanErrorDetails(text)}` : ""}`;
  }
}

function shouldShowErrorDetails(message, details) {
  if (!details) return false;
  const normalizedMessage = String(message || "").replace(/[.\s]+$/g, "").toLowerCase();
  const normalizedDetails = String(details || "").replace(/[.\s]+$/g, "").toLowerCase();
  return normalizedDetails && normalizedDetails !== normalizedMessage && normalizedDetails !== "internal server error";
}

function cleanErrorDetails(value) {
  return String(value || "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^Error\s*/i, "")
    .trim()
    .slice(0, 180);
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

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

function assignedPeople(caseData, role) {
  return (caseData?.assignedLegal || []).filter((person) => person.assignment_role === role);
}

function assignedNames(caseData, role) {
  return assignedPeople(caseData, role).map((person) => person.name).filter(Boolean).join(", ") || "Unassigned";
}

function normalizePersonnelType(value) {
  return String(value || "").trim().toLowerCase();
}

function isLawyerType(value) {
  return ["lawyer", "legal officer"].includes(normalizePersonnelType(value));
}

function isParalegalType(value) {
  return normalizePersonnelType(value) === "paralegal";
}

// -----------------------------------------------------------------------------
// STATUS COLORS
// -----------------------------------------------------------------------------

const STATUS_COLORS = {
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
};

// -----------------------------------------------------------------------------
// UTILITY COMPONENTS
// -----------------------------------------------------------------------------

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

function LegalActorByline({ actorName, actorRole, timestamp, fallbackName = "" }) {
  return (
    <ActorByline
      actorName={actorName}
      actorRole={actorRole}
      timestamp={timestamp}
      fallbackName={fallbackName}
      as="span"
    />
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
          <button className={styles.viewBtn} onClick={onView}>View &rarr;</button>
        </Tooltip>
      </div>
    </div>
  );
}

function CaseCalendarModal({ open, onClose, cases, onFullView }) {
  const deadlines = useMemo(() => cases.flatMap(getLegalCaseDeadlines), [cases]);
  const today = new Date(new Date().toDateString());

  function formatDeadlineMeta(deadline) {
    const dateText = deadline.date.toLocaleDateString("en-PH");
    if (deadline.type === "status") return dateText;

    const dayDelta = Math.ceil((deadline.date - today) / 86400000);
    return `${dateText} · ${dayDelta < 0 ? `${Math.abs(dayDelta)} day(s) overdue` : dayDelta === 0 ? "Today" : `in ${dayDelta} day(s)`}`;
  }

  return (
    <Modal open={open} onClose={onClose} title="Case Calendar" wide>
      <p className={styles.formDesc}>Upcoming and overdue hearing, investigation, and referral follow-up dates.</p>
      {deadlines.length === 0 ? <p className={styles.emptyState}>No structured deadlines have been recorded for these cases yet.</p> : (
        <div className={styles.historyList}>
          {deadlines.map((deadline, index) => {
            return (
              <div key={`${deadline.caseId}-${deadline.label}-${deadline.value}-${index}`} className={styles.historyItem}>
                <div className={styles.historyDot} />
                <div className={styles.historyContent}>
                  <strong>{deadline.caseId} · {deadline.label}</strong>
                  <span className={styles.historyMeta}>{formatDeadlineMeta(deadline)}</span>
                  <span className={styles.historyNotes}>{deadline.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.modalFooter}>
        <button className={`${styles.btnSecondary} ${styles.btnLight}`} onClick={onClose}>Close</button>
        <button className={styles.btnPrimary} onClick={onFullView}>Open Full Calendar</button>
      </div>
    </Modal>
  );
}


// -----------------------------------------------------------------------------
// VIEW CASE MODAL — full detail
// -----------------------------------------------------------------------------

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
          ["Status",               <StatusBadge key="status" status={caseData.status} />],
          ["Lawyer(s)",            assignedNames(caseData, "lawyer")],
          ["Paralegal(s)",         assignedNames(caseData, "paralegal")],
          ["Date Reported",        caseData.dateReported],
          ["Endorsed To",          caseData.endorsedTo || "—"],
          ...(caseData.pendingApproval ? [["Pending Change", <PendingBadge key="pending-change" />]] : []),
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
          {(caseData.endorsementDetails.endorsedBy || caseData.endorsementDetails.endorsedByRole) && (
            <div className={styles.viewRow}>
              <span className={styles.viewKey}>Endorsed by</span>
              <span className={styles.viewVal}>
                <LegalActorByline
                  actorName={caseData.endorsementDetails.endorsedBy}
                  actorRole={caseData.endorsementDetails.endorsedByRole}
                />
              </span>
            </div>
          )}
          {Object.entries(caseData.endorsementDetails).map(([k, v]) => (
            ["endorsedBy", "endorsedById", "endorsedByRole"].includes(k) ? null :
            v !== null && v !== undefined && v !== "" && (!Array.isArray(v) || v.length > 0) ? (
            <div key={k} className={styles.viewRow}>
              <span className={styles.viewKey}>{k.replace(/_/g, " ")}</span>
              <span className={styles.viewVal}>{Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : v}</span>
            </div>
          ) : null))}
        </div>
      )}

      {/* Paralegal Record */}
      {caseData.paralegalRecord && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>Paralegal Support Record</h4>
          <div className={styles.viewRow}>
            <span className={styles.viewKey}>Organized by</span>
            <span className={styles.viewVal}>
              <LegalActorByline
                actorName={caseData.paralegalRecord.organizedBy}
                actorRole={caseData.paralegalRecord.organizedByRole}
              />
            </span>
          </div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Date</span><span className={styles.viewVal}>{caseData.paralegalRecord.date}</span></div>
          <div className={styles.viewRow}><span className={styles.viewKey}>Documents</span><span className={styles.viewVal}>{caseData.paralegalRecord.documents}</span></div>
        </div>
      )}

      {/* Lawyer Record */}
      {caseData.lawyerRecord && (
        <div className={styles.detailBlock}>
          <h4 className={styles.detailTitle}>Lawyer Consultation Record</h4>
          <div className={styles.viewRow}>
            <span className={styles.viewKey}>Assessed by</span>
            <span className={styles.viewVal}>
              <LegalActorByline
                actorName={caseData.lawyerRecord.assessedBy}
                actorRole={caseData.lawyerRecord.assessedByRole}
              />
            </span>
          </div>
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
                    <span className={styles.historyMeta}>
                      {m.date}
                      <span aria-hidden="true"> · </span>
                      <LegalActorByline actorName={m.by} actorRole={m.byRole} />
                    </span>
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

// -----------------------------------------------------------------------------
// ASSIGN LEGAL OFFICER / PARALEGAL
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// PARALEGAL SUPPORT MODAL — organize case facts and documents
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// LAWYER CONSULTATION MODAL
// -----------------------------------------------------------------------------


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
    if (!open || !caseData) return undefined;
    const record = caseData.lawyerRecord || {};
    const timer = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(timer);
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

// -----------------------------------------------------------------------------
// ENDORSEMENT / REFERRAL MODAL — with full per-institution tracking
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// MONITORING LOG MODAL — add an update entry
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// STATUS CHANGE MODAL — with approval flow
// -----------------------------------------------------------------------------

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
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setSelected(null);
      setNotes("");
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);
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

// -----------------------------------------------------------------------------
// ADMIN APPROVAL MODAL
// -----------------------------------------------------------------------------

function ApprovalModal({ open, onClose, caseData, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!open || !caseData || !caseData.pendingApproval) return null;
  const pa = caseData.pendingApproval;

  async function approve() {
    setSaving(true);
    try {
      await onApprove(caseData);
      onClose();
    } catch {
      // Parent action shows the toast; keep the modal open for retry.
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    setSaving(true);
    try {
      await onReject(caseData, rejectReason);
      onClose();
    } catch {
      // Parent action shows the toast; keep the modal open for retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pendingApprovalStyles.overlay} onMouseDown={(event) => {
      if (!saving && event.target === event.currentTarget) onClose();
    }}>
      <div className={pendingApprovalStyles.modal} role="dialog" aria-modal="true" aria-labelledby="pending-status-title">
        <div className={pendingApprovalStyles.header}>
          <h2 id="pending-status-title">Review Pending Status Change</h2>
          <button type="button" className={pendingApprovalStyles.closeButton} onClick={onClose} aria-label="Close approval dialog" disabled={saving}>
            <FiX />
          </button>
        </div>

        <div className={pendingApprovalStyles.body}>
          <dl className={pendingApprovalStyles.reviewGrid}>
            <div><dt>Case ID</dt><dd>{caseData.caseId || caseData.id}</dd></div>
            <div><dt>Current Status</dt><dd>{caseData.status}</dd></div>
            <div><dt>Proposed Status</dt><dd>{pa.proposedStatus}</dd></div>
            <div><dt>Submitted By</dt><dd>{pa.submittedBy || "Unknown"}</dd></div>
            <div><dt>Date Submitted</dt><dd>{pa.date || "-"}</dd></div>
            <div className={pendingApprovalStyles.fullRow}><dt>Notes</dt><dd>{pa.notes || "No notes provided."}</dd></div>
          </dl>

          {showReject && (
            <label className={pendingApprovalStyles.rejectField}>
              <span>Reason for rejection</span>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Explain why this status change is being rejected..."
                rows={4}
              />
            </label>
          )}
        </div>

        <div className={pendingApprovalStyles.footer}>
          {showReject ? (
            <>
              <button type="button" className={pendingApprovalStyles.secondaryButton} onClick={() => setShowReject(false)} disabled={saving}>Back</button>
              <button type="button" className={pendingApprovalStyles.dangerButton} onClick={reject} disabled={saving || !rejectReason.trim()}>
                {saving ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={pendingApprovalStyles.secondaryButton} onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className={pendingApprovalStyles.dangerButton} onClick={() => setShowReject(true)} disabled={saving}>Reject</button>
              <button type="button" className={pendingApprovalStyles.approveButton} onClick={approve} disabled={saving}>
                <FiCheck /> {saving ? "Approving..." : "Approve & Apply"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ASSIGN LEGAL MODAL — assign case to legal team member + send email notification
// -----------------------------------------------------------------------------

function AssignLegalModal({ open, onClose, caseData, legalPersonnels = [], onSave, showToast }) {
  const [search,      setSearch]      = useState("");
  const [assigned,    setAssigned]    = useState([]); // { legal_personnel_id, first_name, last_name, legal_personnel_type }
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [duplicateDialog, setDuplicateDialog] = useState(null);
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setSearch("");
      setAssigned([]);
      setError("");
      setDuplicateDialog(null);
      setRemovalTarget(null);
    }, 0);
    return () => clearTimeout(timer);
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
      const res = await internalApiFetch(
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
          const res = await internalApiFetch(`${API_URL}/api/legal_case_assignments/assign-bulk`, {
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
                maxHeight:    "80px",
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
                No personnel found matching &quot;{search}&quot;.
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

// -----------------------------------------------------------------------------
// SELECT CASE MODAL (for action cards)
// -----------------------------------------------------------------------------

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
                  <td className={styles.truncateCell} title={c.region || ""}>{c.region}</td>
                  <td><StatusBadge status={c.status} />{c.pendingApproval && <span style={{ marginLeft: 4 }}><PendingBadge /></span>}</td>
                  <td className={styles.truncateCell} title={assignedNames(c, "lawyer") || "Unassigned"}>{assignedNames(c, "lawyer") || "—"}</td>
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

// -----------------------------------------------------------------------------
// COOKIES
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------

function mergeLegalReviewData(caseData, review) {
  if (!review) return caseData;
  const endorsedTo = review.endorsed_to || getExistingEndorsedTo(caseData);
  return {
    ...caseData,
    legalReviewId: review.legal_review_id,
    paralegalRecord: review.paralegal_record || null,
    lawyerRecord: review.lawyer_record || null,
    endorsedTo,
    referralBody: review.endorsed_to || caseData.referralBody || endorsedTo || null,
    referralRequired: Boolean(review.endorsed_to || caseData.referralRequired || endorsedTo),
    endorsementStatus: endorsedTo ? `Endorsed to ${endorsedTo}` : caseData.endorsementStatus,
    endorsementDetails: review.endorsement_details || getExistingEndorsementDetails(caseData),
    monitoringLog: review.monitoring_log || [],
    documentRepository: review.document_repository || [],
  };
}

function getExistingEndorsedTo(caseData = {}) {
  const value =
    caseData.endorsedTo ||
    caseData.endorsementDetails?.endorsed_to ||
    caseData.endorsement?.endorsed_to ||
    caseData.referralBody ||
    null;
  return value && value !== "None" ? value : null;
}

function getExistingEndorsementDetails(caseData = {}) {
  return caseData.endorsementDetails || caseData.endorsement || null;
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

function mapLegalReportToCase(report) {
  const status = STATUS_STEP[report.case_status_id] || "Verified - True";
  const endorsedTo = report.endorsement?.endorsed_to || report.referral_body || null;
  const endorsementDetails = report.endorsement || null;
  const defaultHistory = [{
    status,
    date: new Date(report.created_at).toLocaleDateString("en-PH"),
    by: report.assigned_officer || "System",
    notes: "Case passed to Legal Review.",
  }];

  return {
    id: report.case_report_id,
    caseId: report.case_code || `CASE-${String(report.public_id || report.case_report_id).slice(0, 8).toUpperCase()}`,
    reporterId: String(report.complainant_id),
    region: report.incident_province || report.incident_city || "—",
    city: report.incident_city || "—",
    status,
    assignedOfficer: report.assigned_officer || null,
    assignedLegal: (report.assigned_legal || []).map((person) => ({
      ...person,
      assignment_role: person.assignment_role === "legal_officer" ? "lawyer" : person.assignment_role,
    })),
    dateReported: report.created_at,
    caseType: report.case_type || null,
    primaryCategory: report.primary_category || null,
    additionalCategories: report.additional_categories || [],
    pendingApproval: null,
    referralRequired: Boolean(report.referral_required || endorsedTo),
    referralBody: report.referral_body || endorsedTo,
    endorsedTo,
    endorsementStatus: endorsedTo ? `Endorsed to ${endorsedTo}` : report.endorsement_status || null,
    endorsementDetails,
    paralegalRecord: null,
    lawyerRecord: null,
    monitoringLog: [],
    statusHistory: report.status_history?.length ? report.status_history : defaultHistory,
  };
}

export default function LegalReviewManagement() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const user = {
    role: authUser?.role_name || authUser?.role || "",
    firstName: authUser?.first_name || "",
    lastName: authUser?.last_name || "",
    id: authUser?.user_id || authUser?.id || null,
    legalPersonnelType: authUser?.legal_personnel_type || "",
  };

  const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Legal Personnel";
  const normalizedRole = user.role?.toLowerCase();
  const isAdmin   = normalizedRole === "admin";
  const isLegal   = normalizedRole === "legal personnel" || normalizedRole === "legal_personnel";

  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [legalGuideOpen, setLegalGuideOpen] = useState(false);
  // Legal personnels fetched from backend (for assign dropdown + filter)
  const [legalPersonnels, setLegalPersonnels] = useState([]);
  const currentLegalPersonnel = useMemo(
    () => legalPersonnels.find((person) => String(person.user_id) === String(user.id)),
    [legalPersonnels, user.id]
  );
  const legalPersonnelType = user.legalPersonnelType || currentLegalPersonnel?.legal_personnel_type || "";
  const actorRole = isLegal && legalPersonnelType ? legalPersonnelType : user.role || "Legal Personnel";
  const isParalegal = isLegal && isParalegalType(legalPersonnelType);
  const isLawyer = isLegal && isLawyerType(legalPersonnelType);
  const canUseParalegalWorkflows = isAdmin || isParalegal;
  const canUseLawyerWorkflow = isAdmin || isLawyer;
  const canUseAllLegalWorkflows = isAdmin || isParalegal;
  const canUseCalendarWorkflow = isAdmin || isParalegal || isLawyer;


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
  const [totalRecords, setTotalRecords] = useState(0);
  const [legalStats, setLegalStats] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch one legal-management page from the backend. Filtering/sorting happens
  // server-side so the API does not load every legal case before rendering page 1.
  useEffect(() => {
    let cancelled = false;

    const appendParam = (params, key, value) => {
      if (value && value !== "All") params.set(key, value);
    };

    const fetchLegalManagement = async () => {
      setCasesLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sortBy: sortField || "dateReported",
          sortDir,
        });

        appendParam(params, "search", search.trim());
        appendParam(params, "status", activeFilters.status);
        appendParam(params, "assignedLegalOfficer", activeFilters.assignedLegalOfficer);
        appendParam(params, "assignedParalegal", activeFilters.assignedParalegal);
        appendParam(params, "caseType", activeFilters.caseType);
        appendParam(params, "caseCategory", activeFilters.caseCategory);
        appendParam(params, "dateReported", activeFilters.dateReported);
        appendParam(params, "endorsedTo", activeFilters.endorsedTo);
        appendParam(params, "city", activeFilters.city);

        const res = await authFetch(`${API_URL}/api/legal_reviews/management?${params.toString()}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || `Failed to fetch legal management data: ${res.status}`);

        const pageData = payload.data || {};
        const reviews = pageData.reviews || {};
        const synced = (pageData.cases || []).map((report) => {
          const caseItem = mapLegalReportToCase(report);
          return mergeStatusHistory(
            mergeLegalReviewData(caseItem, reviews[caseItem.id]),
            caseItem.statusHistory,
          );
        });

        if (cancelled) return;
        setCases(synced);
        setLegalPersonnels(pageData.legal_personnels || []);
        setTotalRecords(Number(pageData.total) || synced.length);
        setLegalStats(pageData.stats || null);
      } catch (err) {
        if (!cancelled) console.error("[LegalReview] fetch error:", err);
      } finally {
        if (!cancelled) setCasesLoading(false);
      }
    };

    fetchLegalManagement();
    return () => {
      cancelled = true;
    };
  }, [page, search, activeFilters, sortField, sortDir]);

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
    const performedByUserId = authUser?.user_id || authUser?.id || null;

    let body = {
      performed_by_user_id: performedByUserId,
      action_type: "legal_review_updated",
      remarks: `Legal review updated for case ${updated.id}.`,
      is_public: Boolean(updated.is_public),
      public_message: updated.is_public ? updated.public_message : null,
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
      const res = await internalApiFetch(`${API_URL}/api/legal_reviews/case/${updated.id}`, {
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

  function getRemovableLegalAssignments(casesToUpdate = []) {
    return casesToUpdate.flatMap((caseItem) =>
      (caseItem.assignedLegal || [])
        .filter((person) => person.legal_personnel_id)
        .map((person) => ({
          key: `${caseItem.id}:${person.legal_personnel_id}`,
          caseId: caseItem.id,
          legalPersonnelId: person.legal_personnel_id,
          label: person.name || `Personnel #${person.legal_personnel_id}`,
          context: `Case ${caseItem.caseId || caseItem.id}`,
          detail: person.assignment_role ? `Role: ${person.assignment_role}` : undefined,
        }))
    );
  }

  async function confirmRemoveAssignedStaff(selectedAssignments) {
    const casesToUpdate = removeAssignedDialog || [];
    const assignments = selectedAssignments || [];

    if (assignments.length === 0) {
      showToast("Select at least one assigned legal personnel to remove.", "danger");
      return;
    }

    setRemovingAssigned(true);
    try {
      await Promise.all(assignments.map(async ({ caseId, legalPersonnelId }) => {
        const res = await internalApiFetch(`${API_URL}/api/legal_case_assignments/${caseId}/${legalPersonnelId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to remove assigned legal personnel.");
      }));

      const removedByCase = assignments.reduce((map, assignment) => {
        const ids = map.get(assignment.caseId) || new Set();
        ids.add(String(assignment.legalPersonnelId));
        map.set(assignment.caseId, ids);
        return map;
      }, new Map());
      setCases((current) =>
        current.map((caseItem) => {
          const removedIds = removedByCase.get(caseItem.id);
          if (!removedIds) return caseItem;
          const assignedLegal = (caseItem.assignedLegal || []).filter(
            (person) => !removedIds.has(String(person.legal_personnel_id))
          );
          const assignedLawyer = assignedLegal
            .filter((person) => person.assignment_role === "lawyer")
            .map((person) => person.name)
            .filter(Boolean)
            .join(", ") || null;
          const assignedParalegal = assignedLegal
            .filter((person) => person.assignment_role === "paralegal")
            .map((person) => person.name)
            .filter(Boolean)
            .join(", ") || null;
          return { ...caseItem, assignedLegal, assignedLawyer, assignedParalegal };
        })
      );
      setRemoveAssignedDialog(null);
      showToast("Selected legal personnel removed.");
    } catch (err) {
      showToast(err.message || "Failed to remove assigned legal personnel.", "danger");
    } finally {
      setRemovingAssigned(false);
    }
  }

  async function submitForApproval(caseData, proposedStatus, changeDetails) {
    try {
      const res = await internalApiFetch(`${API_URL}/api/case_status_history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          case_report_id: caseData.id,
          proposed_status: proposedStatus,
          changed_by_id: authUser?.user_id || authUser?.id || null,
          changed_by_role: actorRole,
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
        actorName: changeDetails.submittedBy,
        actorRole,
        changed_by_role: actorRole,
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
    try {
      const res = await internalApiFetch(`${API_URL}/api/case_status_history/${pa.historyId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved_by_id: authUser?.user_id || authUser?.id || null }),
      });
      const payload = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok) throw new Error(await parseErrorPayload(res, "Failed to approve status change."));
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
    try {
      const res = await internalApiFetch(`${API_URL}/api/case_status_history/${pa.historyId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          approved_by_id: authUser?.user_id || authUser?.id || null,
          rejection_reason: reason,
        }),
      });
      const payload = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok) throw new Error(await parseErrorPayload(res, "Failed to reject status change."));
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
    const pending = legalStats?.pendingApprovals ?? cases.filter((c) => c.pendingApproval).length;
    return [
      { num: legalStats?.underEvaluation ?? cases.filter((c) => c.status === "Under Case Evaluation").length, label: "Under Evaluation" },
      { num: legalStats?.activeCases ?? cases.filter((c) => [ "Verified - True", "Under Case Evaluation", "Case Filed", "Investigation Ongoing", "Hearing Ongoing",].includes(c.status)).length, label: "Active Cases" },
      { num: legalStats?.endorsedCases ?? cases.filter((c) => c.endorsedTo).length, label: "Endorsed Cases" },
      ...(isAdmin ? [{ num: pending, label: "Pending Approvals", highlight: pending > 0 }] : []),
    ];
  }, [cases, isAdmin, legalStats]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search, activeFilters, sortField, sortDir]);
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const paginated = cases;
  const pendingCases = useMemo(() => cases.filter((c) => c.pendingApproval), [cases]);

  // -----------------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------------

  return (
    <>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type || "success"}`]}`}>{toast.msg}</div>}

      <main className={styles.pageWrapper}>
        {/* Hero */}
        <section className={styles.heroBanner}>
          <div className={styles.heroShell}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Legal Review</h1>
              <button
                type="button"
                className={styles.legalGuideBtn}
                onClick={() => setLegalGuideOpen(true)}
              >
                <FiHelpCircle />
                Legal Guide
              </button>
              <div className={styles.statGrid}>
                {stats.map(({ num, label, highlight }) => (
                  <div key={label} className={styles.statGridItem}>
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
        <div className={styles.contentShell}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>What would you like to do?</h2>
            <div className={styles.headingLine} />
          </div>
          <div className={styles.actionGrid}>
            <div className={styles.actionCell} style={!canUseParalegalWorkflows ? { display: "none" } : undefined}>
              {canUseParalegalWorkflows && <ActionCard icon={<img src="/LegalIconParalegal.png" alt="" className={styles.actionIconImg} />} title="Paralegal Support" description="Organize case facts, timelines, evidence, sworn statements, and referral documents for a case." onView={() => setModal("selectParalegal")} />}
            </div>
            <div className={styles.actionCell} style={!canUseLawyerWorkflow ? { display: "none" } : undefined}>
              {canUseLawyerWorkflow && <ActionCard icon={<img src="/LegalIconLawyer.png" alt="" className={styles.actionIconImg} />} title="Lawyer Consultation" description="Record legal assessment: applicable laws, possible actions (criminal/civil/admin), and evidence gaps." onView={() => setModal("selectLawyer")} />}
            </div>
            <div className={styles.actionCell} style={!canUseAllLegalWorkflows ? { display: "none" } : undefined}>
              {canUseAllLegalWorkflows && <ActionCard icon={<img src="/LegalIconEndorse.png" alt="" className={styles.actionIconImg} />} title="Endorse / Track Referrals" description="Endorse a case to DSWD, PNP, BSP/GSP, CODI, or Court — with full institution-specific monitoring." onView={() => setModal("selectEndorse")} />}
            </div>
            <div className={styles.actionCell} style={!canUseAllLegalWorkflows ? { display: "none" } : undefined}>
              {canUseAllLegalWorkflows && <ActionCard icon={<img src="/LegalIconUpdate.png" alt="" className={styles.actionIconImg} />} title="Update Case Status" description="Record routine progress immediately; filing and terminal outcomes require admin approval." onView={() => setModal("selectStatus")} />}
            </div>
            <div className={styles.actionCell} style={!canUseCalendarWorkflow ? { display: "none" } : undefined}>
              {canUseCalendarWorkflow && <ActionCard icon={<img src="/case-calendar.png" alt="" className={styles.actionIconImg} />} title="Case Calendar" description="See upcoming and overdue hearings, investigation follow-ups, and referral deadlines." onView={() => { setCalendarCases(cases); setModal("calendar"); }} />}
            </div>
            {canUseAllLegalWorkflows && (
              <div className={styles.actionCell}>
                <ActionCard icon={<img src="/LegalIconAssign.png" alt="" className={styles.actionIconImg} />} title="Assign Legal Personnel" description="Assign one or more lawyers and paralegals to a case." onView={() => setModal("selectAssign")} />
              </div>
            )}
            {isAdmin && (
              <div className={styles.actionCell}>
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
          <div className={styles.contentShell}>
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
              totalRecords={totalRecords}
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
              canAssignLegal={canUseAllLegalWorkflows}
              canParalegalActions={canUseParalegalWorkflows}
              canLawyerActions={canUseLawyerWorkflow}
              canEndorseActions={canUseAllLegalWorkflows}
              canMonitorActions={canUseAllLegalWorkflows}
              canCalendarActions={canUseCalendarWorkflow}
              canStatusActions={canUseAllLegalWorkflows}
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
      <LegalGuide open={legalGuideOpen} onClose={() => setLegalGuideOpen(false)} />

      {/* ══ MODALS ══ */}
      <ParalegalSupportModal open={modal === "paralegal"} onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <SharedLawyerConsultModal open={modal === "lawyer"} onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <EndorseModal         open={modal === "endorse"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <MonitoringModal      open={modal === "monitor"}      onClose={closeModal} caseData={selectedCase} onSave={saveCase} actorName={actorName} />
      <UpdateStatusModal
        open={modal === "statusChange"}
        onClose={closeModal}
        caseData={selectedCase}
        onSubmit={submitForApproval}
        actorName={actorName}
        isAdmin={isAdmin}
        isLegal={isParalegal}
        allowedStatuses={LEGAL_CASE_STATUSES}
      />
      <ApprovalModal        open={modal === "approval"}     onClose={closeModal} caseData={selectedCase} onApprove={approveChange} onReject={rejectChange} />
      <AssignLegalModal     open={modal === "assignLegal"}  onClose={closeModal} caseData={selectedCase} legalPersonnels={legalPersonnels} onSave={saveCase} showToast={showToast} />
      <RemoveAssignedStaffDialog
        key={`remove-legal-staff-${(removeAssignedDialog || []).map((caseItem) => caseItem.id).join("-") || "closed"}`}
        open={Boolean(removeAssignedDialog)}
        title="Remove Assigned Staff"
        description={`Choose which legal personnel to remove from ${removeAssignedDialog?.length || 0} selected case${removeAssignedDialog?.length === 1 ? "" : "s"}.`}
        detail="Selected lawyers and paralegals will immediately lose access through these legal assignments."
        assignments={getRemovableLegalAssignments(removeAssignedDialog || [])}
        busy={removingAssigned}
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
      <SelectCaseModal open={modal === "selectStatus"}    onClose={closeModal} cases={canUseAllLegalWorkflows ? cases.filter((c) => !c.pendingApproval && (STATUS_TRANSITIONS[c.status]?.length > 0 || isAdmin)) : []} title="Select Case to Update Status" actionLabel="Update" onAction={(c) => open(c, "statusChange")} />
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
                      <td className={styles.truncateCell} title={c.pendingApproval.submittedBy || ""}>{c.pendingApproval.submittedBy}</td>
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
