"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiInfo,
} from "react-icons/fi";
import { IoIosArrowBack } from "react-icons/io";
import styles from "./ViewCase.module.css";
import InterviewTab from "./interview/InterviewTab";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEP = {
  1:  "For Verification",
  2:  "Undergoing Review",
  3:  "Verified - True",
  4:  "Verified - False",
  5:  "Under Case Evaluation",
  6:  "Case Filed",
  7:  "Investigation Ongoing",
  8:  "Hearing Ongoing",
  9:  "Dismissed",
  10: "Perpetrator Convicted",
};

const ALL_STATUSES = [
  "For Verification",
  "Undergoing Review",
  "Verified - True",
  "Verified - False",
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
  "Dismissed",
  "Perpetrator Convicted",
];

const STATUS_MODAL_MAP = {
  "Undergoing Review":     "undergReview",
  "Verified - True":       "verifiedTrue",
  "Verified - False":      "verifiedFalse",
  "Under Case Evaluation": "caseEval",
  "Case Filed":            "caseFiled",
  "Investigation Ongoing": "investigation",
  "Hearing Ongoing":       "hearing",
  "Dismissed":             "dismissed",
  "Perpetrator Convicted": "convicted",
};

const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

const VIOLENCE_TYPES = [
  "Sexual harassment",
  "Online sexual harassment",
  "Non-consensual sharing of intimate images/videos",
  "Sexual assault / unwanted sexual touching",
  "Rape / attempted rape",
  "Child sexual abuse",
  "Sexual exploitation / trafficking-related sexual abuse",
  "Stalking with sexual nature or intent",
  "Gender-based sexual harassment in institutions",
];

const OFFICERS    = ["Alexa Gagan", "Marco Santos", "Ryan Dela Paz", "Ben Mercado", "Camille Torres"];
const PARALEGALS  = ["Maria Reyes", "John Valdez", "Ana Bautista", "Carlo Dizon"];

// ─── Descriptions for complainants (from sasha-explain.md) ───────────────────

const CASE_TYPE_DESCRIPTIONS = {
  "Sexual harassment":
    "This covers unwanted sexual remarks, advances, requests, or conduct that happens in person.",
  "Online sexual harassment":
    "This covers sexual harassment that takes place through chat, social media, email, calls, or any digital platform.",
  "Non-consensual sharing of intimate images/videos":
    "This includes sharing or threatening to share private intimate images or videos without the person's consent.",
  "Sexual assault / unwanted sexual touching":
    "This covers unwanted physical sexual contact such as groping, forced kissing, or coercive contact.",
  "Rape / attempted rape":
    "This includes forced or attempted forced sexual penetration.",
  "Child sexual abuse":
    "This covers any sexual act, grooming, exploitation, or coercion involving a minor.",
  "Sexual exploitation / trafficking-related sexual abuse":
    "This includes abuse tied to exchange, coercion, or exploitation involving power, money, or favors.",
  "Stalking with sexual nature or intent":
    "This covers persistent following, monitoring, threats, or repeated unwanted contact with sexual overtones.",
  "Gender-based sexual harassment in institutions":
    "This covers harassment in school, workplace, organization, training, or Scouting-related settings.",
};

