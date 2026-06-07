"use client";

/**
 * UpdateStatusModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A self-contained, reusable status-update flow for SASHA cases.
 *
 * Exports
 * ───────
 *   UpdateStatusModal        — the top-level component to drop into any page
 *   TRANSITION_RULES         — role-based allowed transitions map
 *   getAvailableTransitions  — helper: (caseData, { isAdmin, isCaseOfficer, isLegal }) → string[]
 *   STATUS_MODAL_MAP         — status label → internal modal key
 *
 * Usage in CaseManagement.js
 * ──────────────────────────
 *   import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModal";
 *
 *   <UpdateStatusModal
 *     open={modal === "statusRouter"}
 *     caseData={selected}
 *     onClose={closeModal}
 *     onSubmit={submitForApproval}
 *     actorName={actorName}
 *     isAdmin={isAdmin}
 *     isCaseOfficer={isCaseOfficer}
 *     isLegal={isLegal}
 *   />
 *
 * Usage in ViewCase.js (CaseManagementTab)
 * ────────────────────────────────────────
 *   import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModal";
 *
 *   <UpdateStatusModal
 *     open={modal === "statusRouter"}
 *     caseData={caseData}
 *     onClose={() => setModal(null)}
 *     onSubmit={submitForApproval}
 *     actorName={actorName}
 *     isAdmin={isAdmin}
 *     isCaseOfficer={isCaseOfficer}
 *     isLegal={isLegal}
 *     viewCaseMode
 *   />
 *
 * NOTE: The `styles` prop has been removed. This component now exclusively uses
 * its own UpdateStatusModals.module.css — do not pass a styles prop from parents.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { FiX, FiClock, FiAlertTriangle } from "react-icons/fi";
import styles from "./UpdateStatusModals.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

export const STATUS_MODAL_MAP = {
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

const STATUS_COLORS = {
  "Submitted":             { bg: "#e0f2fe", color: "#0369a1" },
  "For Verification":      { bg: "#dbeafe", color: "#1e40af" },
  "Undergoing Review":     { bg: "#fef9c3", color: "#854d0e" },
  "Verified - True":       { bg: "#dcfce7", color: "#166534" },
  "Verified - False":      { bg: "#fee2e2", color: "#991b1b" },
  "Under Case Evaluation": { bg: "#f3e8ff", color: "#6b21a8" },
  "Case Filed":            { bg: "#ffedd5", color: "#9a3412" },
  "Investigation Ongoing": { bg: "#cffafe", color: "#155e75" },
  "Hearing Ongoing":       { bg: "#fce7f3", color: "#9d174d" },
  "Dismissed":             { bg: "#f1f5f9", color: "#475569" },
  "Perpetrator Convicted": { bg: "#d1fae5", color: "#065f46" },
  "Resolved":              { bg: "#ccfbf1", color: "#115e59" },
  "Withdrawn":             { bg: "#fef3c7", color: "#92400e" },
};

// ─── Transition Rules ─────────────────────────────────────────────────────────

export const TRANSITION_RULES = {
  // 1. Initial status when a case is created
  "Submitted": {
    case_officer: ["For Verification"],
    admin:        ["For Verification"],
    complainant:  ["Withdrawn"], 
  },

  // 2. Needs to be assigned or looked at
  "For Verification": {
    case_officer: ["Undergoing Review"],
    admin:        ["Undergoing Review"],
    complainant:  ["Withdrawn"],
  },

  // 3. Actively being reviewed
  "Undergoing Review": {
    case_officer: ["Verified - True", "Verified - False"],
    admin:        ["Verified - True", "Verified - False"],
  },

  // 4. Case is valid -> moves to evaluation
  "Verified - True": {
    case_officer: ["Under Case Evaluation"],
    admin:        ["Under Case Evaluation"],
  },

  // 5. UPDATED: Terminal state for invalid/unverifiable claims
  "Verified - False": {
    // Terminal state: No further transitions allowed
    admin: [], 
    case_officer: [],
  },

  // 6. Legal team assesses whether to file charges
  "Under Case Evaluation": {
    legal: ["Case Filed", "Dismissed"],
    admin: ["Case Filed", "Dismissed"],
  },

  // 7. Case formally filed in court/system
  "Case Filed": {
    legal: ["Investigation Ongoing"],
    admin: ["Investigation Ongoing"],
  },

  // 8. Ongoing discovery/investigation
  "Investigation Ongoing": {
    legal: ["Hearing Ongoing", "Dismissed"],
    admin: ["Hearing Ongoing", "Dismissed"],
  },

  // 9. Court/disciplinary hearings
  "Hearing Ongoing": {
    legal: ["Dismissed", "Perpetrator Convicted"],
    admin: ["Dismissed", "Perpetrator Convicted"],
  },

  // 10. Terminal state for dropped/thrown-out cases
  "Dismissed": {
    admin: [], 
  },

  // 11. Moves to final closing state after conviction
  "Perpetrator Convicted": {
    legal: ["Resolved"],
    admin: ["Resolved"],
  },

  // 12. Terminal final resolution state
  "Resolved": {
    admin: [], 
  },

  // 13. Terminal state for pulled cases
  "Withdrawn": {
    admin: [], 
  },
};

export function getAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal }) {
  const curr = caseData?.status;
  const role = isAdmin ? "admin" : isCaseOfficer ? "case_officer" : isLegal ? "legal" : null;
  if (!role || !curr) return [];
  return TRANSITION_RULES[curr]?.[role] || [];
}

// ─── Internal UI Primitives ───────────────────────────────────────────────────

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
        role="dialog"
        aria-modal="true"
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

function FormGroup({ label, required, hint, error, children, className = "" }) {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label className={styles.formLabel}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
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
  return (
    <textarea
      className={`${styles.formInput} ${error ? styles.inputError : ""}`}
      rows={3}
      style={{ resize: "vertical" }}
      {...props}
    />
  );
}

function FSelect({ error, children, ...props }) {
  return (
    <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>
      {children}
    </select>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 999,
      fontSize: "0.78rem", fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {status}
    </span>
  );
}

function StatusChangeShell({ open, onClose, title, caseData, onSubmitForApproval, children, canSubmit = true }) {
  if (!caseData) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className={styles.approvalNotice}>
        <FiClock style={{ flexShrink: 0 }} />
        <span>
          This change will be submitted for <strong>Admin approval</strong> before taking effect.
          The complainant will be informed after approval.
        </span>
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

// ─── Status-Specific Sub-Modals ───────────────────────────────────────────────

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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Undergoing Review", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Duplicate checked: ${form.duplicateChecked}. Safety issues: ${form.safetyIssues}. Survivor contacted: ${form.survivorContacted}. ${form.notes}`,
      formData: form,
    });
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Verified - True", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Report verified as credible. Basis: ${form.credibilityBasis}. Scope confirmed: ${form.scopeConfirmed}. ${form.notes}`,
      formData: form,
    });
    onClose();
  }

  return (
    <StatusChangeShell open={open} onClose={onClose} title="Verify Case: Verified — True" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <p className={styles.formDesc}>
        The report has been found sufficiently credible and within scope. This does <strong>not</strong> mean legal guilt
        has been established — it means the report passed SASHA's verification threshold.
      </p>
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Verified - False", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Verified False. Reason: ${form.reason}. ${form.additionalReason} Records: ${form.recordsHandled}. ${form.notes}`,
      formData: form,
    });
    onClose();
  }

  return (
    <StatusChangeShell open={open} onClose={onClose} title="Verify Case: Verified — False" caseData={caseData} onSubmitForApproval={handleSubmit}>
      <div className={styles.warningNotice}>
        <FiAlertTriangle />
        <span>
          This status should be applied <strong>carefully</strong>. It does not discredit survivors — use it only for
          cases outside scope, clearly erroneous, duplicate, or unverifiable after reasonable effort. Records remain
          confidential and controlled.
        </span>
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
  const PATHWAYS = [
    "Internal referral",
    "CODI (school/workplace)",
    "DSWD",
    "PNP Women and Children Protection Desk",
    "BSP/GSP mechanism",
    "Prosecutor / Court",
  ];
  const [form, setForm] = useState({ pathways: [], evidenceGaps: "", survivorInformed: "", legalRisks: "", notes: "" });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (open) setForm({ pathways: [], evidenceGaps: "", survivorInformed: "", legalRisks: "", notes: "" }); }, [open]);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const togglePathway = (p) => setForm((prev) => ({
    ...prev,
    pathways: prev.pathways.includes(p) ? prev.pathways.filter((x) => x !== p) : [...prev.pathways, p],
  }));

  function validate() {
    const e = {};
    if (form.pathways.length === 0) e.pathways = "Select at least one pathway.";
    if (!form.survivorInformed) e.survivorInformed = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Under Case Evaluation", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Case evaluation started. Pathways assessed: ${form.pathways.join(", ")}. Survivor informed: ${form.survivorInformed}. ${form.notes}`,
      formData: form,
    });
    onClose();
  }

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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Case Filed", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Complaint filed with ${form.filedWith} on ${form.filingDate}. Receiving officer: ${form.receivingOfficer}. Reference: ${form.referenceNumber || "N/A"}. ${form.notes}`,
      formData: form,
    });
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
        <FormGroup label="Receiving officer / desk" required error={errors.receivingOfficer}>
          <FInput placeholder="Name and designation of receiving officer" value={form.receivingOfficer} onChange={set("receivingOfficer")} error={errors.receivingOfficer} />
        </FormGroup>
        <FormGroup label="Reference / blotter number" hint="If provided by the receiving institution.">
          <FInput placeholder="e.g. WCD-2026-0042" value={form.referenceNumber} onChange={set("referenceNumber")} />
        </FormGroup>

        {form.filedWith === "PNP Women and Children Protection Desk" && (
          <>
            <div className={styles.sectionDivider}><span>PNP-Specific Details</span></div>
            <FormGroup label="Station / Desk details">
              <FInput placeholder="e.g. Quezon City Police District, WCPD" value={form.stationDetail || ""} onChange={(e) => setForm((p) => ({ ...p, stationDetail: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Assigned investigator">
              <FInput placeholder="Name of assigned investigator" value={form.investigator || ""} onChange={(e) => setForm((p) => ({ ...p, investigator: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Sworn statements taken?">
              <FSelect value={form.swornStatements || ""} onChange={(e) => setForm((p) => ({ ...p, swornStatements: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes</option><option>No — pending</option><option>Not applicable</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Medico-legal / evidence preservation advised?">
              <FSelect value={form.medicoLegal || ""} onChange={(e) => setForm((p) => ({ ...p, medicoLegal: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes — advised and acted on</option>
                <option>Yes — advised, pending</option>
                <option>Not applicable</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {form.filedWith === "DSWD" && (
          <>
            <div className={styles.sectionDivider}><span>DSWD-Specific Details</span></div>
            <FormGroup label="Receiving office / person">
              <FInput placeholder="DSWD office and contact person" value={form.dswdOffice || ""} onChange={(e) => setForm((p) => ({ ...p, dswdOffice: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Next scheduled follow-up">
              <FInput type="date" value={form.followUpDate || ""} onChange={(e) => setForm((p) => ({ ...p, followUpDate: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Survivor/family contacted?">
              <FSelect value={form.survivorContacted || ""} onChange={(e) => setForm((p) => ({ ...p, survivorContacted: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes</option><option>No — pending</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {form.filedWith === "BSP/GSP Mechanism" && (
          <>
            <div className={styles.sectionDivider}><span>BSP/GSP-Specific Details</span></div>
            <FormGroup label="Chapter / Council / Unit">
              <FInput placeholder="e.g. Manila Council, Troop 42" value={form.bspUnit || ""} onChange={(e) => setForm((p) => ({ ...p, bspUnit: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Receiving official">
              <FInput placeholder="Name and position" value={form.bspOfficial || ""} onChange={(e) => setForm((p) => ({ ...p, bspOfficial: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Interim safety measures in place?">
              <FSelect value={form.safetyMeasures || ""} onChange={(e) => setForm((p) => ({ ...p, safetyMeasures: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes — measures implemented</option>
                <option>Pending</option>
                <option>None reported</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {(form.filedWith === "School/Workplace CODI" || form.filedWith === "CODI") && (
          <>
            <div className={styles.sectionDivider}><span>CODI-Specific Details</span></div>
            <FormGroup label="CODI Focal Person">
              <FInput placeholder="Name and designation" value={form.codiFocal || ""} onChange={(e) => setForm((p) => ({ ...p, codiFocal: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Complaint receipt confirmed?">
              <FSelect value={form.codiReceipt || ""} onChange={(e) => setForm((p) => ({ ...p, codiReceipt: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes — confirmed</option>
                <option>Pending confirmation</option>
              </FSelect>
            </FormGroup>
            <FormGroup label="Anti-retaliation measures confirmed?">
              <FSelect value={form.antiRetaliation || ""} onChange={(e) => setForm((p) => ({ ...p, antiRetaliation: e.target.value }))}>
                <option value="">— Select —</option>
                <option>Yes — confirmed in place</option>
                <option>Pending verification</option>
                <option>Unknown</option>
              </FSelect>
            </FormGroup>
          </>
        )}

        {form.filedWith === "Court (with lawyer)" && (
          <>
            <div className={styles.sectionDivider}><span>Court-Specific Details</span></div>
            <FormGroup label="Case number and court branch">
              <FInput placeholder="e.g. Criminal Case No. 2026-1234, RTC Branch 42" value={form.caseNumber || ""} onChange={(e) => setForm((p) => ({ ...p, caseNumber: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Prosecutor / Counsel details">
              <FInput placeholder="Name and contact" value={form.counsel || ""} onChange={(e) => setForm((p) => ({ ...p, counsel: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Initial hearing date">
              <FInput type="date" value={form.hearingDate || ""} onChange={(e) => setForm((p) => ({ ...p, hearingDate: e.target.value }))} />
            </FormGroup>
          </>
        )}

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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Investigation Ongoing", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Investigation ongoing. Update: ${form.investigationUpdate}. Survivor safety: ${form.survivorSafety}. ${form.notes}`,
      formData: form,
    });
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Hearing Ongoing", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Hearing started. Type: ${form.hearingType}. Next date: ${form.nextHearingDate}. ${form.notes}`,
      formData: form,
    });
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Dismissed", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Dismissed by ${form.dismissingBody}. Reason: ${form.dismissalReason}. Remedies: ${form.remainingRemedies || "None identified"}. Survivor notified: ${form.survivorNotified}. ${form.notes}`,
      formData: form,
    });
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit("Perpetrator Convicted", {
      submittedBy: actorName,
      date: new Date().toLocaleDateString(),
      notes: `Final decision by ${form.forum}. Outcome: ${form.outcomeType}. Sanctions: ${form.sanctions || "None recorded"}. ${form.notes}`,
      formData: form,
    });
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

// ─── Sub-modal lookup ─────────────────────────────────────────────────────────

const STATUS_MODALS = {
  undergReview: UndergReviewModal,
  verifiedTrue:  VerifiedTrueModal,
  verifiedFalse: VerifiedFalseModal,
  caseEval:      CaseEvaluationModal,
  caseFiled:     CaseFiledModal,
  investigation: InvestigationModal,
  hearing:       HearingModal,
  dismissed:     DismissedModal,
  convicted:     ConvictedModal,
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * UpdateStatusModal
 *
 * Props
 * ─────
 * open          boolean           Whether this whole flow is open.
 * caseData      object            The case being updated ({ caseId, status, id, … }).
 * onClose       () => void        Called when the user cancels or finishes.
 * onSubmit      function          Called when the user submits a sub-modal form.
 *                                   CaseManagement mode: (caseData, proposedStatus, changeDetails) => void
 *                                   ViewCase mode:       (proposedStatus, changeDetails) => void
 * actorName     string            Display name of the acting staff member.
 * isAdmin       boolean
 * isCaseOfficer boolean
 * isLegal       boolean
 * viewCaseMode  boolean (optional) If true, onSubmit is called WITHOUT caseData as first arg.
 *
 * NOTE: Do NOT pass a `styles` prop — this component uses its own CSS module exclusively.
 */
