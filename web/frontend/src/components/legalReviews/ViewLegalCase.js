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
  FiInfo,
} from "react-icons/fi";
import { IoIosArrowBack, IoIosInformationCircle, } from "react-icons/io";
import styles from "./ViewLegalCase.module.css";
import UpdateStatusModal, { getAvailableTransitions as getSharedAvailableTransitions } from "../cases/UpdateStatusModals";
import StatusDetailsSection from "../cases/StatusDetailsSection";
import DetailAccordion from "../cases/DetailAccordion";
import PendingStatusApproval from "../cases/PendingStatusApproval";
import Tooltip from "@/components/ui/Tooltip";
import EvidenceGallery from "../cases/EvidenceGallery";
import { FollowUpCaseHistory } from "../cases/FollowUps";
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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  13: "Withdrawn"
};

const ALL_STATUSES = [
  "Submitted",
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
  "Resolved",
  "Withdrawn"
];

const LEGAL_CASE_STATUSES = [
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
  "Dismissed",
  "Perpetrator Convicted",
  "Resolved",
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
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  },
  "Undergoing Review": {
    title: "Your case is being reviewed",
    description:
      "A SASHA case officer is reviewing your report to determine whether it falls within SASHA's scope. They are checking for duplicate reports, identifying any immediate safety concerns, and noting any information that may still be needed. You may be contacted to clarify certain details.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  },
  "Verified - True": {
    title: "Your report has been verified",
    description:
      "Your report has been found sufficiently credible and falls within SASHA's scope. This means SASHA can proceed with providing you support, referral, or further case development. This does not mean a legal finding has been made — it simply means SASHA has accepted your case for action.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
  "Verified - False": {
    title: "Your report could not be verified",
    description:
      "After careful review, SASHA was unable to proceed with your case. This may be because the report was outside SASHA's scope, could not be verified after reasonable efforts, was a duplicate, or was clearly submitted in error. This does not mean you are being disbelieved — your records remain confidential and controlled. If you have concerns, you may reach out to SASHA.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  },
  "Under Case Evaluation": {
    title: "Your case is being evaluated",
    description:
      "SASHA's team is assessing your full case file to determine the best course of action. They are identifying the most appropriate pathway — such as referral to DSWD, PNP, a school or workplace mechanism, or legal proceedings. You will be informed of the options available to you.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  },
  "Case Filed": {
    title: "A formal complaint has been filed",
    description:
      "A formal complaint has been lodged with the appropriate body on your behalf. This could be with a school or workplace committee (CODI), the PNP Women and Children Protection Desk, DSWD, BSP/GSP mechanism, or a court. SASHA has recorded all filing details for monitoring.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#e0f2fe", color: "#0c4a6e", border: "#7dd3fc" },
  },
  "Investigation Ongoing": {
    title: "An investigation is underway",
    description:
      "The institution where your complaint was filed is now taking action. Statements, documents, and evidence may be gathered. SASHA is monitoring the progress of the investigation and checking that the process is fair and that you remain safe.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#cffafe", color: "#155e75", border: "#67e8f9" },
  },
  "Hearing Ongoing": {
    title: "A formal hearing is in progress",
    description:
      "Your case has reached a formal hearing, conference, or adjudication stage — this could be in a school/workplace process, an administrative inquiry, or a court. SASHA is monitoring the schedule and your support needs throughout this process.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  },
  "Dismissed": {
    title: "Your case has been closed by the institution",
    description:
      "The institution handling your case has closed it without a finding of liability. This may have been due to lack of jurisdiction, insufficient evidence, a procedural issue, or withdrawal of the complaint. SASHA has documented the reason and is assessing whether any other remedy remains available to you. You may reach out to SASHA if you need further guidance.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  },
  "Perpetrator Convicted": {
    title: "A decision has been reached",
    description:
      "A final decision has been made establishing liability in the relevant forum. This may be a criminal conviction, an administrative finding of guilt, or a civil liability finding. SASHA has recorded the outcome and any sanctions, and will assess what continuing support you may need.",
    icon: <IoIosInformationCircle style={{ flexShrink: 0 }} />,
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
};

// ─── Shared subcomponents ─────────────────────────────────────────────────────

const STATUS_COLORS = {
  "Submitted":             { bg: "#e0f2fe", color: "#0369a1" }, // Light Blue
  "For Verification":      { bg: "#dbeafe", color: "#1e40af" }, // Blue
  "Undergoing Review":     { bg: "#fef9c3", color: "#854d0e" }, // Yellow
  "Verified - True":       { bg: "#dcfce7", color: "#166534" }, // Green
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" }, // Red
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" }, // Purple
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" }, // Orange
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" }, // Cyan
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" }, // Pink
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" }, // Slate/Gray
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" }, // Emerald Green
  "Resolved":              { bg: "#ccfbf1", color: "#115e59" }, // Teal
  "Withdrawn":             { bg: "#fef3c7", color: "#92400e" }, // Amber/Muted Brown
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

// ─────────────────────────────────────────────────────────────────────────────
// PARALEGAL SUPPORT MODAL — organize case facts and documents
// ─────────────────────────────────────────────────────────────────────────────


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
        <IoIosInformationCircle style={{ fontSize: "1rem", flexShrink: 0 }} />
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
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Incident Summary</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.summary}</p>
            </div>
          )}

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Suggested Classification</h4>
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
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Suggested Next Steps</h4>
            {nlpData.recommended_steps?.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 6 }}>
                {nlpData.recommended_steps.map((step, i) => <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{step}</li>)}
              </ol>
            ) : <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No steps suggested.</p>}
          </div>

          <div style={{ background: nlpData.referral_suggested ? "#fffbeb" : "#f0fdf4", border: `1px solid ${nlpData.referral_suggested ? "#fcd34d" : "#86efac"}`, borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: nlpData.referral_suggested ? "#92400e" : "#166534" }}>
              {nlpData.referral_suggested ? "Referral may be appropriate" : "May be resolvable internally"}
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