const STATUS_EXPLANATIONS = {
  "For Verification": {
    title: "Your report has been received",
    description:
      "SASHA has received your report. An intake officer has logged your case and is checking the basic details — such as your identity, the nature of the incident, urgency, and available evidence. Your case is in the queue for initial screening. Your privacy and confidentiality are a priority at this stage.",
    icon: "📥",
    color: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  },
  "Undergoing Review": {
    title: "Your case is being reviewed",
    description:
      "A SASHA case officer is reviewing your report to determine whether it falls within SASHA's scope. They are checking for duplicate reports, identifying any immediate safety concerns, and noting any information that may still be needed. You may be contacted to clarify certain details.",
    icon: "🔍",
    color: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  },
  "Verified - True": {
    title: "Your report has been verified",
    description:
      "Your report has been found sufficiently credible and falls within SASHA's scope. This means SASHA can proceed with providing you support, referral, or further case development. This does not mean a legal finding has been made — it simply means SASHA has accepted your case for action.",
    icon: "✅",
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
  "Verified - False": {
    title: "Your report could not be verified",
    description:
      "After careful review, SASHA was unable to proceed with your case. This may be because the report was outside SASHA's scope, could not be verified after reasonable efforts, was a duplicate, or was clearly submitted in error. This does not mean you are being disbelieved — your records remain confidential and controlled. If you have concerns, you may reach out to SASHA.",
    icon: "ℹ️",
    color: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  },
  "Under Case Evaluation": {
    title: "Your case is being evaluated",
    description:
      "SASHA's team is assessing your full case file to determine the best course of action. They are identifying the most appropriate pathway — such as referral to DSWD, PNP, a school or workplace mechanism, or legal proceedings. You will be informed of the options available to you.",
    icon: "📋",
    color: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  },
  "Case Filed": {
    title: "A formal complaint has been filed",
    description:
      "A formal complaint has been lodged with the appropriate body on your behalf. This could be with a school or workplace committee (CODI), the PNP Women and Children Protection Desk, DSWD, BSP/GSP mechanism, or a court. SASHA has recorded all filing details for monitoring.",
    icon: "📄",
    color: { bg: "#e0f2fe", color: "#0c4a6e", border: "#7dd3fc" },
  },
  "Investigation Ongoing": {
    title: "An investigation is underway",
    description:
      "The institution where your complaint was filed is now taking action. Statements, documents, and evidence may be gathered. SASHA is monitoring the progress of the investigation and checking that the process is fair and that you remain safe.",
    icon: "🔎",
    color: { bg: "#cffafe", color: "#155e75", border: "#67e8f9" },
  },
  "Hearing Ongoing": {
    title: "A formal hearing is in progress",
    description:
      "Your case has reached a formal hearing, conference, or adjudication stage — this could be in a school/workplace process, an administrative inquiry, or a court. SASHA is monitoring the schedule and your support needs throughout this process.",
    icon: "⚖️",
    color: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  },
  "Dismissed": {
    title: "Your case has been closed by the institution",
    description:
      "The institution handling your case has closed it without a finding of liability. This may have been due to lack of jurisdiction, insufficient evidence, a procedural issue, or withdrawal of the complaint. SASHA has documented the reason and is assessing whether any other remedy remains available to you. You may reach out to SASHA if you need further guidance.",
    icon: "📁",
    color: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  },
  "Perpetrator Convicted": {
    title: "A decision has been reached",
    description:
      "A final decision has been made establishing liability in the relevant forum. This may be a criminal conviction, an administrative finding of guilt, or a civil liability finding. SASHA has recorded the outcome and any sanctions, and will assess what continuing support you may need.",
    icon: "🏛️",
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
};

// ─── Shared subcomponents ─────────────────────────────────────────────────────

const STATUS_COLORS = {
  "For Verification":      { bg: "#fef3c7", color: "#92400e" },
  "Undergoing Review":     { bg: "#dbeafe", color: "#1e40af" },
  "Verified - True":       { bg: "#d1fae5", color: "#065f46" },
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" },
  "Under Case Evaluation": { bg: "#ede9fe", color: "#5b21b6" },
  "Case Filed":            { bg: "#e0f2fe", color: "#0c4a6e" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
};

function StatusBadge({ status }) {
  const { bg, color } = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 999,
      fontSize: "0.78rem", fontWeight: 700,
      background: bg, color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

// Modal shell (same as CaseManagement)
function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        style={wide ? { maxWidth: 700 } : {}}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
      >
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
function FInput({ error, ...props }) {
  return <input className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props} />;
}
function FTextarea({ error, ...props }) {
  return <textarea className={`${styles.formInput} ${error ? styles.inputError : ""}`} rows={3} style={{ resize: "vertical" }} {...props} />;
}
function FSelect({ error, children, ...props }) {
  return (
    <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>
      {children}
    </select>
  );
}

// ─── Status Change Modals (imported from CaseManagement pattern) ──────────────

function StatusChangeShell({ open, onClose, title, caseData, onSubmitForApproval, children, canSubmit = true }) {
  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className={styles.approvalNotice}>
        <FiClock style={{ flexShrink: 0 }} />
        <span>This change will be submitted for <strong>Admin approval</strong> before taking effect. The complainant will be informed after approval.</span>
      </div>
      {children}
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={onSubmitForApproval} disabled={!canSubmit}>
          Submit for Approval
        </button>
      </div>
    </Modal>
  );
}

function UndergReviewModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ duplicateChecked: "", safetyIssues: "", missingInfo: "", survivorContacted: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ duplicateChecked: "", safetyIssues: "", missingInfo: "", survivorContacted: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.duplicateChecked) e.duplicateChecked = "Required.";
    if (!form.safetyIssues) e.safetyIssues = "Required.";
    if (!form.survivorContacted) e.survivorContacted = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Undergoing Review", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Duplicate checked: ${form.duplicateChecked}. Safety issues: ${form.safetyIssues}. Survivor contacted: ${form.survivorContacted}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Undergoing Review" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The intake team will review whether this report is within SASHA's scope. Please fill in the initial screening details.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Duplicate report checked?" required error={errors.duplicateChecked}>
          <FSelect value={form.duplicateChecked} onChange={set("duplicateChecked")} error={errors.duplicateChecked}>
            <option value="">— Select —</option>
            <option>Yes — No duplicates found</option>
            <option>Yes — Possible duplicate identified (noted below)</option>
            <option>Not yet checked</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Immediate safety issues identified?" required error={errors.safetyIssues}>
          <FSelect value={form.safetyIssues} onChange={set("safetyIssues")} error={errors.safetyIssues}>
            <option value="">— Select —</option>
            <option>No immediate safety issues</option>
            <option>Possible safety concern (noted below)</option>
            <option>Urgent — survivor may be in immediate danger</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Missing information identified" hint="List any incomplete or missing details in the report.">
          <FTextarea placeholder="e.g. Respondent identity unknown, incident date unclear…" value={form.missingInfo} onChange={set("missingInfo")} />
        </FormGroup>
        <FormGroup label="Survivor contacted for clarification?" required error={errors.survivorContacted}>
          <FSelect value={form.survivorContacted} onChange={set("survivorContacted")} error={errors.survivorContacted}>
            <option value="">— Select —</option>
            <option>Yes — clarification obtained</option>
            <option>Yes — awaiting response</option>
            <option>Not yet — pending</option>
            <option>Not applicable</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Additional notes / observations">
          <FTextarea placeholder="Any other relevant observations from the review…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function VerifiedTrueModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ credibilityBasis: "", scopeConfirmed: "", supportAction: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ credibilityBasis: "", scopeConfirmed: "", supportAction: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.credibilityBasis) e.credibilityBasis = "Required.";
    if (!form.scopeConfirmed) e.scopeConfirmed = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Verified - True", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Report verified as credible. Basis: ${form.credibilityBasis}. Scope confirmed: ${form.scopeConfirmed}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Verify Case: Verified — True" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The report has been found sufficiently credible and within scope. This does <strong>not</strong> mean legal guilt has been established — it means the report passed SASHA's verification threshold.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Basis for credibility determination" required error={errors.credibilityBasis}>
          <FTextarea placeholder="e.g. Consistent account, corroborating evidence, complainant identity verified…" value={form.credibilityBasis} onChange={set("credibilityBasis")} error={errors.credibilityBasis} />
        </FormGroup>
        <FormGroup label="Report confirmed within SASHA's scope?" required error={errors.scopeConfirmed}>
          <FSelect value={form.scopeConfirmed} onChange={set("scopeConfirmed")} error={errors.scopeConfirmed}>
            <option value="">— Select —</option>
            <option>Yes — fully within scope</option>
            <option>Partially — some aspects require referral</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Recommended next action" hint="E.g. Proceed to case evaluation, immediate referral, etc.">
          <FTextarea placeholder="Recommended next steps for this case…" value={form.supportAction} onChange={set("supportAction")} />
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any other notes for admin review…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function VerifiedFalseModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ reason: "", additionalReason: "", recordsHandled: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ reason: "", additionalReason: "", recordsHandled: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.reason) e.reason = "Required.";
    if (!form.recordsHandled) e.recordsHandled = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Verified - False", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Verified False. Reason: ${form.reason}. ${form.additionalReason} Records: ${form.recordsHandled}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Verify Case: Verified — False" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <div className={styles.warningNotice}>
        <FiAlertTriangle />
        <span>This status should be applied <strong>carefully</strong>. It does not discredit survivors — use it only for cases outside scope, clearly erroneous, duplicate, or unverifiable after reasonable effort. Records remain confidential and controlled.</span>
      </div>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Primary reason" required error={errors.reason}>
          <FSelect value={form.reason} onChange={set("reason")} error={errors.reason}>
            <option value="">— Select reason —</option>
            <option>Outside SASHA's scope</option>
            <option>Duplicate report (already filed under another case)</option>
            <option>Unverifiable after reasonable effort</option>
            <option>Clearly erroneous or mistaken submission</option>
            <option>Complainant withdrew and cannot be reached</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Detailed explanation" hint="Provide factual basis — avoid language that could discredit the survivor.">
          <FTextarea placeholder="Explain why this determination was made…" value={form.additionalReason} onChange={set("additionalReason")} />
        </FormGroup>
        <FormGroup label="Records handling confirmed?" required error={errors.recordsHandled}>
          <FSelect value={form.recordsHandled} onChange={set("recordsHandled")} error={errors.recordsHandled}>
            <option value="">— Select —</option>
            <option>Yes — records retained as controlled internal document</option>
            <option>Yes — records flagged for confidential archiving</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any other context for admin review…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function CaseEvaluationModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ pathways: [], evidenceGaps: "", survivorInformed: "", legalRisks: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ pathways: [], evidenceGaps: "", survivorInformed: "", legalRisks: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const togglePathway = (p) => setForm((prev) => ({ ...prev, pathways: prev.pathways.includes(p) ? prev.pathways.filter((x) => x !== p) : [...prev.pathways, p] }));
  function validate() {
    const e = {};
    if (form.pathways.length === 0) e.pathways = "Select at least one pathway.";
    if (!form.survivorInformed) e.survivorInformed = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Under Case Evaluation", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Case evaluation started. Pathways assessed: ${form.pathways.join(", ")}. Survivor informed: ${form.survivorInformed}. ${form.notes}`, formData: form });
    onClose();
  }
  const PATHWAYS = ["Internal referral", "CODI (school/workplace)", "DSWD", "PNP Women and Children Protection Desk", "BSP/GSP mechanism", "Prosecutor / Court"];
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Under Case Evaluation" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The full case file is being assessed to determine the best pathway for the survivor.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Recommended pathways (select all that apply)" required error={errors.pathways}>
          <div className={styles.checkGroup}>
            {PATHWAYS.map((p) => (
              <label key={p} className={styles.checkLabel}>
                <input type="checkbox" checked={form.pathways.includes(p)} onChange={() => togglePathway(p)} className={styles.checkInput} />
                {p}
              </label>
            ))}
          </div>
          {errors.pathways && <span className={styles.errorMsg}>{errors.pathways}</span>}
        </FormGroup>
        <FormGroup label="Evidence gaps identified" hint="List any missing evidence or documentation.">
          <FTextarea placeholder="e.g. No sworn statement yet, no medico-legal report…" value={form.evidenceGaps} onChange={set("evidenceGaps")} />
        </FormGroup>
        <FormGroup label="Legal risks / considerations" hint="Note any legal complications or risks identified.">
          <FTextarea placeholder="e.g. Potential prescription period issue, jurisdictional concern…" value={form.legalRisks} onChange={set("legalRisks")} />
        </FormGroup>
        <FormGroup label="Survivor informed of options?" required error={errors.survivorInformed}>
          <FSelect value={form.survivorInformed} onChange={set("survivorInformed")} error={errors.survivorInformed}>
            <option value="">— Select —</option>
            <option>Yes — survivor fully informed and consents to next steps</option>
            <option>Yes — survivor informed, awaiting decision</option>
            <option>Pending — schedule to inform survivor</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Other observations…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function CaseFiledModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ filedWith: "", filingDate: "", receivingOfficer: "", referenceNumber: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ filedWith: "", filingDate: "", receivingOfficer: "", referenceNumber: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.filedWith) e.filedWith = "Required.";
    if (!form.filingDate) e.filingDate = "Required.";
    if (!form.receivingOfficer.trim()) e.receivingOfficer = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Case Filed", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Complaint filed with ${form.filedWith} on ${form.filingDate}. Receiving officer: ${form.receivingOfficer}. Reference: ${form.referenceNumber || "N/A"}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Case Filed" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>A formal complaint has been lodged with the appropriate body. Record all filing details for monitoring purposes.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Filed with (institution)" required error={errors.filedWith}>
          <FSelect value={form.filedWith} onChange={set("filedWith")} error={errors.filedWith}>
            <option value="">— Select institution —</option>
            {ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
          </FSelect>
        </FormGroup>
        <FormGroup label="Filing date" required error={errors.filingDate}>
          <FInput type="date" value={form.filingDate} onChange={set("filingDate")} error={errors.filingDate} />
        </FormGroup>
        <FormGroup label="Receiving officer / personnel" required error={errors.receivingOfficer}>
          <FInput placeholder="Name and designation of receiving officer" value={form.receivingOfficer} onChange={set("receivingOfficer")} error={errors.receivingOfficer} />
        </FormGroup>
        <FormGroup label="Reference / docket number" hint="Leave blank if not yet assigned.">
          <FInput placeholder="e.g. CODI-2026-042" value={form.referenceNumber} onChange={set("referenceNumber")} />
        </FormGroup>
        <FormGroup label="Additional notes / context">
          <FTextarea placeholder="Any other filing context or observations…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function InvestigationModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ investigationUpdate: "", survivorSafety: "", proceduralFairness: "", nextFollowUp: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ investigationUpdate: "", survivorSafety: "", proceduralFairness: "", nextFollowUp: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.investigationUpdate.trim()) e.investigationUpdate = "Required.";
    if (!form.survivorSafety) e.survivorSafety = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Investigation Ongoing", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Investigation ongoing. Update: ${form.investigationUpdate}. Survivor safety: ${form.survivorSafety}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Investigation Ongoing" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The receiving institution is acting on the complaint. SASHA monitors progress, survivor safety, and procedural fairness.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Investigation status update" required error={errors.investigationUpdate}>
          <FTextarea placeholder="What is the receiving institution currently doing?" value={form.investigationUpdate} onChange={set("investigationUpdate")} error={errors.investigationUpdate} />
        </FormGroup>
        <FormGroup label="Survivor safety assessment" required error={errors.survivorSafety}>
          <FSelect value={form.survivorSafety} onChange={set("survivorSafety")} error={errors.survivorSafety}>
            <option value="">— Select —</option>
            <option>Safe — no immediate risk identified</option>
            <option>Concern noted — monitoring ongoing</option>
            <option>Urgent concern — immediate action needed</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Procedural fairness observed?">
          <FSelect value={form.proceduralFairness} onChange={set("proceduralFairness")}>
            <option value="">— Select —</option>
            <option>Yes — process appears fair and proper</option>
            <option>Concern noted — possible procedural issue</option>
            <option>Unknown — monitoring</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Next follow-up date">
          <FInput type="date" value={form.nextFollowUp} onChange={set("nextFollowUp")} />
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any other monitoring observations…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function HearingModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ hearingType: "", nextHearingDate: "", attendanceNeeds: "", survivorSupport: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ hearingType: "", nextHearingDate: "", attendanceNeeds: "", survivorSupport: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.hearingType) e.hearingType = "Required.";
    if (!form.nextHearingDate) e.nextHearingDate = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Hearing Ongoing", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Hearing started. Type: ${form.hearingType}. Next date: ${form.nextHearingDate}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Hearing Ongoing" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The case has reached a formal hearing, conference, or adjudication stage.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Type of hearing / proceeding" required error={errors.hearingType}>
          <FSelect value={form.hearingType} onChange={set("hearingType")} error={errors.hearingType}>
            <option value="">— Select —</option>
            <option>CODI hearing / fact-finding</option>
            <option>Administrative inquiry</option>
            <option>Court hearing</option>
            <option>Mediation / conference</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Next scheduled hearing date" required error={errors.nextHearingDate}>
          <FInput type="date" value={form.nextHearingDate} onChange={set("nextHearingDate")} error={errors.nextHearingDate} />
        </FormGroup>
        <FormGroup label="Attendance requirements">
          <FTextarea placeholder="e.g. Survivor's representative, paralegal support…" value={form.attendanceNeeds} onChange={set("attendanceNeeds")} />
        </FormGroup>
        <FormGroup label="Survivor support needs identified">
          <FTextarea placeholder="e.g. Psychological support, escort, translation assistance…" value={form.survivorSupport} onChange={set("survivorSupport")} />
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any postponements, schedule changes, or observations…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function DismissedModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ dismissalReason: "", dismissingBody: "", remainingRemedies: "", survivorNotified: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ dismissalReason: "", dismissingBody: "", remainingRemedies: "", survivorNotified: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.dismissalReason) e.dismissalReason = "Required.";
    if (!form.dismissingBody.trim()) e.dismissingBody = "Required.";
    if (!form.survivorNotified) e.survivorNotified = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Dismissed", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Dismissed by ${form.dismissingBody}. Reason: ${form.dismissalReason}. Remedies: ${form.remainingRemedies || "None identified"}. Survivor notified: ${form.survivorNotified}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Dismissed" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>The case has been closed by the receiving body. SASHA documents the reason and assesses whether any other remedy remains available.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Dismissing body / institution" required error={errors.dismissingBody}>
          <FInput placeholder="e.g. RTC Branch 42, CODI Committee, DSWD" value={form.dismissingBody} onChange={set("dismissingBody")} error={errors.dismissingBody} />
        </FormGroup>
        <FormGroup label="Reason for dismissal" required error={errors.dismissalReason}>
          <FSelect value={form.dismissalReason} onChange={set("dismissalReason")} error={errors.dismissalReason}>
            <option value="">— Select reason —</option>
            <option>Lack of jurisdiction</option>
            <option>Insufficient evidence</option>
            <option>Withdrawal of complaint</option>
            <option>Procedural defects</option>
            <option>Failure to prosecute</option>
            <option>Other (see notes)</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Other available remedies" hint="Are there other legal or institutional avenues still open?">
          <FTextarea placeholder="e.g. Can re-file with another institution, civil action still available…" value={form.remainingRemedies} onChange={set("remainingRemedies")} />
        </FormGroup>
        <FormGroup label="Survivor notified of outcome?" required error={errors.survivorNotified}>
          <FSelect value={form.survivorNotified} onChange={set("survivorNotified")} error={errors.survivorNotified}>
            <option value="">— Select —</option>
            <option>Yes — survivor informed and counseled</option>
            <option>Yes — survivor informed, no further support needed</option>
            <option>Pending — contact scheduled</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any other context…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

