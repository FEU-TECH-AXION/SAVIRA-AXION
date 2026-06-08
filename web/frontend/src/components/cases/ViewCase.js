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
import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModals";

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
  13: "Withdrawn",
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
  "Withdrawn",
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
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Suggested Classification</h4>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Case Categories</p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.case_categories?.length > 0 ? nlpData.case_categories.map((c) => <CategoryBadge key={c} label={c} />) : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>}
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

// ─── Invite to Interview Modal ────────────────────────────────────────────────

function InviteToInterviewModal({ open, onClose, caseData, actorName, showToast, userId, userRole }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [expiryDays, setExpiryDays] = useState("7");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => { if (open) { setExpiryDays("7"); setNotes(""); setError(null); } }, [open]);

  async function handleSend() {
    console.log("handleSend fired", { userId, caseDataId: caseData.id, reporterId: caseData.reporterId });
    setSubmitting(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // Validate reporterId exists
      if (!caseData.reporterId) {
        throw new Error("Complainant user ID is missing. Cannot create interview. Check that the case has a valid complainant assigned.");
      }
      
      if (!userId) {
        throw new Error("Officer user ID is missing. Cannot create interview.");
      }

      console.log("Creating interview with:", {
        type: "case_report",
        case_report_id: caseData.id,
        interviewee_user_id: caseData.reporterId,
        interviewer_user_id: userId,
      });
      
      const interviewRes = await fetch(`${API_URL}/api/interviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "case_report",
          case_report_id: caseData.id,
          interviewee_user_id: caseData.reporterId,
          interviewer_user_id: userId,
          notes: notes || null,
          slot_expires_at: new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString(),
          status: "invited",
        }),
      });

      console.log("interview response status:", interviewRes.status);
      const interviewBody = await interviewRes.json();
      console.log("interview response body:", interviewBody);

      if (!interviewRes.ok) {
        throw new Error(interviewBody.error || `Failed to create interview (${interviewRes.status})`);
      }

      console.log("✓ Interview created successfully");
      showToast && showToast(`Interview invitation sent for ${caseData.caseId}.`);
      onClose();

    } catch (err) {
      console.error("FULL ERROR:", err);
      setError(err.message);
      showToast && showToast(err.message || "Failed to send invitation.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Complainant to Interview">
      <p className={styles.formDesc}>
        Send an interview invitation to the complainant for <strong>{caseData?.caseId}</strong>.
        They will be able to select a slot from your available calendar.
      </p>
      
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.875rem", color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.formGrid}>
        <FormGroup label="Invitation expiry (days)" hint="How many days the complainant has to select a slot.">
          <FSelect value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)}>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Notes for complainant" hint="Optional message shown alongside the invitation.">
          <FTextarea
            placeholder="e.g. Please select a slot at your earliest convenience."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSend} disabled={submitting}>
          {submitting ? "Sending…" : "Send Invitation"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Case Management Tab (staff only) ────────────────────────────────────────

function CaseManagementTab({ caseData, setCaseData, isAdmin, isCaseOfficer, isLegal, actorName, userId, userRole, showToast }) {
  const [modal, setModal] = useState(null);

  const NON_TRANSITIONAL_STATUSES = [
  "Submitted",
];

const TRANSITION_RULES = {
  "For Verification": {
    case_officer: ["Undergoing Review"],
    admin: ["Undergoing Review"],
  },

  "Undergoing Review": {
    case_officer: ["Verified - True", "Verified - False"],
    admin: ["Verified - True", "Verified - False"],
  },

  "Verified - True": {
    case_officer: ["Under Case Evaluation"],
    admin: ["Under Case Evaluation"],
  },

  "Under Case Evaluation": {
    legal: ["Case Filed"],
    admin: ["Case Filed"],
  },

  "Case Filed": {
    legal: ["Investigation Ongoing"],
    admin: ["Investigation Ongoing"],
  },

  "Investigation Ongoing": {
    legal: ["Hearing Ongoing", "Dismissed"],
    admin: ["Hearing Ongoing", "Dismissed"],
  },

  "Hearing Ongoing": {
    legal: ["Dismissed", "Perpetrator Convicted"],
    admin: ["Dismissed", "Perpetrator Convicted"],
  },
};

  // Determine available status transitions
  function getAvailableTransitions() {
  const curr = caseData.status;
  const role = isAdmin ? "admin" : isCaseOfficer ? "case_officer" : isLegal ? "legal" : null;

  if (!role) return [];

  return TRANSITION_RULES[curr]?.[role] || [];
}

  async function submitForApproval(proposedStatus, changeDetails) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const res = await fetch(`${API_URL}/api/case_status_history`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_report_id:  caseData.id,
          proposed_status: proposedStatus,
          changed_by_id:   userId,
          changed_by_role: userRole,
          notes:           changeDetails.notes,
          form_data:       changeDetails.formData,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to submit.")
      }

      const responseData = await res.json()

      // Update status immediately — no pending queue
      setCaseData((prev) => ({
        ...prev,
        status:          proposedStatus,  // ← reflect new status right away
        pendingApproval: null,
        // Append to local history timeline
        statusHistory: [
          ...(prev.statusHistory || []),
          {
            status: proposedStatus,
            date:   new Date().toLocaleDateString("en-PH"),
            by:     actorName,
            notes:  changeDetails.notes,
          },
        ],
      }))

      showToast(`Status updated to "${proposedStatus}".`)
      setModal(null)
    } catch (err) {
      showToast(err.message, "error")
    }
  }

  const transitions = getAvailableTransitions();

  const [caseTypeConfirmed, setCaseTypeConfirmed] = useState(false);
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);

  // Inline state for assign paralegal / referral modals
  const [paralegalVal, setParalegalVal] = useState(caseData.assignedParalegal || "");
  const [caseTypeVal, setCaseTypeVal] = useState(
    Array.isArray(caseData.caseType) ? caseData.caseType : caseData.caseType ? [caseData.caseType] : []
  );
  const [caseCatVal, setCaseCatVal] = useState(caseData.caseCategory || "");
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
        <h2 className={styles.sectionHeadingText}>Current Case Assignment</h2>
        <div className={styles.detailGrid}>
          {[
            ["Assigned Case Officer", caseData.assignedOfficer || "Unassigned"],
            ["Assigned Paralegal",    caseData.assignedParalegal || (caseData.status === "Verified - True" ? "Pending assignment" : "Unassigned")],
            ["Case Type",        Array.isArray(caseData.caseType) ? caseData.caseType.join(", ") : caseData.caseType || "Not yet classified"],
            ["Case Categories", caseData.caseCategory
              ? caseData.alsoInvolves?.length
                ? `${caseData.caseCategory} (also: ${caseData.alsoInvolves.join(", ")})`
                : caseData.caseCategory
              : "Not yet classified"],
            ["Referral Required",     caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body",         caseData.referralBody || "Unassigned"],
            ["Endorsement Status",    caseData.endorsementStatus || "Not yet endorsed"],
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
        <h2 className={styles.sectionHeadingText}>Actions</h2>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>

          {/* Update Status */}
          {transitions.length > 0 && !caseData.pendingApproval && (
            <button onClick={() => setModal("statusRouter")} style={btnStyle("#037F81")}>
              Update Status
            </button>
          )}

          {/* Set Case Type */}
          <button onClick={() => setModal("setCaseType")} style={btnStyle("#037F81")}>
            Set Case Type
          </button>

          {/* Set Case Category */}
          <button onClick={() => setModal("setCategory")} style={btnStyle("#037F81")}>
            Set Category
          </button>

          {/* Invite to Interview — only for the assigned case officer, only when status allows interviews */}
          {isCaseOfficer && caseData.isWillingForInterview === true && (
            <button onClick={() => {
              console.log("invite clicked", { isCaseOfficer, isWillingForInterview: caseData.isWillingForInterview });
              setModal("inviteInterview");
            }} style={btnStyle("#037F81")}>
              Invite to Interview (TEST)
            </button>
          )}

          {/* Set Referral */}
          <button onClick={() => setModal("setReferral")} style={btnStyle("#037F81")}>
          Referral
          </button>

          {/* Assign Paralegal — only when Verified - True */}
          {caseData.status === "Verified - True" && (
            <button onClick={() => setModal("assignParalegal")} style={btnStyle("#037F81")}>
              Assign Paralegal
            </button>
          )}

          {/* Endorse Case */}
          <button onClick={() => setModal("endorse")} style={btnStyle("#037F81")}>
            Endorse
          </button>
        </div>
      </section>

      {/* ── Internal Notes ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Internal Notes / Action Log</h2>
        <textarea
          placeholder="Add notes about case management actions, decisions, or observations..."
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", minHeight: "100px", outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            onClick={async () => {
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
              const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ findings: internalNotes, case_officer_id: userId }),
              });
              if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
              setCaseData((p) => ({ ...p, internalNotes }));
              showToast("Notes saved.");
            } catch (err) { showToast(err.message, "error"); }
          }}
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
      <UpdateStatusModal
      open={modal === "statusRouter"}
      caseData={caseData}
      onClose={() => setModal(null)}
      onSubmit={submitForApproval}   // (proposedStatus, changeDetails) => void  ← note: no caseData arg
      actorName={actorName}
      isAdmin={isAdmin}
      isCaseOfficer={isCaseOfficer}
      isLegal={isLegal}
      styles={styles}                // pass your ViewCase.module.css styles object
      viewCaseMode                   // flag: onSubmit signature is (status, details) instead of (case, status, details)
      />

      {/* Invite to Interview */}
      {modal === "inviteInterview" && (
        <InviteToInterviewModal
          open
          onClose={() => setModal(null)}
          caseData={caseData}
          actorName={actorName}
          userId={userId}
          userRole={userRole}
          showToast={showToast}
        />
      )}

      {/* Set Case Type */}
      <Modal open={modal === "setCaseType"} onClose={() => setModal(null)} title="Set Case Type" wide>
        <p className={styles.formDesc}>
          Check all case types that apply. Hover or select a type to see its definition. More than one may be relevant.
        </p>

        {/* Confirmation notice at top */}
        <div style={{
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8,
          padding: "10px 14px", marginBottom: "1.25rem",
          fontSize: "0.82rem", color: "#92400e",
          display: "flex", gap: 8, alignItems: "flex-start"
        }}>
          <FiAlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Case type classification affects how this report is processed and which referral pathways are considered. Review each definition carefully before checking.</span>
        </div>

        <div className={styles.formGrid}>
          <FormGroup label="Case Type(s)" required>
            <div className={styles.checkGroup}>
              {VIOLENCE_TYPES.map((v) => {
                const isChecked = caseTypeVal.includes(v);
                return (
                  <div key={v} style={{ marginBottom: "0.5rem" }}>
                    <label className={styles.checkLabel} style={{
                      background: isChecked ? "#f5f3ff" : "transparent",
                      border: isChecked ? "1px solid #ddd6fe" : "1px solid transparent",
                      borderRadius: 8,
                      padding: "8px 10px",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}>
                      <input
                        type="checkbox"
                        className={styles.checkInput}
                        checked={isChecked}
                        style={{ marginTop: 2, flexShrink: 0 }}
                        onChange={() =>
                          setCaseTypeVal((prev) =>
                            prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                          )
                        }
                      />
                      <div>
                        <span style={{
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? "#5b21b6" : "inherit",
                          fontSize: "0.875rem",
                          display: "block",
                        }}>
                          {v}
                        </span>
                        {isChecked && CASE_TYPE_DESCRIPTIONS[v] && (
                          <span style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: "0.8rem",
                            color: "#6b21a8",
                            lineHeight: 1.55,
                            fontStyle: "italic",
                          }}>
                            {CASE_TYPE_DESCRIPTIONS[v]}
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
            {caseTypeVal.length === 0 && (
              <span className={styles.errorMsg}>Select at least one case type.</span>
            )}
          </FormGroup>
        </div>

        {/* Summary of selected types */}
        {caseTypeVal.length > 0 && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
            padding: "10px 14px", margin: "0.5rem 0 1rem",
            fontSize: "0.82rem", color: "#166534",
          }}>
            <strong>Selected ({caseTypeVal.length}):</strong> {caseTypeVal.join(" · ")}
          </div>
        )}

        {/* Confirmation checkbox */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>
            <input
              type="checkbox"
              checked={caseTypeConfirmed}
              onChange={(e) => setCaseTypeConfirmed(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, accentColor: "#5b21b6" }}
            />
            <span>
              I have reviewed the definitions of all selected case type(s) and confirm that this classification accurately reflects the nature of the incident as reported.
            </span>
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button
            className={styles.btnPrimary}
            disabled={caseTypeVal.length === 0 || !caseTypeConfirmed}
            onClick={async () => {
              try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
                  method: "PATCH",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ case_type: caseTypeVal, case_officer_id: userId }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
                setCaseData((p) => ({ ...p, caseType: caseTypeVal }));
                setCaseTypeConfirmed(false);
                showToast("Case type updated.");
                setModal(null);
              } catch (err) { showToast(err.message, "error"); }
            }}
          >
            Save
          </button>                             
        </div>
      </Modal>  

      {/* Set Category */}
      <Modal open={modal === "setCategory"} onClose={() => { setModal(null); setCategoryConfirmed(false); }} title="Set Category" wide>
        <p className={styles.formDesc}>
          Select the dominant medium of the incident as the case category.
          If the case spans more than one medium, check the others under "Also involves".
        </p>

        <div style={{
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8,
          padding: "10px 14px", marginBottom: "1.25rem",
          fontSize: "0.82rem", color: "#92400e",
          display: "flex", gap: 8, alignItems: "flex-start"
        }}>
          <FiAlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Case category determines how the incident medium is recorded and affects referral routing. Select carefully.</span>
        </div>

        <div className={styles.formGrid}>

          <FormGroup label="Case Category" required hint="The dominant medium — pick one.">
            <FSelect
              value={caseCatVal}
              onChange={(e) => {
                const selected = e.target.value;
                setCaseCatVal(selected);
                setAlsoCatVal((prev) => prev.filter((c) => c !== selected));
                setCategoryConfirmed(false);
              }}
            >
              <option value="">— Select case category —</option>
              <option value="Physical">Physical</option>
              <option value="Virtual">Virtual</option>
              <option value="Verbal">Verbal</option>
            </FSelect>

            {/* Inline description shown after selection */}
            {caseCatVal && (
              <div style={{
                marginTop: 8, background: "#f5f3ff", border: "1px solid #ddd6fe",
                borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem",
                color: "#5b21b6", lineHeight: 1.55, fontStyle: "italic",
              }}>
                {caseCatVal === "Physical" && "The incident involved direct in-person physical contact or conduct — such as touching, assault, or physical presence of the perpetrator."}
                {caseCatVal === "Virtual" && "The incident took place through digital means — such as online platforms, messaging apps, social media, email, or any internet-based channel."}
                {caseCatVal === "Verbal" && "The incident involved spoken or written words, remarks, threats, or verbal conduct — whether in person, over the phone, or through text."}
              </div>
            )}
          </FormGroup>

          <FormGroup
            label="Also involves (optional)"
            hint="Check any other mediums this case spans — separate from the case category."
          >
            <div className={styles.checkGroup}>
              {["Physical", "Virtual", "Verbal"]
                .filter((c) => c !== caseCatVal)
                .map((c) => (
                  <label key={c} className={styles.checkLabel} style={{
                    background: alsoCatVal.includes(c) ? "#f5f3ff" : "transparent",
                    border: alsoCatVal.includes(c) ? "1px solid #ddd6fe" : "1px solid transparent",
                    borderRadius: 8, padding: "8px 10px", transition: "all 0.15s",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={alsoCatVal.includes(c)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                      onChange={() =>
                        setAlsoCatVal((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                    />
                    <div>
                      <span style={{
                        fontWeight: alsoCatVal.includes(c) ? 700 : 500,
                        color: alsoCatVal.includes(c) ? "#5b21b6" : "inherit",
                        fontSize: "0.875rem", display: "block",
                      }}>
                        {c}
                      </span>
                      {alsoCatVal.includes(c) && (
                        <span style={{
                          display: "block", marginTop: 4, fontSize: "0.8rem",
                          color: "#6b21a8", lineHeight: 1.55, fontStyle: "italic",
                        }}>
                          {c === "Physical" && "The incident also involved direct in-person physical contact or conduct."}
                          {c === "Virtual" && "The incident also took place through digital means or online platforms."}
                          {c === "Verbal" && "The incident also involved spoken or written words, remarks, or verbal conduct."}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
            </div>
            {!caseCatVal && (
              <span className={styles.formHint}>Select a case category first to enable this.</span>
            )}
          </FormGroup>

        </div>

        {/* Summary */}
        {caseCatVal && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
            padding: "10px 14px", margin: "0.5rem 0 1rem",
            fontSize: "0.82rem", color: "#166534",
          }}>
            <strong>Case Category:</strong> {caseCatVal}
            {alsoCatVal.length > 0 && <> &nbsp;·&nbsp; <strong>Also involves:</strong> {alsoCatVal.join(", ")}</>}
          </div>
        )}

        {/* Confirmation checkbox */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>
            <input
              type="checkbox"
              checked={categoryConfirmed}
              onChange={(e) => setCategoryConfirmed(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, accentColor: "#ec4899" }}
            />
            <span>
              I have reviewed the category definitions and confirm that this classification accurately reflects the medium through which the incident occurred.
            </span>
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
          <button
            className={styles.btnPrimary}
            disabled={!caseCatVal || !categoryConfirmed}
              onClick={async () => {
                try {
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                  const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ primary_category: caseCatVal, additional_categories: alsoCatVal, case_officer_id: userId }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
                  setCaseData((p) => ({ ...p, primary_category: caseCatVal, alsoInvolves: alsoCatVal }));
                  setCategoryConfirmed(false);
                  showToast("Category updated.");
                  setModal(null);
                } catch (err) { showToast(err.message, "error"); }
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
          <button className={styles.btnPrimary} onClick={async () => {
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
              const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referral_required: referralReq === "yes", referral_body: referralReq === "yes" ? referralVal : null, case_officer_id: userId }),
              });
              if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
              setCaseData((p) => ({ ...p, referralRequired: referralReq === "yes", referralBody: referralReq === "yes" ? referralVal : null }));
              showToast("Referral details updated.");
              setModal(null);
            } catch (err) { showToast(err.message, "error"); }
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
          <button className={styles.btnPrimary} onClick={async () => {
              try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
                  method: "PATCH",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ assigned_paralegal: paralegalVal, case_officer_id: userId }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
                setCaseData((p) => ({ ...p, assignedParalegal: paralegalVal }));
                showToast("Paralegal assigned.");
                setModal(null);
              } catch (err) { showToast(err.message, "error"); }
            }}>Assign</button>
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
          <button className={styles.btnPrimary} onClick={async () => {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endorsement: {
                  endorsed_to: endorseBody,
                  notes: endorseNotes,
                  date: new Date().toISOString(),
                },
                referral_body: endorseBody,
                referral_required: true,
                case_officer_id: userId,
              }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
            setCaseData((p) => ({ ...p, endorsementStatus: `Endorsed to ${endorseBody}`, referralBody: endorseBody, referralRequired: true }));
            showToast(`Case endorsed to ${endorseBody}.`);
            setModal(null);
          } catch (err) { showToast(err.message, "error"); }
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
              <p className={styles.detailVal}>{v || "—"}</p>
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
              <p className={styles.detailVal}>{v || "—"}</p>
            </div>
          ))}
        </div>
        <div>
          <p className={styles.detailKey}>Incident Description</p>
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
              <p className={styles.detailVal}>{v || "—"}</p>
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
            ["Case Type",         caseData.caseType || "Not yet classified"],
            ["Case Category",     caseData.caseCategory || "Not yet classified"],
            ["Referral Required", caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body",     caseData.referralBody || "Unassigned"],
            ["Assigned Officer",  caseData.assignedOfficer || "Unassigned"],
            ...(caseData.status === "Verified - True" || caseData.assignedParalegal
              ? [["Assigned Paralegal", caseData.assignedParalegal || "Pending assignment"]]
              : []),
            ["Endorsement",       caseData.endorsementStatus || "Unassigned"],
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
        setUser({ role: stored.role_name, firstName: stored.first_name, lastName: stored.last_name, id: stored.user_id, });
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
          reporterId:           data.complainant_user_id,
          region:               data.incident_province || data.incident_city || "—",
          status:               STATUS_STEP[data.case_status_id] || "For Verification",
          assignedOfficer:      data.assigned_officer || null,
          dateSubmitted: new Date(data.created_at).toLocaleDateString("en-PH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          description:          data.incident_description || "—",
          incidentLocationType: data.incident_location_type || null,
          incidentCity:         data.incident_city,
          incidentLocation:     data.incident_location,
          incidentLocationDisplay: data.incident_location_type === "Online"
            ? data.incident_location || "Online"
            : data.incident_location_type === "Physical Location" ? [data.incident_location, data.incident_city, "NCR"].filter(Boolean).join(", ") : data.incident_city || "—",
          incidentDate:         new Date(data.incident_date).toLocaleDateString("en-PH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          incidentTime: data.incident_time
            ? new Date(`1970-01-01T${data.incident_time}`).toLocaleTimeString("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            : "N/A",
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
          isWillingForInterview:   !!data.is_willing_for_interview,
          name:                    data.name,
          age:                     data.age,
          genderIdentity:          data.gender_identity,
          email:                   data.email,
          contactNumber:           data.contact_number,
          caseType:                data.case_type || null,
          caseCategory:            data.case_category || null,
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

        const asmRes = await fetch(`${API_URL}/api/case_assessments/case/${data.case_report_id}`, { credentials: "include" });
        if (asmRes.ok) {
          const asmJson = await asmRes.json();
          const latest = asmJson.data?.[0]; // already ordered by created_at desc
          if (latest) {
            setCaseData((prev) => ({
              ...prev,
              caseType:          latest.case_type || prev.caseType,
              caseCategory:    latest.primary_category || prev.caseCategory,
              alsoInvolves:    latest.additional_categories || [],
              referralRequired: latest.referral_required ?? prev.referralRequired,
              referralBody:    latest.referral_body || prev.referralBody,
              endorsementStatus: latest.endorsement?.endorsed_to
                ? `Endorsed to ${latest.endorsement.endorsed_to}`
                : prev.endorsementStatus,
            }));
          }
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

  // Tab definitions — staff gets 4 tabs, complainant gets 2 (details + interview if eligible)
  const tabs = [
    { id: "details", label: "Case Details", staffOnly: false },
    ...(caseData.isWillingForInterview ? [
      { id: "interview", label: "Interview", staffOnly: false },
    ] : []),
    ...(isStaff ? [
      { id: "management", label: "Case Management", staffOnly: true },
      { id: "nlp",        label: "NLP Analysis", staffOnly: true },
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
              userId={user.id} 
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
              userId={user.id}
              userRole={user.role}
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