// ─── Legal Review Tab (staff only) ────────────────────────────────────────────

function mergeLegalReviewData(caseData, review) {
  if (!review) return caseData;
  return {
    ...caseData,
    legalReviewId: review.legal_review_id,
    legalReviewLogs: review.logs || [],
    paralegalRecord: review.paralegal_record || null,
    lawyerRecord: review.lawyer_record || null,
    endorsedTo: review.endorsed_to || caseData.endorsedTo || null,
    referralBody: review.endorsed_to || caseData.referralBody || null,
    referralRequired: !!(review.endorsed_to || caseData.referralRequired),
    endorsementStatus: review.endorsed_to ? `Endorsed to ${review.endorsed_to}` : caseData.endorsementStatus,
    endorsementDetails: review.endorsement_details || null,
    monitoringLog: review.monitoring_log || [],
    documentRepository: review.document_repository || [],
  };
}

function getUserDataFromCookie() {
  try {
    const userCookie = getCookie("user");
    return userCookie ? JSON.parse(userCookie) : {};
  } catch {
    return {};
  }
}

function safeDocumentUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function LegalReviewDetailsSection({ caseData }) {
  const hasParalegal = !!caseData.paralegalRecord;
  const hasLawyer = !!caseData.lawyerRecord;
  const hasEndorsement = !!(caseData.endorsedTo || caseData.endorsementDetails);
  const hasMonitoring = (caseData.monitoringLog || []).length > 0;
  const hasDocuments = (caseData.documentRepository || []).length > 0;
  const hasStatusDetails = (caseData.statusHistory || []).some((entry) => entry.formData || entry.form_data);
  const deadlines = [
    { label: "Referral follow-up", value: caseData.endorsementDetails?.["Follow-up Date"] },
    ...(caseData.statusHistory || []).map((entry) => ({
      label: "Next hearing",
      value: entry.formData?.nextHearingDate || entry.form_data?.nextHearingDate,
    })),
  ]
    .filter((item) => item.value && !Number.isNaN(new Date(item.value).getTime()))
    .sort((a, b) => new Date(a.value) - new Date(b.value));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeadingText}>Legal Review Details</h2>

      {!hasParalegal && !hasLawyer && !hasEndorsement && !hasMonitoring && !hasDocuments && !hasStatusDetails && (
        <p className={styles.emptyState}>No legal review details have been saved yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
      {hasParalegal && (
        <DetailAccordion
          title="Paralegal Support"
          style={{ order: 1 }}
          summary={[caseData.paralegalRecord.date, caseData.paralegalRecord.organizedBy].filter(Boolean).join(" — ")}
        >
          <div className={styles.detailGrid}>
            {[
              ["Organized By", caseData.paralegalRecord.organizedBy],
              ["Date", caseData.paralegalRecord.date],
              ["Documents", caseData.paralegalRecord.documents],
              ["Sworn Statement", caseData.paralegalRecord.swornStatement],
              ["Identity Documents", caseData.paralegalRecord.idDocuments],
              ["Digital Evidence", caseData.paralegalRecord.screenshots],
              ["Incident Timeline", caseData.paralegalRecord.timeline],
              ["Key Incident Details", caseData.paralegalRecord.incidentDetails],
              ["Additional Notes", caseData.paralegalRecord.otherNotes],
            ].map(([k, v]) => v ? (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v}</p>
              </div>
            ) : null)}
          </div>
        </DetailAccordion>
      )}

      <div id="legal-case-calendar" style={{ order: 4 }}>
        <DetailAccordion
          title="Case Calendar"
          summary={deadlines.length > 0 ? `${deadlines.length} scheduled date${deadlines.length === 1 ? "" : "s"}` : "No scheduled dates"}
        >
          {deadlines.length === 0 ? (
            <p className={styles.emptyState}>No structured hearing or follow-up dates have been recorded yet.</p>
          ) : <div className={styles.detailGrid}>
            {deadlines.map((deadline, index) => {
              const date = new Date(deadline.value);
              const dayDelta = Math.ceil((date - new Date(new Date().toDateString())) / 86400000);
              return (
                <div key={`${deadline.label}-${deadline.value}-${index}`} className={styles.detailItem}>
                  <p className={styles.detailKey}>{deadline.label}</p>
                  <p className={styles.detailVal}>
                    {date.toLocaleDateString("en-PH")} ({dayDelta < 0 ? `${Math.abs(dayDelta)} day(s) overdue` : `in ${dayDelta} day(s)`})
                  </p>
                </div>
              );
            })}
          </div>}
        </DetailAccordion>
      </div>

      <DetailAccordion
        title="Update Status"
        style={{ order: 5 }}
        summary={`${(caseData.statusHistory || []).filter((entry) => entry.formData || entry.form_data).length} saved update${(caseData.statusHistory || []).filter((entry) => entry.formData || entry.form_data).length === 1 ? "" : "s"}`}
      >
        <StatusDetailsSection
          caseData={caseData}
          styles={styles}
          title={null}
          emptyText="No status details have been saved yet."
          wrap={false}
          newestFirst
        />
      </DetailAccordion>

      {hasLawyer && (
        <DetailAccordion
          title="Lawyer Consultation"
          style={{ order: 6 }}
          summary={[caseData.lawyerRecord.date, caseData.lawyerRecord.assessedBy].filter(Boolean).join(" — ")}
        >
          <div className={styles.detailGrid}>
            {[
              ["Assessed By", caseData.lawyerRecord.assessedBy],
              ["Date", caseData.lawyerRecord.date],
              ["Consultation Type", caseData.lawyerRecord.consultationType],
              ["Engagement Status", caseData.lawyerRecord.engagementStatus],
              ["Courses of Action", caseData.lawyerRecord.actionType?.join(", ")],
              ["Applicable Laws", caseData.lawyerRecord.applicableLaws?.join(", ")],
              ["Evidence Gaps", caseData.lawyerRecord.evidenceGaps],
              ["Recommendation", caseData.lawyerRecord.recommendation],
              ["Additional Notes", caseData.lawyerRecord.additionalNotes],
            ].map(([key, value]) => value ? (
              <div key={key} className={styles.detailItem}>
                <p className={styles.detailKey}>{key}</p>
                <p className={styles.detailVal}>{value}</p>
              </div>
            ) : null)}
          </div>
        </DetailAccordion>
      )}

      {hasDocuments && (
        <DetailAccordion
          title="Linked Documents"
          style={{ order: 7 }}
          summary={`${caseData.documentRepository.length} document${caseData.documentRepository.length === 1 ? "" : "s"}`}
        >
          <div className={styles.reviewLogList}>
            {caseData.documentRepository.map((document, index) => (
              <div key={`${document.name}-${index}`} className={styles.reviewLogItem}>
                <div className={styles.reviewLogMeta}>
                  <strong>{document.name}</strong>
                  <span>{document.confidential ? "Confidential" : "Standard access"} · {document.uploadedBy}</span>
                </div>
                {safeDocumentUrl(document.link)
                  ? <a href={safeDocumentUrl(document.link)} target="_blank" rel="noreferrer">Open document</a>
                  : <span>Invalid document link</span>}
              </div>
            ))}
          </div>
        </DetailAccordion>
      )}

      {hasEndorsement && (
        <DetailAccordion
          title="Endorse"
          style={{ order: 2 }}
          summary={caseData.endorsedTo || "Referral details saved"}
        >
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <p className={styles.detailKey}>Endorsed To</p>
              <p className={styles.detailVal}>{caseData.endorsedTo || "Not endorsed"}</p>
            </div>
            {Object.entries(caseData.endorsementDetails || {}).map(([k, v]) => v ? (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v}</p>
              </div>
            ) : null)}
          </div>
        </DetailAccordion>
      )}

      {hasMonitoring && (
        <DetailAccordion
          title="Monitor"
          style={{ order: 3 }}
          summary={`${caseData.monitoringLog.length} update${caseData.monitoringLog.length === 1 ? "" : "s"}`}
        >
          <div className={styles.reviewLogList}>
            {[...caseData.monitoringLog].reverse().map((entry, index) => (
              <div key={`${entry.date}-${index}`} className={styles.reviewLogItem}>
                <div className={styles.reviewLogMeta}>
                  <strong>{entry.date}</strong>
                  <span>{entry.by}</span>
                </div>
                <p>{entry.update}</p>
              </div>
            ))}
          </div>
        </DetailAccordion>
      )}
      </div>
    </section>
  );
}

