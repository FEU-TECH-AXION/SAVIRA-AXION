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
  FiEdit2,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";
import { IoIosArrowBack, IoIosWarning, IoIosInformationCircle } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./ViewCase.module.css";
import InterviewTab from "./interview/InterviewTab";
import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModals";
import StatusDetailsSection from "./StatusDetailsSection";

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
    icon: <IoIosInformationCircle />,
    color: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  },
  "Undergoing Review": {
    title: "Your case is being reviewed",
    description:
      "A SASHA case officer is reviewing your report to determine whether it falls within SASHA's scope. They are checking for duplicate reports, identifying any immediate safety concerns, and noting any information that may still be needed. You may be contacted to clarify certain details.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  },
  "Verified - True": {
    title: "Your report has been verified",
    description:
      "Your report has been found sufficiently credible and falls within SASHA's scope. This means SASHA can proceed with providing you support, referral, or further case development. This does not mean a legal finding has been made — it simply means SASHA has accepted your case for action.",
    icon: <FaCheckCircle />,
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
  "Verified - False": {
    title: "Your report could not be verified",
    description:
      "After careful review, SASHA was unable to proceed with your case. This may be because the report was outside SASHA's scope, could not be verified after reasonable efforts, was a duplicate, or was clearly submitted in error. This does not mean you are being disbelieved — your records remain confidential and controlled. If you have concerns, you may reach out to SASHA.",
    icon: <IoIosWarning />,
    color: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  },
  "Under Case Evaluation": {
    title: "Your case is being evaluated",
    description:
      "SASHA's team is assessing your full case file to determine the best course of action. They are identifying the most appropriate pathway — such as referral to DSWD, PNP, a school or workplace mechanism, or legal proceedings. You will be informed of the options available to you.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  },
  "Case Filed": {
    title: "A formal complaint has been filed",
    description:
      "A formal complaint has been lodged with the appropriate body on your behalf. This could be with a school or workplace committee (CODI), the PNP Women and Children Protection Desk, DSWD, BSP/GSP mechanism, or a court. SASHA has recorded all filing details for monitoring.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#e0f2fe", color: "#0c4a6e", border: "#7dd3fc" },
  },
  "Investigation Ongoing": {
    title: "An investigation is underway",
    description:
      "The institution where your complaint was filed is now taking action. Statements, documents, and evidence may be gathered. SASHA is monitoring the progress of the investigation and checking that the process is fair and that you remain safe.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#cffafe", color: "#155e75", border: "#67e8f9" },
  },
  "Hearing Ongoing": {
    title: "A formal hearing is in progress",
    description:
      "Your case has reached a formal hearing, conference, or adjudication stage — this could be in a school/workplace process, an administrative inquiry, or a court. SASHA is monitoring the schedule and your support needs throughout this process.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  },
  "Dismissed": {
    title: "Your case has been closed by the institution",
    description:
      "The institution handling your case has closed it without a finding of liability. This may have been due to lack of jurisdiction, insufficient evidence, a procedural issue, or withdrawal of the complaint. SASHA has documented the reason and is assessing whether any other remedy remains available to you. You may reach out to SASHA if you need further guidance.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  },
  "Perpetrator Convicted": {
    title: "A decision has been reached",
    description:
      "A final decision has been made establishing liability in the relevant forum. This may be a criminal conviction, an administrative finding of guilt, or a civil liability finding. SASHA has recorded the outcome and any sanctions, and will assess what continuing support you may need.",
    icon: <IoIosInformationCircle />,
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

  // const CategoryBadge = ({ label }) => (
  //   <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#e1f5f5", color: "#037F81", marginRight: 6, marginBottom: 4 }}>{label}</span>
  // );
  // const CaseTypeBadge = ({ label }) => (
  //   <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#f3e8ff", color: "#6b21a8", marginRight: 6, marginBottom: 4 }}>{label}</span>
  // );

  const CONFIDENCE_COLORS = {
    high:     { bar: "#16a34a", bg: "#f0fdf4", border: "#86efac", label: "#166534" },
    moderate: { bar: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "#92400e" },
    low:      { bar: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", label: "#6b7280" },
  };

  const ConfidenceBar = ({ confidence }) => {
    const c     = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.low;
    const width = confidence === "high" ? "85%" : confidence === "moderate" ? "50%" : "25%";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width, height: "100%", background: c.bar, borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize", color: c.label, minWidth: 64 }}>
          {confidence} confidence
        </span>
      </div>
    );
  };

  const ClassificationCard = ({ item, type }) => {
    const isObj      = typeof item === "object" && item !== null;
    const label      = isObj ? (item.category || item.type) : item;
    const confidence = isObj ? item.confidence : null;
    const basis      = isObj ? item.basis : null;
    const c          = CONFIDENCE_COLORS[confidence] || { bg: "#f9fafb", border: "#e5e7eb" };
    const badgeBg    = type === "category" ? "#e1f5f5" : "#f3e8ff";
    const badgeColor = type === "category" ? "#037F81" : "#6b21a8";
    {nlpData.primary_categories?.length > 0
      ? nlpData.primary_categories.map((c, i) => {
          // ── Parse if item is a JSON string instead of an object ──
          let item = c;
          if (typeof c === "string") {
            try { item = JSON.parse(c); } catch { item = { category: c }; }
          }
          return <ClassificationCard key={i} item={item} type="category" />;
        })
      : <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: 12 }}>None suggested</p>
    }

    {nlpData.case_types?.length > 0
      ? nlpData.case_types.map((t, i) => {
          // ── Parse if item is a JSON string instead of an object ──
          let item = t;
          if (typeof t === "string") {
            try { item = JSON.parse(t); } catch { item = { type: t }; }
          }
          return <ClassificationCard key={i} item={item} type="type" />;
        })
      : <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</p>
    }
    return (
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700, background: badgeBg, color: badgeColor }}>
          {label}
        </span>
        {confidence && <ConfidenceBar confidence={confidence} />}
        {basis && (
          <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#4b5563", lineHeight: 1.5, fontStyle: "italic" }}>
            "{basis}"
          </p>
        )}
      </div>
    );
  };

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
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Incident Summary</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.summary}</p>
            </div>
          )}

    
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
              🏷️ Suggested Classification
            </h4>

            {/* Confidence tier disclaimer */}
            <p style={{ margin: "0 0 12px", fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic", lineHeight: 1.5 }}>
              Confidence tiers reflect the AI's assessment based on language in the report — not statistical probabilities.
              High = clearly described · Moderate = implied · Low = vaguely suggested.
            </p>

            {/* Case Categories */}
            <p style={{ margin: "0 0 6px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Case Categories
            </p>
            {nlpData.primary_categories?.length > 0
              ? nlpData.primary_categories.map((c, i) => <ClassificationCard key={i} item={c} type="category" />)
              : <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: 12 }}>None suggested</p>
            }

            {/* Case Types */}
            <p style={{ margin: "8px 0 6px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Case Types
            </p>
            {nlpData.case_types?.length > 0
              ? nlpData.case_types.map((t, i) => <ClassificationCard key={i} item={t} type="type" />)
              : <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</p>
            }

            {/* Classification Notes */}
            {nlpData.classification_notes && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>{nlpData.classification_notes}</p>
              </div>
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

          {/* ── Clarification Warning ── */}
          {nlpData.needs_clarification && (
              <div style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: "1.25rem",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
              }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚠️</span>
                  <div>
                      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#92400e" }}>
                          Report Needs Clarification
                      </p>
                      <p style={{ margin: "4px 0 8px", fontSize: "0.82rem", color: "#78350f", lineHeight: 1.6 }}>
                          {nlpData.clarification_reason}
                      </p>
                      <button
                          onClick={() => {/* trigger your clarification request flow */}}
                          style={{
                              background: "#d97706", color: "#fff",
                              border: "none", borderRadius: 999,
                              padding: "6px 16px", fontSize: "0.82rem",
                              fontWeight: 700, cursor: "pointer",
                          }}
                      >
                          Request Clarification
                      </button>
                  </div>
              </div>
          )}

          {/* ── Report Structure Assessment ── */}
          {nlpData.report_structure && (
              <div style={{
                  background: "#f9fafb", borderRadius: 8,
                  padding: "14px 16px", marginBottom: "1.25rem",
                  border: "1px solid #e5e7eb",
              }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                      📋 Report Structure Assessment
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                          { key: "has_introduction", label: "Introduction", notes: nlpData.report_structure.introduction_notes },
                          { key: "has_body",         label: "Body",         notes: nlpData.report_structure.body_notes },
                          { key: "has_conclusion",   label: "Conclusion",   notes: nlpData.report_structure.conclusion_notes },
                      ].map(({ key, label, notes }) => (
                          <div key={key} style={{
                              display: "flex", gap: 10, alignItems: "flex-start",
                              padding: "8px 10px", borderRadius: 6,
                              background: nlpData.report_structure[key] ? "#f0fdf4" : "#fef2f2",
                              border: `1px solid ${nlpData.report_structure[key] ? "#86efac" : "#fca5a5"}`,
                          }}>
                              <span style={{
                                  fontSize: "0.85rem", fontWeight: 700, minWidth: 20,
                                  color: nlpData.report_structure[key] ? "#16a34a" : "#dc2626",
                              }}>
                                  {nlpData.report_structure[key] ? "✓" : "✗"}
                              </span>
                              <div>
                                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>
                                      {label}
                                  </p>
                                  {notes && (
                                      <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.5 }}>
                                          {notes}
                                      </p>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Clarity score */}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>
                          Clarity Score
                      </span>
                      <div style={{ display: "flex", gap: 3 }}>
                          {[1,2,3,4,5].map(n => (
                              <div key={n} style={{
                                  width: 20, height: 8, borderRadius: 999,
                                  background: n <= nlpData.clarity_score
                                      ? nlpData.clarity_score >= 4 ? "#16a34a"
                                      : nlpData.clarity_score >= 3 ? "#d97706" : "#dc2626"
                                      : "#e5e7eb",
                              }} />
                          ))}
                      </div>
                      <span style={{
                          fontSize: "0.78rem", fontWeight: 700,
                          color: nlpData.clarity_score >= 4 ? "#16a34a"
                              : nlpData.clarity_score >= 3 ? "#d97706" : "#dc2626",
                      }}>
                          {nlpData.clarity_score}/5 — {
                              nlpData.clarity_score >= 4 ? "Clear" :
                              nlpData.clarity_score >= 3 ? "Moderate" : "Vague"
                          }
                      </span>
                  </div>
              </div>
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

      console.log("Interview created successfully");
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
          <IoIosWarning /> {error}
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

  function getAvailableTransitionsLocal() {
    return getAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal });
  }

  async function submitForApproval(proposedStatus, changeDetails) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_status_history`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_report_id: caseData.id,
          proposed_status: proposedStatus,
          changed_by_id: userId,
          changed_by_role: userRole,
          notes: changeDetails.notes,
          form_data: changeDetails.formData,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit.");
      setCaseData((prev) => ({
        ...prev,
        status: proposedStatus,
        pendingApproval: null,
        statusHistory: [
          ...(prev.statusHistory || []),
          { status: proposedStatus, date: new Date().toLocaleDateString("en-PH"), by: actorName, notes: changeDetails.notes, formData: changeDetails.formData },
        ],
      }));
      showToast(`Status updated to "${proposedStatus}".`);
      setModal(null);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  const transitions = getAvailableTransitionsLocal();
  const canOpenStatusModal = transitions.length > 0 || !!STATUS_MODAL_MAP[caseData.status];
  const [caseTypeVal, setCaseTypeVal] = useState(Array.isArray(caseData.caseType) ? caseData.caseType : caseData.caseType ? [caseData.caseType] : []);
  const [caseCatVal, setCaseCatVal] = useState(caseData.caseCategory || "");
  const [alsoCatVal, setAlsoCatVal] = useState(Array.isArray(caseData.alsoInvolves) ? caseData.alsoInvolves : []);
  const [referralVal, setReferralVal] = useState(caseData.referralBody || "");
  const [referralReq, setReferralReq] = useState(caseData.referralRequired ? "yes" : "no");
  const [endorseNotes, setEndorseNotes] = useState("");
  const [paralegalVal, setParalegalVal] = useState(caseData.assignedParalegal || "");
  const [internalNotes, setInternalNotes] = useState(caseData.internalNotes || "");
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [noteLogs, setNoteLogs] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const getLogId = (log) => log.case_report_log_id || log.id || log.log_id;
  const getLogDate = (log) => log.performed_at || log.created_at || log.updated_at;
  const formatLogDate = (dateStr) => {
    if (!dateStr) return "Date unavailable";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-PH", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(",", "");
  };

  useEffect(() => {
    if (!caseData.id) return;
    const fetchNoteLogs = async () => {
      setNotesLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_report_logs/case/${caseData.id}`, { credentials: "include" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to load notes.");
        setNoteLogs((body.data || []).filter((log) => log.action_type === "internal_note"));
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNoteLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.id]);

  async function saveInternalNote() {
    const trimmed = internalNotes.trim();
    if (!trimmed) return showToast("Please enter a note before saving.", "error");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_report_logs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_report_id: caseData.id, action_type: "internal_note", remarks: trimmed, performed_by_user_id: userId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save note.");
      setNoteLogs((prev) => [body, ...prev]);
      setInternalNotes("");
      setShowNoteComposer(false);
      setCaseData((p) => ({ ...p, internalNotes: trimmed }));
      showToast("Note posted.");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function saveEditedNote(log) {
    const trimmed = editingNoteText.trim();
    if (!trimmed) return showToast("Note cannot be empty.", "error");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const id = getLogId(log);
      const res = await fetch(`${API_URL}/api/case_report_logs/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to update note.");
      setNoteLogs((prev) => prev.map((item) => getLogId(item) === id ? (body.data || { ...item, remarks: trimmed }) : item));
      setEditingNoteId(null);
      setEditingNoteText("");
      showToast("Note updated.");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteNote(log) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const id = getLogId(log);
      const res = await fetch(`${API_URL}/api/case_report_logs/${id}`, { method: "DELETE", credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete note.");
      setNoteLogs((prev) => prev.filter((item) => getLogId(item) !== id));
      setEditingNoteId(null);
      setEditingNoteText("");
      showToast("Note deleted.");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function saveAssessment(payload, onSuccess) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, case_officer_id: userId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      onSuccess();
      setModal(null);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {caseData.pendingApproval && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde047", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#92400e" }}>
          <FiClock style={{ flexShrink: 0, marginTop: 2 }} />
          <div><strong>Pending Admin Approval:</strong> A status change to <strong>{caseData.pendingApproval.proposedStatus}</strong> has been submitted by {caseData.pendingApproval.submittedBy} and is awaiting admin review.</div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Actions</h2>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          {canOpenStatusModal && !caseData.pendingApproval && <button onClick={() => setModal("statusRouter")} style={btnStyle("#037F81")}>Update Status</button>}
          <button onClick={() => setModal("setCaseType")} style={btnStyle("#037F81")}>Set Case Type</button>
          <button onClick={() => setModal("setCategory")} style={btnStyle("#037F81")}>Set Category</button>
          {isCaseOfficer && caseData.isWillingForInterview === true && <button onClick={() => setModal("inviteInterview")} style={btnStyle("#037F81")}>Invite to Interview</button>}
          <button onClick={() => setModal("referralEndorse")} style={btnStyle("#037F81")}>Referral / Endorse</button>
          {caseData.status === "Verified - True" && <button onClick={() => setModal("assignParalegal")} style={btnStyle("#037F81")}>Assign Paralegal</button>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Current Case Assignment</h2>
        <div className={styles.detailGrid}>
          {[
            ["Assigned Case Officer", caseData.assignedOfficer || "Unassigned"],
            ["Assigned Paralegal", caseData.assignedParalegal || (caseData.status === "Verified - True" ? "Pending assignment" : "Unassigned")],
            ["Case Type", Array.isArray(caseData.caseType) ? caseData.caseType.join(", ") : caseData.caseType || "Not yet classified"],
            ["Case Categories", caseData.caseCategory ? caseData.alsoInvolves?.length ? `${caseData.caseCategory} (also: ${caseData.alsoInvolves.join(", ")})` : caseData.caseCategory : "Not yet classified"],
            ["Referral Required", caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body", caseData.referralBody || "Unassigned"],
            ["Endorsement Status", caseData.endorsementStatus || "Not yet endorsed"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}><p className={styles.detailKey}>{k}</p><p className={styles.detailVal}>{v}</p></div>
          ))}
        </div>
      </section>

      <StatusDetailsSection
        caseData={caseData}
        styles={styles}
        title="Case Management Details"
        emptyText="No case management status details have been saved yet."
      />

      <section className={styles.section}>
        <div className={styles.noteSectionHeader}>
          <h2 className={styles.sectionHeadingText}>Internal Notes / Action Log</h2>
          <button type="button" className={styles.btnPrimary} onClick={() => setShowNoteComposer((open) => !open)}><FiPlus /> Add Notes</button>
        </div>
        {showNoteComposer && (
          <div className={styles.noteComposer}>
            <textarea placeholder="Add notes about case management actions, decisions, or observations..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className={styles.noteComposerTextarea} />
            <div className={styles.noteEditActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => { setInternalNotes(""); setShowNoteComposer(false); }}>Cancel</button>
              <button type="button" onClick={saveInternalNote} className={styles.btnPrimary}>Post Note</button>
            </div>
          </div>
        )}
        <div className={styles.noteLogList}>
          {notesLoading ? <p className={styles.noteLogEmpty}>Loading notes...</p> : noteLogs.length === 0 ? <p className={styles.noteLogEmpty}>No internal notes posted yet.</p> : noteLogs.map((log) => {
            const id = getLogId(log);
            const isEditing = editingNoteId === id;
            return (
              <div key={id || `${log.performed_at}-${log.remarks}`} className={styles.noteLogItem}>
                <div className={styles.noteLogHeader}>
                  <div><p className={styles.noteLogAuthor}>{log.performed_by_name || log.performed_by || actorName || "Unknown user"}</p><p className={styles.noteLogMeta}>{formatLogDate(getLogDate(log))}</p></div>
                  <div className={styles.noteLogActions}>
                    <button type="button" className={styles.noteIconBtn} title="Edit note" aria-label="Edit note" onClick={() => { setEditingNoteId(id); setEditingNoteText(log.remarks || ""); }}><FiEdit2 /></button>
                    <button type="button" className={`${styles.noteIconBtn} ${styles.noteIconDanger}`} title="Delete note" aria-label="Delete note" onClick={() => deleteNote(log)}><FiTrash2 /></button>
                  </div>
                </div>
                {isEditing ? (
                  <div className={styles.noteEditWrap}>
                    <textarea className={styles.noteEditTextarea} value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} />
                    <div className={styles.noteEditActions}><button className={styles.btnSecondary} onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }}>Cancel</button><button className={styles.btnPrimary} onClick={() => saveEditedNote(log)}>Save</button></div>
                  </div>
                ) : <p className={styles.noteLogText}>{log.remarks || "No note content."}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <StatusHistorySection caseData={caseData} />

      <UpdateStatusModal open={modal === "statusRouter"} caseData={caseData} onClose={() => setModal(null)} onSubmit={submitForApproval} actorName={actorName} isAdmin={isAdmin} isCaseOfficer={isCaseOfficer} isLegal={isLegal} viewCaseMode includeCurrentStatus />

      {modal === "inviteInterview" && <InviteToInterviewModal open onClose={() => setModal(null)} caseData={caseData} actorName={actorName} userId={userId} userRole={userRole} showToast={showToast} />}

      <Modal open={modal === "setCaseType"} onClose={() => setModal(null)} title="Set Case Type" wide>
        <div className={styles.formGrid}>
          <FormGroup label="Case Type(s)" required>
            <div className={styles.checkGroup}>
              {VIOLENCE_TYPES.map((v) => <label key={v} className={styles.checkLabel}><input type="checkbox" className={styles.checkInput} checked={caseTypeVal.includes(v)} onChange={() => setCaseTypeVal((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])} />{v}</label>)}
            </div>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={caseTypeVal.length === 0} onClick={() => saveAssessment({ case_type: caseTypeVal }, () => { setCaseData((p) => ({ ...p, caseType: caseTypeVal })); showToast("Case type updated."); })}>Save</button></div>
      </Modal>

      <Modal open={modal === "setCategory"} onClose={() => setModal(null)} title="Set Category" wide>
        <div className={styles.formGrid}>
          <FormGroup label="Case Category" required>
            <FSelect value={caseCatVal} onChange={(e) => { setCaseCatVal(e.target.value); setAlsoCatVal((prev) => prev.filter((c) => c !== e.target.value)); }}><option value="">Select case category</option><option value="Physical">Physical</option><option value="Virtual">Virtual</option><option value="Verbal">Verbal</option></FSelect>
          </FormGroup>
          <FormGroup label="Also involves (optional)">
            <div className={styles.checkGroup}>{["Physical", "Virtual", "Verbal"].filter((c) => c !== caseCatVal).map((c) => <label key={c} className={styles.checkLabel}><input type="checkbox" className={styles.checkInput} checked={alsoCatVal.includes(c)} onChange={() => setAlsoCatVal((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />{c}</label>)}</div>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={!caseCatVal} onClick={() => saveAssessment({ primary_category: caseCatVal, additional_categories: alsoCatVal }, () => { setCaseData((p) => ({ ...p, caseCategory: caseCatVal, alsoInvolves: alsoCatVal })); showToast("Category updated."); })}>Save</button></div>
      </Modal>

      <Modal open={modal === "referralEndorse"} onClose={() => setModal(null)} title="Referral / Endorse Case">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Referral required?"><FSelect value={referralReq} onChange={(e) => { setReferralReq(e.target.value); if (e.target.value === "no") setReferralVal(""); }}><option value="no">No</option><option value="yes">Yes</option></FSelect></FormGroup>
          {referralReq === "yes" && <FormGroup label="Referral / Endorsement Body" required><FSelect value={referralVal} onChange={(e) => setReferralVal(e.target.value)}><option value="">Select body</option>{ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}</FSelect></FormGroup>}
          {referralReq === "yes" && <FormGroup label="Referral / endorsement notes"><FTextarea placeholder="Explain basis for referral or endorsement and any supporting details..." value={endorseNotes} onChange={(e) => setEndorseNotes(e.target.value)} /></FormGroup>}
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={referralReq === "yes" && !referralVal} onClick={() => {
          const referralRequired = referralReq === "yes";
          const selectedBody = referralRequired ? referralVal : null;
          saveAssessment({ referral_required: referralRequired, referral_body: selectedBody, endorsement: selectedBody ? { endorsed_to: selectedBody, notes: endorseNotes, date: new Date().toISOString() } : null }, () => { setCaseData((p) => ({ ...p, referralRequired, referralBody: selectedBody, endorsementStatus: selectedBody ? `Endorsed to ${selectedBody}` : p.endorsementStatus })); showToast(selectedBody ? `Case referred and endorsed to ${selectedBody}.` : "Referral details updated."); });
        }}>Save</button></div>
      </Modal>

      <Modal open={modal === "assignParalegal"} onClose={() => setModal(null)} title="Assign Paralegal">
        <div className={styles.formGrid}><FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup><FormGroup label="Assign Paralegal" required><FSelect value={paralegalVal} onChange={(e) => setParalegalVal(e.target.value)}><option value="">Select paralegal</option>{PARALEGALS.map((p) => <option key={p} value={p}>{p}</option>)}</FSelect></FormGroup></div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={!paralegalVal} onClick={() => saveAssessment({ assigned_paralegal: paralegalVal }, () => { setCaseData((p) => ({ ...p, assignedParalegal: paralegalVal })); showToast("Paralegal assigned."); })}>Assign</button></div>
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
          <h2 className={styles.sectionHeadingText}>Perpetrator Information</h2>
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
          <h2 className={styles.sectionHeadingText}>Witness Information</h2>
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
  const [hasInterviewRecord, setHasInterviewRecord] = useState(false);
  const [interviewsChecked, setInterviewsChecked] = useState(false);
  const [toast, setToast]       = useState(null);
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [undoWithdrawModalOpen, setUndoWithdrawModalOpen] = useState(false);

  const isAdmin      = user.role?.toLowerCase() === "admin";
  const isCaseOfficer = user.role?.toLowerCase() === "case officer" || user.role?.toLowerCase() === "case_officer";
  const isLegal      = user.role?.toLowerCase() === "legal personnel" || user.role?.toLowerCase() === "legal_personnel";
  const isStaff      = isAdmin || isCaseOfficer || isLegal;

  const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Officer";

  const backRoute = isStaff
    ? "/cases"
    : fromParam === "dashboard" ? "/dashboard" : "/cases/history";
  const backLabel = isStaff
    ? "Back to Case Management"
    : fromParam === "dashboard" ? "Back to Dashboard" : "Back to Report History";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleWithdraw = async (id) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_reports/${id}/withdraw`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to withdraw case.");
      showToast("Case withdrawn successfully.");
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUndoWithdraw = async (id) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/case_reports/${id}/undo_withdraw`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to undo withdrawal.");
      showToast("Withdrawal undone successfully.");
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

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

        const historyRes = await fetch(`${API_URL}/api/case_status_history/${data.case_report_id}?staffView=true`, { credentials: "include" });
        if (historyRes.ok) {
          const historyJson = await historyRes.json().catch(() => ({}));
          const statusHistory = historyJson.data || [];
          if (statusHistory.length > 0) {
            setCaseData((prev) => ({
              ...prev,
              statusHistory: [
                ...(prev.statusHistory || []).filter((h) => h.notes === "Report received and logged."),
                ...statusHistory,
              ],
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

  useEffect(() => {
    if (!userLoaded || !caseData?.id) return;
    if (isStaff) return;

    let cancelled = false;
    const fetchInterviewAccess = async () => {
      setInterviewsChecked(false);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${API_URL}/api/interviews?type=case_report&case_report_id=${caseData.id}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to check interview invitation");
        const json = await res.json();
        if (!cancelled) {
          setHasInterviewRecord(Array.isArray(json.data) && json.data.length > 0);
        }
      } catch {
        if (!cancelled) setHasInterviewRecord(false);
      } finally {
        if (!cancelled) setInterviewsChecked(true);
      }
    };

    fetchInterviewAccess();
    return () => {
      cancelled = true;
    };
  }, [caseData?.id, isStaff, userLoaded]);

  const showInterviewTab =
    Boolean(caseData?.isWillingForInterview) &&
    (isStaff || (interviewsChecked && hasInterviewRecord));
  const displayedActiveTab =
    activeTab === "interview" && !showInterviewTab ? "details" : activeTab;

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
    ...(showInterviewTab ? [
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
    borderBottom: displayedActiveTab === id ? "2px solid #037F81" : "2px solid transparent",
    background: "none",
    color: displayedActiveTab === id ? "#037F81" : "#6b7280",
    fontWeight: displayedActiveTab === id ? 700 : 500,
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
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <StatusBadge status={caseData.status} />
              {!isStaff && (caseData.status === "For Verification" || caseData.status === "Undergoing Review") && (
                <button
                  style={{ background: "#6b7280", padding: "6px 14px", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  Withdraw
                </button>
              )}
              {!isStaff && caseData.status === "Withdrawn" && (
                <button
                  style={{ background: "#10b981", padding: "6px 14px", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => setUndoWithdrawModalOpen(true)}
                >
                  Undo Withdraw
                </button>
              )}
            </div>
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
          {displayedActiveTab === "details" && userLoaded && (
            <CaseDetailsTab caseData={caseData} isStaff={isStaff} />
          )}

          {displayedActiveTab === "interview" && showInterviewTab && userLoaded && (
            <InterviewTab
              caseData={caseData}
              isStaff={isStaff}
              isCaseOfficer={isCaseOfficer}
              showToast={showToast}
              userId={user.id} 
            />
          )}

          {displayedActiveTab === "management" && isStaff && userLoaded && (
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

          {displayedActiveTab === "nlp" && isStaff && userLoaded && (
            <NLPAnalysisTab caseReportId={caseData.id} isAdmin={isAdmin} />
          )}

        </div>
        
        {/* Withdraw Modals */}
        <Modal open={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} title="Withdraw Case Report">
          <p className={styles.formDesc}>
            Are you sure you want to withdraw this case report? This action will stop the current progress, but it can be undone later if needed.
          </p>
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={() => setWithdrawModalOpen(false)}>Cancel</button>
            <button className={styles.btnPrimary} style={{ background: "#dc2626", borderColor: "#dc2626" }} onClick={() => { setWithdrawModalOpen(false); handleWithdraw(caseData.id); }}>Confirm Withdraw</button>
          </div>
        </Modal>

        <Modal open={undoWithdrawModalOpen} onClose={() => setUndoWithdrawModalOpen(false)} title="Undo Withdrawal">
          <p className={styles.formDesc}>
            Are you sure you want to undo the withdrawal of this case report? Your report will return to its previous status.
          </p>
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={() => setUndoWithdrawModalOpen(false)}>Cancel</button>
            <button className={styles.btnPrimary} onClick={() => { setUndoWithdrawModalOpen(false); handleUndoWithdraw(caseData.id); }}>Confirm Undo</button>
          </div>
        </Modal>

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