export default function UpdateStatusModal({
  open,
  caseData,
  onClose,
  onSubmit,
  actorName,
  isAdmin,
  isCaseOfficer,
  isLegal,
  viewCaseMode = false,
}) {
  const [activeModal, setActiveModal] = useState(null);
  const [nextStatus, setNextStatus]   = useState("");

  useEffect(() => {
    if (open) {
      setActiveModal(null);
      setNextStatus("");
    }
  }, [open, caseData?.id]);

  if (!open || !caseData) return null;

  const transitions = getAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal });

  function handleSubModalSubmit(proposedStatus, changeDetails) {
    if (viewCaseMode) {
      onSubmit(proposedStatus, changeDetails);
    } else {
      onSubmit(caseData, proposedStatus, changeDetails);
    }
  }

  function handleSubModalClose() {
    setActiveModal(null);
  }

  const subModalProps = {
    caseData,
    onSubmit: handleSubModalSubmit,
    actorName,
  };

  const routerOpen = open && activeModal === null;

  const subModals = Object.entries(STATUS_MODALS).map(([key, SubModal]) => (
    <SubModal
      key={key}
      open={activeModal === key}
      onClose={handleSubModalClose}
      {...subModalProps}
    />
  ));

  return (
    <>
      {/* ── Status Router ──────────────────────────────────────────────────── */}
      <Modal open={routerOpen} onClose={onClose} title="Update Status" wide>
        <FormGroup label="Case ID">
          <FInput value={caseData.caseId} disabled />
        </FormGroup>

        <FormGroup label="Current Status" className={styles.modalLabel}>
          <FInput value={caseData.status} disabled />
        </FormGroup>

        {transitions.length === 0 ? (
          <p className={styles.emptyState}>
            No available transitions for this case at your role level.
          </p>
        ) : (
          <FormGroup label="Next Status" className={styles.modalLabel}>
            <p className={styles.modalDesc}>
              Select the next status. You will be asked to fill in required details for admin approval.
            </p>
            <select
              className={styles.select}
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              <option value="" disabled>Select next status</option>
              {transitions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormGroup>
        )}

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            disabled={!nextStatus}
            onClick={() => {
              const modalKey = STATUS_MODAL_MAP[nextStatus];
              if (!modalKey) {
                console.warn("[UpdateStatusModal] No modal mapped for status:", nextStatus);
                return;
              }
              setActiveModal(modalKey);
            }}
          >
            Confirm
          </button>
        </div>
      </Modal>

      {/* ── Status-specific sub-modals ─────────────────────────────────────── */}
      {subModals}
    </>
  );
}