function CaseManagementTab({ caseData, setCaseData, isAdmin, isCaseOfficer, isLegal, actorName, userId, showToast }) {
  const [modal, setModal] = useState(null);

  // Determine available status transitions
  function getAvailableTransitions() {
    if (isAdmin) return LEGAL_CASE_STATUSES.filter((s) => s !== caseData.status);
    return getSharedAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal })
      .filter((status) => LEGAL_CASE_STATUSES.includes(status));
  }

  async function saveCase(updated) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const userData = getUserDataFromCookie();
    const performedByUserId = userData.user_id || userData.id;

    let body = {
      performed_by_user_id: performedByUserId,
      action_type: "legal_review_updated",
      remarks: `Legal review updated for case ${caseData.caseId || caseData.id}.`,
    };

    if (updated.paralegalRecord !== caseData.paralegalRecord) {
      body = {
        ...body,
        action_type: "paralegal_record_saved",
        remarks: "Paralegal support record saved.",
        paralegal_record: updated.paralegalRecord,
        document_repository: updated.documentRepository || [],
      };
    } else if (updated.endorsedTo !== caseData.endorsedTo || updated.endorsementDetails !== caseData.endorsementDetails) {
      body = {
        ...body,
        action_type: "endorsement_saved",
        remarks: `Endorsement saved${updated.endorsedTo ? ` to ${updated.endorsedTo}` : ""}.`,
        endorsed_to: updated.endorsedTo || null,
        endorsement_details: updated.endorsementDetails || null,
      };
    } else if ((updated.monitoringLog || []).length > (caseData.monitoringLog || []).length) {
      const monitoringEntry = updated.monitoringLog[updated.monitoringLog.length - 1];
      body = {
        ...body,
        action_type: "monitoring_update_added",
        remarks: "Monitoring update added.",
        monitoring_entry: monitoringEntry,
      };
    }

    try {
      const res = await fetch(`${API_URL}/api/legal_reviews/case/${caseData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to save legal review details.");

      setCaseData((prev) => mergeLegalReviewData({ ...prev, ...updated }, payload.data));
      showToast(`Case ${updated.caseId || updated.id} updated.`);
    } catch (err) {
      showToast(err.message, "danger");
      throw err;
    }
  }

  async function submitForApproval(proposedStatus, changeDetails) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

      // Get user info from cookie for changed_by fields
      const userCookie = getCookie('user')
      const userData = userCookie ? JSON.parse(userCookie) : {}

      const res = await fetch(`${API_URL}/api/case_status_history`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          case_report_id:   caseData.id,
          proposed_status:  proposedStatus,
          changed_by_id:    userData.user_id   || null,
          changed_by_role:  userData.role_name  || 'legal personnel',
          notes:            changeDetails.notes || null,
          form_data:        changeDetails.formData ?? null,
        }),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update status.')

      setCaseData(prev => ({
        ...prev,
        status: body.requiresApproval ? prev.status : proposedStatus,
        pendingApproval: body.requiresApproval ? {
          historyId: body.historyRow.history_id,
          proposedStatus,
          ...changeDetails,
        } : null,
        statusHistory: [
          ...(prev.statusHistory || []),
          {
            status: proposedStatus,
            date:   new Date().toLocaleDateString('en-PH'),
            by:     changeDetails.submittedBy,
            notes:  changeDetails.notes,
            formData: changeDetails.formData,
            historyId: body.historyRow.history_id,
            approvalStatus: body.requiresApproval ? "pending" : "approved",
          }
        ]
      }))

      showToast(body.message)
      setModal(null)
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  const transitions = getAvailableTransitions();
  const canOpenStatusModal = transitions.length > 0 || !!STATUS_MODAL_MAP[caseData.status];

  // Kept for the legacy inline modals below, which are no longer opened.
  const [paralegalVal, setParalegalVal] = useState(caseData.assignedParalegal || "");
  const [endorseBody, setEndorseBody]   = useState("");
  const [endorseNotes, setEndorseNotes] = useState("");
  const [monitorNote, setMonitorNote]   = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      <PendingStatusApproval
        caseData={caseData}
        setCaseData={setCaseData}
        isAdmin={isAdmin}
        approverId={userId}
        showToast={showToast}
      />

      {/* ── Current Assignment ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Actions</h2>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <Tooltip text="Assign or update paralegal support for this case.">
            <button onClick={() => setModal("paralegalSupport")} style={btnStyle("#037F81")}>Paralegal Support</button>
          </Tooltip>

          <Tooltip text="Endorse the case to another legal service or organization.">
            <button onClick={() => setModal("endorseFull")} style={btnStyle("#037F81")}>Endorse</button>
          </Tooltip>

          <Tooltip text="Record a monitoring update for the legal case.">
            <button onClick={() => setModal("monitorFull")} style={btnStyle("#037F81")}>Monitor</button>
          </Tooltip>

          <Tooltip text="Jump to this case's hearings, deadlines, and legal events.">
            <button onClick={() => document.getElementById("legal-case-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={btnStyle("#037F81")}>Case Calendar</button>
          </Tooltip>

          {canOpenStatusModal && !caseData.pendingApproval && (
            <Tooltip text="Move the case to an available legal-review status.">
              <button onClick={() => setModal("statusShared")} style={btnStyle("#037F81")}>Update Status</button>
            </Tooltip>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Current Legal Assignment</h2>
        <div className={styles.detailGrid}>
          {[
            ["Lawyer(s)",          (caseData.assignedLegal || []).filter((person) => person.assignment_role === "lawyer").map((person) => person.name).filter(Boolean).join(", ") || "Not assigned"],
            ["Paralegal(s)",       (caseData.assignedLegal || []).filter((person) => person.assignment_role === "paralegal").map((person) => person.name).filter(Boolean).join(", ") || "Not assigned"],
            ["Endorsed To",        caseData.endorsedTo || caseData.endorsementStatus || "Not endorsed"],
            ["Status",             <StatusBadge status={caseData.status} />],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Action Buttons ── */}
      <LegalReviewDetailsSection caseData={caseData} />


      {/* ── Status History ── */}
      <StatusHistorySection caseData={caseData} />

      <UpdateStatusModal
        open={modal === "statusShared"}
        onClose={() => setModal(null)}
        caseData={caseData}
        onSubmit={submitForApproval}
        actorName={actorName}
        isAdmin={isAdmin}
        isLegal={isLegal}
        viewCaseMode
        allowedStatuses={LEGAL_CASE_STATUSES}
        includeCurrentStatus
      />

      <ParalegalSupportModal
        open={modal === "paralegalSupport"}
        onClose={() => setModal(null)}
        caseData={caseData}
        onSave={saveCase}
        actorName={actorName}
      />

      <EndorseModal
        open={modal === "endorseFull"}
        onClose={() => setModal(null)}
        caseData={caseData}
        onSave={saveCase}
        actorName={actorName}
      />

      <MonitoringModal
        open={modal === "monitorFull"}
        onClose={() => setModal(null)}
        caseData={caseData}
        onSave={saveCase}
        actorName={actorName}
      />

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
      <CaseFiledModal      open={modal === "caseFiled"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <InvestigationModal  open={modal === "investigation"} onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <HearingModal        open={modal === "hearing"}       onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <DismissedModal      open={modal === "dismissed"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />
      <ConvictedModal      open={modal === "convicted"}     onClose={() => setModal("statusRouter")} caseData={caseData} onSubmit={submitForApproval} actorName={actorName} />

      {/* Paralegal Support */}
      <Modal open={modal === "paralegal"} onClose={() => setModal(null)} title="Paralegal Support">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Assign Paralegal">
            <FSelect value={paralegalVal} onChange={(e) => setParalegalVal(e.target.value)}>
              <option value="">— Select paralegal —</option>
              {PARALEGALS.map((p) => <option key={p} value={p}>{p}</option>)}
            </FSelect>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button className={styles.btnPrimary} onClick={() => {
            setCaseData((p) => ({ ...p, assignedParalegal: paralegalVal }));
            showToast("Paralegal assigned.");
            setModal(null);
          }} disabled={!paralegalVal}>Assign</button>
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
            setCaseData((p) => ({ ...p, endorsedTo: endorseBody, endorsementStatus: `Endorsed to ${endorseBody}` }));
            showToast(`Case endorsed to ${endorseBody}.`);
            setModal(null);
          }} disabled={!endorseBody}>Endorse</button>
        </div>
      </Modal>

      {/* Monitor */}
      <Modal open={modal === "monitor"} onClose={() => setModal(null)} title="Monitoring Update">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Monitoring note" required>
            <FTextarea placeholder="Log update: referral received, services provided, complainant contacted…" value={monitorNote} onChange={(e) => setMonitorNote(e.target.value)} />
          </FormGroup>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button className={styles.btnPrimary} onClick={() => {
            const entry = { date: new Date().toLocaleDateString("en-PH"), by: actorName, update: monitorNote };
            setCaseData((p) => ({ ...p, monitoringLog: [...(p.monitoringLog || []), entry] }));
            showToast("Monitoring update logged.");
            setMonitorNote("");
            setModal(null);
          }} disabled={!monitorNote.trim()}>Save</button>
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
  const historyEntries = [...(caseData.statusHistory || [])].reverse();
  return (
    <section className={styles.section}>
      <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? <FiChevronUp /> : <FiChevronDown />}
        {showHistory ? "Hide" : "Show"} Status History ({caseData.statusHistory?.length || 0} entries)
      </button>
      {showHistory && (
        <div className={styles.historyList}>
          {historyEntries.map((h, i) => (
            <div key={h.historyId || `${h.status}-${h.date}-${i}`} className={styles.historyItem}>
              <div style={{ textAlign: "center" }}>
                <div className={styles.historyDot} />
                {i < historyEntries.length - 1 && (
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
  const caseTypes = Array.isArray(caseData.caseType)
    ? caseData.caseType.filter(Boolean)
    : caseData.caseType ? [caseData.caseType] : [];
  const primaryCategory = caseData.primaryCategory || caseData.caseCategory || "";
  const additionalCategories = Array.isArray(caseData.additionalCategories)
    ? caseData.additionalCategories
    : Array.isArray(caseData.alsoInvolves)
      ? caseData.alsoInvolves
      : [];
  const assignedParalegals = (caseData.assignedLegal || [])
    .filter((person) => person.assignment_role === "paralegal")
    .map((person) => person.name)
    .filter(Boolean)
    .join(", ");
  const requestedOutcomes = Array.isArray(caseData.requestedOutcome)
    ? caseData.requestedOutcome
    : caseData.requestedOutcome ? [caseData.requestedOutcome] : [];
  const evidences = Array.isArray(caseData.evidences) ? caseData.evidences : [];
  const followUps = Array.isArray(caseData.followUps) ? caseData.followUps : [];

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
        <h2 className={styles.sectionHeadingText}>Complainant Details</h2>
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
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Incident Details */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Incident Details</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Location Type", caseData.incidentLocationType],
            ["Location",      caseData.incidentLocationDisplay],
            ["Date",          caseData.incidentDate],
            ["Time",          caseData.incidentTime],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
        <div>
          <p className={styles.detailKey}>Description</p>
          <p className={styles.descriptionVal}>{caseData.description}</p>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <p className={styles.detailKey}>Requested Action / Outcome</p>
          <p className={styles.descriptionVal}>
            {requestedOutcomes.length ? requestedOutcomes.join(", ") : "No requested outcome provided."}
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Supporting Evidence</h2>
        <EvidenceGallery evidences={evidences} />
      </section>

      {/* Perpetrator Information */}
      {(
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>Perpetrator Information</h2>
          <div className={styles.detailGrid}>
            {[
              ["Known to Complainant?", caseData.perpetratorKnown ? "Yes" : "No"],
              ...(caseData.perpetratorKnown ? [
                ["Name", caseData.perpetratorName],
                ["Gender of Perpetrator (as perceived)", caseData.perpetratorGender],
                ["Occupation", caseData.perpetratorOccupation],
                ["Relationship to Complainant", caseData.perpetratorRelationship],
              ] : []),
              ...(!caseData.perpetratorKnown ? [
                ["Gender of Perpetrator (as perceived)", caseData.perpetratorUnknownGender],
                ["Appearance or identifying details", caseData.perpetratorUnknownAppearance],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v || "Not provided"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Witness Information */}
      {(
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>Witness Information</h2>
          <div className={styles.detailGrid}>
            {[
              ["Are there witnesses?", caseData.hasWitnesses ? "Yes" : "No"],
              ...(caseData.hasWitnesses ? [
                ["Witness Name", caseData.witnessName],
                ["Contact", caseData.witnessContact],
                ["Relationship to Complainant", caseData.witnessRelationship],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} className={styles.detailItem}>
                <p className={styles.detailKey}>{k}</p>
                <p className={styles.detailVal}>{v || "Not provided"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional Context */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Additional Context</h2>
        <div className={styles.detailGrid}>
          {[
            ["Reported to Anyone Else?", caseData.reportedToOthers ? "Yes" : "No"],
            ...(caseData.reportedToOthers && caseData.toldAnyoneWho ? [["Told To", caseData.toldAnyoneWho]] : []),
            ["Reported to Police?",      caseData.reportedToPolice ? "Yes" : "No"],
            ...(caseData.reportedToPolice && caseData.policeStation ? [["Police Station", caseData.policeStation]] : []),
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case Classification — visible to everyone, with explanations for complainants */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Case Classification</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Current Status",    <StatusBadge status={caseData.status} />],
            ["Case Type", caseTypes.join(", ") || "Not yet classified"],
            ["Case Categories",
              (() => {
                if (!primaryCategory && additionalCategories.length === 0) return "Not yet classified";
                if (!primaryCategory) return additionalCategories.join(", ");
                if (additionalCategories.length === 0) return primaryCategory;
                return `${primaryCategory} (also: ${additionalCategories.join(", ")})`;
              })()
            ],
            ["Referral Required", caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body",     caseData.referralBody || "Not assigned"],
            ["Assigned Officer",  caseData.assignedOfficer || "Not assigned"],
            ...(caseData.status === "Verified - True" || caseData.assignedParalegal || assignedParalegals
              ? [["Assigned Paralegal", assignedParalegals || caseData.assignedParalegal || "Pending assignment"]]
              : []),
            ["Endorsement",       caseData.endorsementStatus || "Not endorsed"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>

        {/* Explanations for complainants */}
        {!isStaff && caseTypes.length === 1 && CASE_TYPE_DESCRIPTIONS[caseTypes[0]] && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "1rem 1.25rem", marginTop: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <FiInfo style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.82rem", fontWeight: 700, color: "#166534" }}>About this case type: {caseTypes[0]}</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>{CASE_TYPE_DESCRIPTIONS[caseTypes[0]]}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Status History — for complainants, use friendly language */}
      {!isStaff ? (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>Your Case History</h2>
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
    ? "/legalReviews"
    : fromParam === "dashboard" ? "/dashboard" : "/cases";
  const backLabel = isStaff
    ? "Back to Legal Review"
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
        setUser({
          role: stored.role_name,
          firstName: stored.first_name,
          lastName: stored.last_name,
          id: stored.user_id,
        });
      } catch (_) {}
    }
    setUserLoaded(true);
  }, []);

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
        const mappedCase = {
          id:                   data.case_report_id,
          caseId:               `${caseYear}-` + String(data.case_report_id).padStart(3, "0"),
          reporterId:           String(data.complainant_id),
          region:               data.incident_province || data.incident_city || "Not provided",
          status:               STATUS_STEP[data.case_status_id] || "For Verification",
          assignedOfficer:      data.assigned_officer || null,
          dateSubmitted:        new Date(data.created_at).toLocaleDateString("en-PH"),
          description:          data.incident_description || "No incident description provided.",
          requestedOutcome:     data.action_requested || [],
          evidences:            data.evidences || [],
          incidentLocationType: data.incident_location_type || null,
          incidentCity:         data.incident_city,
          incidentLocation:     data.incident_location,
          incidentLocationDisplay: data.incident_location_type === "Online"
            ? data.incident_location || "Online"
            : data.incident_location_type === "Physical Location" ? [data.incident_location, data.incident_city, "NCR"].filter(Boolean).join(", ") : data.incident_city || "Not provided",
          incidentDate:            data.incident_date,
          incidentTime:            data.incident_time,
          perpetratorKnown:        data.is_perpetrator_known,
          perpetratorName:         data.perpetrator_name,
          perpetratorGender:       data.perpetrator_gender,
          perpetratorUnknownGender:
            data.perpetrator_unknown_gender ||
            (!data.is_perpetrator_known ? data.perpetrator_gender : null),
          perpetratorUnknownAppearance: data.perpetrator_unknown_appearance,
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
          caseCategory:            data.primary_category || data.case_category || null,
          additionalCategories:    data.additional_categories || [],
          alsoInvolves:            data.additional_categories || [],
          referralRequired:        data.referral_required ?? false,
          referralBody:            data.referral_body || null,
          assignedParalegal:       data.assigned_paralegal || null,
          assignedLegal:           (data.assigned_legal || []).map((person) => ({
            ...person,
            assignment_role: person.assignment_role === "legal_officer" ? "lawyer" : person.assignment_role,
          })),
          endorsementStatus:       data.endorsement_status || null,
          internalNotes:           data.internal_notes || null,
          followUpSummary:         data.follow_up_summary || null,
          followUps:               [],
          pendingApproval:         null,
          statusHistory: [
            {
              status: STATUS_STEP[data.case_status_id] || "For Verification",
              date:   new Date(data.created_at).toLocaleDateString("en-PH"),
              by:     data.assigned_officer || "System",
              notes:  "Report received and logged.",
            },
          ],
        };

        const legalReviewRes = await fetch(`${API_URL}/api/legal_reviews/case/${caseId}`, { credentials: "include" });
        if (legalReviewRes.ok) {
          const legalReviewPayload = await legalReviewRes.json().catch(() => ({}));
          setCaseData(mergeLegalReviewData(mappedCase, legalReviewPayload.data));
        } else {
          setCaseData(mappedCase);
        }

        const assessmentRes = await fetch(`${API_URL}/api/case_assessments/case/${caseId}`, { credentials: "include" });
        if (assessmentRes.ok) {
          const assessmentPayload = await assessmentRes.json().catch(() => ({}));
          const assessments = assessmentPayload.data || [];
          const latestType = assessments.find((record) =>
            Array.isArray(record.case_type) ? record.case_type.length > 0 : Boolean(record.case_type)
          );
          const latestCategory = assessments.find((record) =>
            record.primary_category || (record.additional_categories || []).length > 0
          );
          const latestReferral = assessments.find((record) =>
            record.referral_required !== null &&
            record.referral_required !== undefined
          );

          setCaseData((previous) => ({
            ...previous,
            assessmentHistory: assessments,
            caseType: latestType?.case_type || previous.caseType,
            primaryCategory: latestCategory?.primary_category || previous.primaryCategory || previous.caseCategory,
            caseCategory: latestCategory?.primary_category || previous.caseCategory || previous.primaryCategory,
            additionalCategories: latestCategory?.additional_categories || previous.additionalCategories || previous.alsoInvolves || [],
            alsoInvolves: latestCategory?.additional_categories || previous.alsoInvolves || previous.additionalCategories || [],
            referralRequired: latestReferral?.referral_required ?? previous.referralRequired,
            referralBody: latestReferral?.referral_body ?? previous.referralBody,
            endorsedTo: latestReferral?.endorsement?.endorsed_to || previous.endorsedTo,
            endorsementStatus: latestReferral
              ? latestReferral.endorsement?.endorsed_to
                ? `Endorsed to ${latestReferral.endorsement.endorsed_to}`
                : null
              : previous.endorsementStatus,
          }));
        }

        const historyRes = await fetch(`${API_URL}/api/case_status_history/${caseId}?staffView=true`, { credentials: "include" });
        if (historyRes.ok) {
          const historyJson = await historyRes.json().catch(() => ({}));
          const statusHistory = historyJson.data || [];
          if (statusHistory.length > 0) {
            const pending = [...statusHistory].reverse().find((entry) => entry.approvalStatus === "pending");
            setCaseData((prev) => ({
              ...prev,
              pendingApproval: pending ? {
                historyId: pending.historyId,
                proposedStatus: pending.status,
                submittedBy: pending.by,
                date: pending.date,
                notes: pending.notes,
                formData: pending.formData,
              } : null,
              statusHistory: [
                ...(prev.statusHistory || []).filter((h) => h.notes === "Report received and logged."),
                ...statusHistory,
              ],
            }));
          }
        }

        const followUpsRes = await fetch(
          `${API_URL}/api/case_reports/${caseId}/follow-ups`,
          { credentials: "include", cache: "no-store" }
        );
        if (followUpsRes.ok) {
          const followUpsPayload = await followUpsRes.json().catch(() => ({}));
          setCaseData((previous) => ({
            ...previous,
            followUps: followUpsPayload.data || [],
          }));
        }
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

  // Tab definitions — staff gets 3 tabs, complainant gets 1
  const tabs = [
    { id: "details", label: "Case Details", tooltip: "View the submitted report and case information.", staffOnly: false },
    ...(isStaff ? [
      { id: "management", label: "Legal Review", tooltip: "Manage assignments, endorsements, monitoring, and legal status.", staffOnly: true },
      { id: "nlp", label: "AI / NLP Analysis", tooltip: "Review automated language and case-structure analysis.", staffOnly: true },
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
              <Tooltip key={t.id} text={t.tooltip} position="bottom">
                <button style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "details" && userLoaded && (
            <CaseDetailsTab caseData={caseData} isStaff={isStaff} />
          )}

          {activeTab === "management" && isStaff && userLoaded && (
            <CaseManagementTab
              caseData={caseData}
              setCaseData={setCaseData}
              isAdmin={isAdmin}
              isCaseOfficer={isCaseOfficer}
              isLegal={isLegal}
              actorName={actorName}
              userId={user.id}
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