function ConvictedModal({ open, onClose, caseData, onSubmit, actorName }) {
  const [form, setForm] = useState({ forum: "", outcomeType: "", sanctions: "", survivorSupportNeeds: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ forum: "", outcomeType: "", sanctions: "", survivorSupportNeeds: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function validate() {
    const e = {};
    if (!form.forum.trim()) e.forum = "Required.";
    if (!form.outcomeType) e.outcomeType = "Required.";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Perpetrator Convicted", { submittedBy: actorName, date: new Date().toLocaleDateString(), notes: `Final decision by ${form.forum}. Outcome: ${form.outcomeType}. Sanctions: ${form.sanctions || "None recorded"}. ${form.notes}`, formData: form });
    onClose();
  }
  return (
    <StatusChangeShell open={open} onClose={onClose} title="Move to: Perpetrator Convicted" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>A final decision has been reached establishing liability. Record the outcome, sanctions, and any continuing survivor support needs.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData?.caseId} disabled /></FormGroup>
        <FormGroup label="Deciding forum / institution" required error={errors.forum}>
          <FInput placeholder="e.g. RTC Branch 42, CODI Committee, Administrative Body" value={form.forum} onChange={set("forum")} error={errors.forum} />
        </FormGroup>
        <FormGroup label="Nature of conviction / finding" required error={errors.outcomeType}>
          <FSelect value={form.outcomeType} onChange={set("outcomeType")} error={errors.outcomeType}>
            <option value="">— Select —</option>
            <option>Criminal conviction</option>
            <option>Administrative finding of guilt</option>
            <option>Civil liability established</option>
            <option>Mixed — multiple findings</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Sanctions imposed" hint="E.g. imprisonment, dismissal from work, expulsion, restraining order.">
          <FTextarea placeholder="List all sanctions or penalties…" value={form.sanctions} onChange={set("sanctions")} />
        </FormGroup>
        <FormGroup label="Continuing survivor support needs">
          <FTextarea placeholder="e.g. Psychological support, relocation assistance, follow-up counseling…" value={form.survivorSupportNeeds} onChange={set("survivorSupportNeeds")} />
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea placeholder="Any other context…" value={form.notes} onChange={set("notes")} />
        </FormGroup>
      </div>
    </StatusChangeShell>
  );
}

// ─── NLP Analysis Tab (staff only) ───────────────────────────────────────────

function NLPAnalysisTab({ caseReportId, isAdmin }) {
  const [nlpData, setNlpData]     = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus, setNlpStatus]   = useState(null);

  useEffect(() => {
    if (!caseReportId) return;
    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/${caseReportId}/nlp`, { credentials: "include" });
        if (res.status === 404) { setNlpStatus("processing"); return; }
        if (!res.ok) { setNlpStatus("error"); return; }
        const json = await res.json();
        setNlpData(json.data || json);
      } catch {
        setNlpStatus("error");
      } finally {
        setNlpLoading(false);
      }
    };
    fetchNlp();
  }, [caseReportId]);

  const CategoryBadge = ({ label }) => (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#e1f5f5", color: "#037F81", marginRight: 6, marginBottom: 4 }}>{label}</span>
  );
  const CaseTypeBadge = ({ label }) => (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#f3e8ff", color: "#6b21a8", marginRight: 6, marginBottom: 4 }}>{label}</span>
  );

  return (
    <div>
      {/* AI disclaimer */}
      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#5b21b6", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>🤖</span>
        <span>This analysis is <strong>AI-generated</strong> and is intended as a guide only. All decisions remain with the case officer and are subject to admin approval.</span>
      </div>

      {nlpLoading && <p style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center", padding: "2rem" }}>Loading analysis...</p>}

      {nlpStatus === "processing" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#92400e" }}>
          <FiClock style={{ flexShrink: 0 }} />
          NLP analysis is still processing. Refresh in a moment.
        </div>
      )}

      {nlpStatus === "error" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#991b1b" }}>
          <FiAlertCircle style={{ flexShrink: 0 }} />
          Could not load NLP analysis. Make sure the NLP service is running.
        </div>
      )}

      {nlpData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {nlpData.summary && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>📄 Incident Summary</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.summary}</p>
            </div>
          )}

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>🏷️ Suggested Classification</h4>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary Categories</p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.primary_categories?.length > 0 ? nlpData.primary_categories.map((c) => <CategoryBadge key={c} label={c} />) : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Possible Case Types</p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.case_types?.length > 0 ? nlpData.case_types.map((t) => <CaseTypeBadge key={t} label={t} />) : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>}
            </div>
            {nlpData.classification_notes && (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.classification_notes}</p>
              </>
            )}
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>📋 Suggested Next Steps</h4>
            {nlpData.recommended_steps?.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 6 }}>
                {nlpData.recommended_steps.map((step, i) => <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{step}</li>)}
              </ol>
            ) : <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No steps suggested.</p>}
          </div>

          <div style={{ background: nlpData.referral_suggested ? "#fffbeb" : "#f0fdf4", border: `1px solid ${nlpData.referral_suggested ? "#fcd34d" : "#86efac"}`, borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: nlpData.referral_suggested ? "#92400e" : "#166534" }}>
              {nlpData.referral_suggested ? "⚠️ Referral may be appropriate" : "✅ May be resolvable internally"}
            </h4>
            {nlpData.referral_notes && <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.referral_notes}</p>}
          </div>

          {isAdmin && (
            <details style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>Technical Details</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, paddingLeft: 8 }}>
                <span><strong>Model:</strong> {nlpData.model_used}</span>
                <span><strong>Language detected:</strong> {nlpData.language_detected}</span>
                <span><strong>PII detected and masked:</strong> {nlpData.detected_pii?.join(", ") || "None"}</span>
                <span><strong>Anonymized text:</strong></span>
                <p style={{ margin: "4px 0 0", background: "#f3f4f6", padding: "8px 10px", borderRadius: 6, lineHeight: 1.6 }}>{nlpData.anonymized_text}</p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Case Management Tab (staff only) ────────────────────────────────────────

function CaseManagementTab({ caseData, setCaseData, isAdmin, isCaseOfficer, isLegal, actorName, showToast }) {
  const [modal, setModal] = useState(null);

  // Determine available status transitions
  function getAvailableTransitions() {
    const curr = caseData.status;
    if (isAdmin) return ALL_STATUSES.filter((s) => s !== curr);
    if (isCaseOfficer) {
      const map = {
        "For Verification":  ["Undergoing Review"],
        "Undergoing Review":  ["Verified - True", "Verified - False"],
        "Verified - True":    ["Under Case Evaluation"],
        "Verified - False":   [],
      };
      return map[curr] || [];
    }
    if (isLegal) {
      const map = {
        "Under Case Evaluation": ["Case Filed"],
        "Case Filed":            ["Investigation Ongoing"],
        "Investigation Ongoing": ["Hearing Ongoing", "Dismissed"],
        "Hearing Ongoing":       ["Dismissed", "Perpetrator Convicted"],
      };
      return map[curr] || [];
    }
    return [];
  }

  function submitForApproval(proposedStatus, changeDetails) {
    setCaseData((prev) => ({
      ...prev,
      pendingApproval: { proposedStatus, ...changeDetails },
    }));
    showToast(`Status change for ${caseData.caseId} submitted for admin approval.`);
    setModal(null);
  }

  const transitions = getAvailableTransitions();

  // Inline state for assign paralegal / referral modals
  const [paralegalVal, setParalegalVal] = useState(caseData.assignedParalegal || "");
  const [caseTypeVal, setCaseTypeVal] = useState(
    Array.isArray(caseData.caseType) ? caseData.caseType : caseData.caseType ? [caseData.caseType] : []
  );
  const [primaryCatVal, setPrimaryCatVal] = useState(caseData.primaryCategory || "");
  const [alsoCatVal, setAlsoCatVal] = useState(
    Array.isArray(caseData.alsoInvolves) ? caseData.alsoInvolves : []
  );
  const [referralVal, setReferralVal]   = useState(caseData.referralBody || "");
  const [referralReq, setReferralReq]   = useState(caseData.referralRequired ? "yes" : "no");
  const [endorseBody, setEndorseBody]   = useState("");
  const [endorseNotes, setEndorseNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState(caseData.internalNotes || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Pending approval banner */}
      {caseData.pendingApproval && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde047", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#92400e" }}>
          <FiClock style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Pending Admin Approval:</strong> A status change to <strong>{caseData.pendingApproval.proposedStatus}</strong> has been submitted by {caseData.pendingApproval.submittedBy} and is awaiting admin review.
          </div>
        </div>
      )}

      {/* ── Current Assignment / Classification ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>📋 Current Case Assignment</h2>
        <div className={styles.detailGrid}>
          {[
            ["Assigned Case Officer", caseData.assignedOfficer || "—"],
            ["Assigned Paralegal",    caseData.assignedParalegal || (caseData.status === "Verified - True" ? "Pending assignment" : "N/A")],
            ["Case Type",        Array.isArray(caseData.caseType) ? caseData.caseType.join(", ") : caseData.caseType || "Not set"],
            ["Primary Category", caseData.primaryCategory
              ? caseData.alsoInvolves?.length
                ? `${caseData.primaryCategory} (also: ${caseData.alsoInvolves.join(", ")})`
                : caseData.primaryCategory
              : "Not set"],
            ["Referral Required",     caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body",         caseData.referralBody || "—"],
            ["Endorsement Status",    caseData.endorsementStatus || "Not endorsed"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Action Buttons ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>⚡ Actions</h2>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>

          {/* Update Status */}
          {transitions.length > 0 && !caseData.pendingApproval && (
            <button onClick={() => setModal("statusRouter")} style={btnStyle("#3b82f6")}>
              📊 Update Status
            </button>
          )}

          {/* Set Case Type */}
          <button onClick={() => setModal("setCaseType")} style={btnStyle("#8b5cf6")}>
            🏷️ Set Case Type
          </button>

          {/* Set Primary Category */}
          <button onClick={() => setModal("setCategory")} style={btnStyle("#ec4899")}>
            📌 Set Category
          </button>

          {/* Set Referral */}
          <button onClick={() => setModal("setReferral")} style={btnStyle("#f59e0b")}>
            🔀 Referral
          </button>

          {/* Assign Paralegal — only when Verified - True */}
          {caseData.status === "Verified - True" && (
            <button onClick={() => setModal("assignParalegal")} style={btnStyle("#10b981")}>
              👤 Assign Paralegal
            </button>
          )}

          {/* Endorse Case */}
          <button onClick={() => setModal("endorse")} style={btnStyle("#0ea5e9")}>
            📤 Endorse
          </button>
        </div>
      </section>

      {/* ── Internal Notes ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>🗒️ Internal Notes / Action Log</h2>
        <textarea
          placeholder="Add notes about case management actions, decisions, or observations..."
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", minHeight: "100px", outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            onClick={() => { setCaseData((p) => ({ ...p, internalNotes })); showToast("Notes saved."); }}
            className={styles.btnPrimary}
          >
            Save Notes
          </button>
        </div>
      </section>

      {/* ── Status History ── */}
      <StatusHistorySection caseData={caseData} />

      {/* ══ Modals ══ */}

      {/* Status Router */}
      {modal === "statusRouter" && (
        <Modal open onClose={() => setModal(null)} title={`Update Status — ${caseData.caseId}`} wide>
          <p className={styles.formDesc}>Current status: <StatusBadge status={caseData.status} /></p>
          <p className={styles.formDesc} style={{ marginTop: "0.5rem" }}>Select the next status. You will be asked to fill in required details for admin approval.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            {transitions.map((t) => {
              const s = STATUS_COLORS[t] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <button key={t}
                  style={{ padding: "0.5rem 1rem", borderRadius: 999, border: `1px solid ${s.color}44`, background: s.bg, color: s.color, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
                  onClick={() => { const m = STATUS_MODAL_MAP[t]; if (m) setModal(m); }}
                >
                  {t} →
                </button>
              );
            })}
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Status-specific modals */}
      <UndergReviewModal   open={modal === "undergReview"}  onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <VerifiedTrueModal   open={modal === "verifiedTrue"}  onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <VerifiedFalseModal  open={modal === "verifiedFalse"} onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <CaseEvaluationModal open={modal === "caseEval"}      onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <CaseFiledModal      open={modal === "caseFiled"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <InvestigationModal  open={modal === "investigation"} onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <HearingModal        open={modal === "hearing"}       onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <DismissedModal      open={modal === "dismissed"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <ConvictedModal      open={modal === "convicted"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />

      {/* Set Case Type */}
      <Modal open={modal === "setCaseType"} onClose={() => setModal(null)} title="Set Case Type" wide>
        <p className={styles.formDesc}>
          Check all case types that apply. More than one may be relevant.
        </p>
        <div className={styles.formGrid}>
          <FormGroup label="Case Type(s)" required>
            <div className={styles.checkGroup}>
              {VIOLENCE_TYPES.map((v) => (
                <label key={v} className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkInput}
                    checked={caseTypeVal.includes(v)}
                    onChange={() =>
                      setCaseTypeVal((prev) =>
                        prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                      )
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
            {caseTypeVal.length === 0 && (
              <span className={styles.errorMsg}>Select at least one case type.</span>
            )}
          </FormGroup>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button
            className={styles.btnPrimary}
            disabled={caseTypeVal.length === 0}
            onClick={() => {
              setCaseData((p) => ({ ...p, caseType: caseTypeVal }));
              showToast("Case type updated.");
              setModal(null);
            }}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Set Category */}
      <Modal open={modal === "setCategory"} onClose={() => setModal(null)} title="Set Category" wide>
        <p className={styles.formDesc}>
          Select the dominant medium of the incident as the primary category.
          If the case spans more than one medium, check the others under "Also involves".
        </p>
        <div className={styles.formGrid}>

          <FormGroup label="Primary Category" required hint="The dominant medium — pick one.">
            <FSelect
              value={primaryCatVal}
              onChange={(e) => {
                const selected = e.target.value;
                setPrimaryCatVal(selected);
                // Remove from "also involves" if it was checked there
                setAlsoCatVal((prev) => prev.filter((c) => c !== selected));
              }}
            >
              <option value="">— Select primary category —</option>
              <option value="Physical">Physical</option>
              <option value="Virtual">Virtual</option>
              <option value="Verbal">Verbal</option>
            </FSelect>
          </FormGroup>

          <FormGroup
            label="Also involves (optional)"
            hint="Check any other mediums this case spans — separate from the primary."
          >
            <div className={styles.checkGroup}>
              {["Physical", "Virtual", "Verbal"]
                .filter((c) => c !== primaryCatVal)
                .map((c) => (
                  <label key={c} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={alsoCatVal.includes(c)}
                      onChange={() =>
                        setAlsoCatVal((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
            </div>
            {!primaryCatVal && (
              <span className={styles.formHint}>Select a primary category first to enable this.</span>
            )}
          </FormGroup>

        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button
            className={styles.btnPrimary}
            disabled={!primaryCatVal}
            onClick={() => {
              setCaseData((p) => ({
                ...p,
                primaryCategory: primaryCatVal,
                alsoInvolves: alsoCatVal,
              }));
              showToast("Category updated.");
              setModal(null);
            }}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Set Referral */}
      <Modal open={modal === "setReferral"} onClose={() => setModal(null)} title="Set Referral Details">
        <div className={styles.formGrid}>
          <FormGroup label="Referral required?">
            <FSelect value={referralReq} onChange={(e) => setReferralReq(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </FSelect>
          </FormGroup>
          {referralReq === "yes" && (
            <FormGroup label="Referral Body" required>
              <FSelect value={referralVal} onChange={(e) => setReferralVal(e.target.value)}>
                <option value="">— Select body —</option>
                {ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
              </FSelect>
            </FormGroup>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button className={styles.btnPrimary} onClick={() => {
            setCaseData((p) => ({ ...p, referralRequired: referralReq === "yes", referralBody: referralReq === "yes" ? referralVal : null }));
            showToast("Referral details updated.");
            setModal(null);
          }}>Save</button>
        </div>
      </Modal>

      {/* Assign Paralegal */}
      <Modal open={modal === "assignParalegal"} onClose={() => setModal(null)} title="Assign Paralegal">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Assign Paralegal" required>
            <FSelect value={paralegalVal} onChange={(e) => setParalegalVal(e.target.value)}>
              <option value="">— Select paralegal —</option>
              {PARALEGALS.map((p) => <option key={p} value={p}>{p}</option>)}
            </FSelect>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button className={styles.btnPrimary} onClick={() => { setCaseData((p) => ({ ...p, assignedParalegal: paralegalVal })); showToast("Paralegal assigned."); setModal(null); }} disabled={!paralegalVal}>Assign</button>
        </div>
      </Modal>

      {/* Endorse */}
      <Modal open={modal === "endorse"} onClose={() => setModal(null)} title="Endorse Case">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Endorse to" required>
            <FSelect value={endorseBody} onChange={(e) => setEndorseBody(e.target.value)}>
              <option value="">— Select body —</option>
              {ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
            </FSelect>
          </FormGroup>
          <FormGroup label="Endorsement notes / reason">
            <FTextarea placeholder="Explain basis for endorsement and any supporting details…" value={endorseNotes} onChange={(e) => setEndorseNotes(e.target.value)} />
          </FormGroup>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button className={styles.btnPrimary} onClick={() => {
            setCaseData((p) => ({ ...p, endorsementStatus: `Endorsed to ${endorseBody}`, referralBody: endorseBody, referralRequired: true }));
            showToast(`Case endorsed to ${endorseBody}.`);
            setModal(null);
          }} disabled={!endorseBody}>Endorse</button>
        </div>
      </Modal>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: "white",
    padding: "0.45rem 1rem", borderRadius: "999px", border: "none",
    cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
    transition: "opacity 0.15s",
  };
}

// ─── Status History section (shared) ─────────────────────────────────────────

function StatusHistorySection({ caseData }) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <section className={styles.section}>
      <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? <FiChevronUp /> : <FiChevronDown />}
        {showHistory ? "Hide" : "Show"} Status History ({caseData.statusHistory?.length || 0} entries)
      </button>
      {showHistory && (
        <div className={styles.historyList}>
          {(caseData.statusHistory || []).map((h, i) => (
            <div key={i} className={styles.historyItem}>
              <div style={{ textAlign: "center" }}>
                <div className={styles.historyDot} />
                {i < (caseData.statusHistory?.length || 1) - 1 && (
                  <div style={{ width: 2, height: 40, background: "#e5e7eb", margin: "0 auto" }} />
                )}
              </div>
              <div style={{ paddingTop: 2 }}>
                <StatusBadge status={h.status} />
                <p className={styles.historyMeta}>{h.date} · {h.by}</p>
                {h.notes && <p className={styles.historyNotes}>{h.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Case Details Tab ─────────────────────────────────────────────────────────

function CaseDetailsTab({ caseData, isStaff }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Status explanation for complainants */}
      {!isStaff && caseData.status && STATUS_EXPLANATIONS[caseData.status] && (() => {
        const exp = STATUS_EXPLANATIONS[caseData.status];
        return (
          <section className={styles.section}>
            <div style={{ background: exp.color.bg, border: `1px solid ${exp.color.border}`, borderRadius: 12, padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: "1.5rem" }}>{exp.icon}</span>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: exp.color.color }}>{exp.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", lineHeight: 1.7 }}>{exp.description}</p>
            </div>
          </section>
        );
      })()}

      {/* Complainant Details */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>👤 Complainant Details</h2>
        <div className={styles.detailGrid}>
          {[
            ["Name",                    caseData.name],
            ["Age",                     caseData.age],
            ["Gender Identity",         caseData.genderIdentity],
            ["Email",                   caseData.email],
            ["Contact Number",          caseData.contactNumber],
            ["Willing for Interview?",  caseData.isWillingForInterview ? "Yes" : "No"],
            ["Anonymous Report?",       caseData.isAnonymous ? "Yes" : "No"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "—"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Incident Details */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>📍 Incident Details</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Location Type", caseData.incidentLocationType],
            ["Location",      caseData.incidentLocationDisplay],
            ["Date",          caseData.incidentDate],
            ["Time",          caseData.incidentTime],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "—"}</p>
            </div>
          ))}
        </div>
        <div>
          <p className={styles.detailKey}>Description</p>
          <p className={styles.descriptionVal}>{caseData.description}</p>
        </div>
      </section>

      {/* Perpetrator Information */}
      {caseData.perpetratorKnown && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>⚠️ Perpetrator Information</h2>
          <div className={styles.detailGrid}>
            {[
              ["Name",                         caseData.perpetratorName],
              ["Gender",                       caseData.perpetratorGender],
              ["Occupation",                   caseData.perpetratorOccupation],
              ["Relationship to Complainant",  caseData.perpetratorRelationship],
            ].map(([k, v]) => (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Witness Information */}
      {caseData.hasWitnesses && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>👥 Witness Information</h2>
          <div className={styles.detailGrid}>
            {[
              ["Witness Name",                 caseData.witnessName],
              ["Contact",                      caseData.witnessContact],
              ["Relationship to Complainant",  caseData.witnessRelationship],
            ].map(([k, v]) => (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional Context */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>ℹ️ Additional Context</h2>
        <div className={styles.detailGrid}>
          {[
            ["Reported to Anyone Else?", caseData.reportedToOthers ? "Yes" : "No"],
            ...(caseData.reportedToOthers && caseData.toldAnyoneWho ? [["Told To", caseData.toldAnyoneWho]] : []),
            ["Reported to Police?",      caseData.reportedToPolice ? "Yes" : "No"],
            ...(caseData.reportedToPolice && caseData.policeStation ? [["Police Station", caseData.policeStation]] : []),
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "—"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case Classification — visible to everyone, with explanations for complainants */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>🏷️ Case Classification</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Current Status",    <StatusBadge status={caseData.status} />],
            ["Case Type",         caseData.caseType || "Not yet classified"],
            ["Primary Category",  caseData.primaryCategory || "Not yet classified"],
            ["Referral Required", caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body",     caseData.referralBody || "—"],
            ["Assigned Officer",  caseData.assignedOfficer || "—"],
            ...(caseData.status === "Verified - True" || caseData.assignedParalegal
              ? [["Assigned Paralegal", caseData.assignedParalegal || "Pending assignment"]]
              : []),
            ["Endorsement",       caseData.endorsementStatus || "—"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "—"}</p>
            </div>
          ))}
        </div>

        {/* Explanations for complainants */}
        {!isStaff && caseData.caseType && CASE_TYPE_DESCRIPTIONS[caseData.caseType] && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "1rem 1.25rem", marginTop: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <FiInfo style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.82rem", fontWeight: 700, color: "#166534" }}>About this case type: {caseData.caseType}</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>{CASE_TYPE_DESCRIPTIONS[caseData.caseType]}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Status History — for complainants, use friendly language */}
      {!isStaff ? (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>📅 Your Case History</h2>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.6 }}>
            Below is a timeline of your case's progress. Each entry shows what status your case moved to, when it changed, and any notes from the SASHA team.
          </p>
          <StatusHistorySection caseData={caseData} />
        </section>
      ) : (
        <StatusHistorySection caseData={caseData} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VIEWCASE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewCase() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const caseId    = searchParams.get("caseId");
  const fromParam = searchParams.get("from");

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [user, setUser]         = useState({ role: null });
  const [userLoaded, setUserLoaded] = useState(false);
  const [toast, setToast]       = useState(null);

  const isAdmin      = user.role?.toLowerCase() === "admin";
  const isCaseOfficer = user.role?.toLowerCase() === "case officer" || user.role?.toLowerCase() === "case_officer";
  const isLegal      = user.role?.toLowerCase() === "legal personnel" || user.role?.toLowerCase() === "legal_personnel";
  const isStaff      = isAdmin || isCaseOfficer || isLegal;

  const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Officer";

  const backRoute = isStaff
    ? "/cases"
    : fromParam === "dashboard" ? "/dashboard" : "/cases";
  const backLabel = isStaff
    ? "Back to Case Management"
    : fromParam === "dashboard" ? "Back to Dashboard" : "Back to My Reports";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const stored = JSON.parse(userCookie);
        setUser({ role: stored.role_name, firstName: stored.first_name, lastName: stored.last_name });
      } catch (_) {}
    }
    setUserLoaded(true);
  }, []);

  // Set active tab from search params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!caseId) { setError("No case ID provided"); setLoading(false); return; }
    const fetchCase = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_reports/${caseId}`, { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Case not found");
        }
        const { data } = await res.json();
        const caseYear = new Date(data.created_at).getFullYear();
        setCaseData({
          id:                   data.case_report_id,
          caseId:               `${caseYear}-` + String(data.case_report_id).padStart(3, "0"),
          reporterId:           String(data.complainant_id),
          region:               data.incident_province || data.incident_city || "—",
          status:               STATUS_STEP[data.case_status_id] || "For Verification",
          assignedOfficer:      data.assigned_officer || null,
          dateSubmitted:        new Date(data.created_at).toLocaleDateString("en-PH"),
          description:          data.incident_description || "—",
          incidentLocationType: data.incident_location_type || null,
          incidentCity:         data.incident_city,
          incidentLocation:     data.incident_location,
          incidentLocationDisplay: data.incident_location_type === "Online"
            ? data.incident_location || "Online"
            : data.incident_location_type === "Physical Location" ? [data.incident_location, data.incident_city, "NCR"].filter(Boolean).join(", ") : data.incident_city || "—",
          incidentDate:            data.incident_date,
          incidentTime:            data.incident_time,
          perpetratorKnown:        data.is_perpetrator_known,
          perpetratorName:         data.perpetrator_name,
          perpetratorGender:       data.perpetrator_gender,
          perpetratorOccupation:   data.perpetrator_occupation,
          perpetratorRelationship: data.perpetrator_relationship,
          hasWitnesses:            data.has_witnesses,
          witnessName:             data.witness_name,
          witnessContact:          data.witness_contact,
          witnessRelationship:     data.witness_relationship,
          reportedToOthers:        data.reported_to_others,
          toldAnyoneWho:           data.told_anyone_who,
          reportedToPolice:        data.reported_to_police,
          policeStation:           data.police_station,
          isAnonymous:             data.is_anonymous,
          isWillingForInterview:   data.is_willing_for_interview,
          name:                    data.name,
          age:                     data.age,
          genderIdentity:          data.gender_identity,
          email:                   data.email,
          contactNumber:           data.contact_number,
          caseType:                data.case_type || null,
          primaryCategory:         data.primary_category || null,
          referralRequired:        data.referral_required || false,
          referralBody:            data.referral_body || null,
          assignedParalegal:       data.assigned_paralegal || null,
          endorsementStatus:       data.endorsement_status || null,
          internalNotes:           data.internal_notes || null,
          pendingApproval:         null,
          statusHistory: [
            {
              status: STATUS_STEP[data.case_status_id] || "For Verification",
              date:   new Date(data.created_at).toLocaleDateString("en-PH"),
              by:     data.assigned_officer || "System",
              notes:  "Report received and logged.",
            },
          ],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading case details...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className={styles.pageWrapper} style={{ padding: "2rem" }}>
        <button className={styles.backBtn} onClick={() => router.push(backRoute)}>
          <IoIosArrowBack /> {backLabel}
        </button>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", color: "#991b1b" }}>
          {error || "Case not found"}
        </div>
      </div>
    );
  }

  // Tab definitions — staff gets 4 tabs, complainant gets 2 (details + interview if eligible)
  const tabs = [
    { id: "details", label: "📄 Case Details", staffOnly: false },
    ...(caseData.isWillingForInterview ? [
      { id: "interview", label: "📅 Interview", staffOnly: false },
    ] : []),
    ...(isStaff ? [
      { id: "management", label: "⚙️ Case Management", staffOnly: true },
      { id: "nlp",        label: "🤖 AI / NLP Analysis", staffOnly: true },
    ] : []),
  ];

  const tabStyle = (id) => ({
    padding: "10px 20px",
    border: "none",
    borderBottom: activeTab === id ? "2px solid #037F81" : "2px solid transparent",
    background: "none",
    color: activeTab === id ? "#037F81" : "#6b7280",
    fontWeight: activeTab === id ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div className={styles.pageWrapper}>
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type || "success"}`]}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.pageInner}>

        {/* Header card */}
        <div className={styles.headerCard}>
          <button className={styles.backBtn} onClick={() => router.push(backRoute)}>
            <IoIosArrowBack /> {backLabel}
          </button>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>{caseData.caseId}</h1>
              <p className={styles.caseSubtitle}>Submitted: {caseData.dateSubmitted}</p>
            </div>
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        {/* Content card with tabs */}
        <div className={styles.contentCard}>

          {/* Tab bar */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "1.75rem",
            overflowX: "auto",
            gap: 0,
          }}>
            {tabs.map((t) => (
              <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "details" && userLoaded && (
            <CaseDetailsTab caseData={caseData} isStaff={isStaff} />
          )}

          {activeTab === "interview" && caseData.isWillingForInterview && userLoaded && (
            <InterviewTab
              caseData={caseData}
              isStaff={isStaff}
              isCaseOfficer={isCaseOfficer}
              showToast={showToast}
            />
          )}

          {activeTab === "management" && isStaff && userLoaded && (
            <CaseManagementTab
              caseData={caseData}
              setCaseData={setCaseData}
              isAdmin={isAdmin}
              isCaseOfficer={isCaseOfficer}
              isLegal={isLegal}
              actorName={actorName}
              showToast={showToast}
            />
          )}

          {activeTab === "nlp" && isStaff && userLoaded && (
            <NLPAnalysisTab caseReportId={caseData.id} isAdmin={isAdmin} />
          )}

        </div>
      </div>
    </div>
  );
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}