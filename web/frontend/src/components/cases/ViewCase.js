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
import { MdAlert } from  "react-icons/md";
import { IoIosArrowBack, IoIosWarning, IoIosAlert } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import styles from "./ViewCase.module.css";
import duplicateStyles from "./DuplicateCheckTab.module.css";
import InterviewTab from "./interview/InterviewTab";
import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModals";
import StatusDetailsSection from "./StatusDetailsSection";
import DetailAccordion from "./DetailAccordion";
import PendingStatusApproval from "./PendingStatusApproval";
import CaseDetailsPage from "./CaseDetailsPage";
import CaseUpdatesTab from "./CaseUpdatesTab";
import PublicMessageField from "./PublicMessageField";
import FollowUpsPanel, {
  FollowUpBadge,
  FollowUpCaseHistory,
  FollowUpComposer,
} from "./FollowUps";
import Tooltip from "@/components/ui/Tooltip";
import {
  getWithdrawalActionType,
  getWithdrawalCopy,
  WITHDRAWAL_ACTION,
} from "@/lib/caseWithdrawal";
import { useAuth, authFetch } from "@/lib/AuthContext";
import { API_URL } from "@/lib/config";

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

const mapCaseReportToViewData = (data) => {
  const caseYear = new Date(data.created_at).getFullYear();
  return {
    reportData:           data,
    id:                   data.case_report_id,
    caseId:               `${caseYear}-` + String(data.case_report_id).padStart(3, "0"),
    reporterId:           data.complainant_user_id,
    region:               data.incident_province || data.incident_city || "Not provided",
    status:               STATUS_STEP[data.case_status_id] || "For Verification",
    assignedOfficer:      data.assigned_officer || null,
    dateSubmitted: new Date(data.created_at).toLocaleDateString("en-PH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    description:          data.incident_description || "No incident description provided.",
    requestedOutcome:     data.action_requested || [],
    evidences:            data.evidences || [],
    incidentLocationType: data.incident_location_type || null,
    incidentCity:         data.incident_city,
    incidentLocation:     data.incident_location,
    incidentLocationDisplay: data.incident_location_type === "Online"
      ? data.incident_location || "Online"
      : data.incident_location_type === "Physical Location" ? [data.incident_location, data.incident_city, "NCR"].filter(Boolean).join(", ") : data.incident_city || "Not provided",
    incidentDate:         data.incident_date || null,
    incidentYear:         data.incident_year ?? null,
    incidentMonth:        data.incident_month ?? null,
    incidentDay:          data.incident_day ?? null,
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
    assignedLegal:           (data.assigned_legal || []).map((person) => ({
      ...person,
      assignment_role: person.assignment_role === "legal_officer" ? "lawyer" : person.assignment_role,
    })),
    endorsementStatus:       data.endorsement_status || null,
    internalNotes:           data.internal_notes || null,
    pendingApproval:         null,
    followUpSummary:         data.follow_up_summary || null,
    followUps:               [],
    withdrawalRequest:       data.withdrawal_request || null,
    possibleDuplicates:      data.possible_duplicates || [],
    statusHistory: [
      {
        status: STATUS_STEP[data.case_status_id] || "For Verification",
        date:   new Date(data.created_at).toLocaleDateString("en-PH"),
        by:     data.assigned_officer || "System",
        notes:  "Report received and logged.",
      },
    ],
  };
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

const CASE_TYPE_DESCRIPTIONS = {
  "Sexual harassment": "Unwanted sexual remarks, advances, requests, or conduct in person.",
  "Online sexual harassment": "Sexual harassment through chat, social media, email, calls, or digital platforms.",
  "Non-consensual sharing of intimate images/videos": "Including threats to leak them.",
  "Sexual assault / unwanted sexual touching": "Groping, forced kissing, coercive contact.",
  "Rape / attempted rape": "Including attempted forced sexual penetration.",
  "Child sexual abuse": "Any sexual act, grooming, exploitation, or coercion involving a minor.",
  "Sexual exploitation / trafficking-related sexual abuse": "Including exchange-based coercion or abuse tied to power, money, or favors.",
  "Stalking with sexual nature or intent": "Persistent following, monitoring, threats, or repeated unwanted contact with sexual overtones.",
  "Gender-based sexual harassment in institutions": "School, workplace, organization, training, or Scouting-related settings.",
};

const OFFICERS    = ["Alexa Gagan", "Marco Santos", "Ryan Dela Paz", "Ben Mercado", "Camille Torres"];

// ─── Descriptions for complainants (from sasha-explain.md) ───────────────────

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
                <p className={styles.historyMeta}>{h.date} - {h.by}</p>
                {h.notes && <p className={styles.historyNotes}>{h.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
          <Tooltip text="Close dialog">
            <button className={styles.modalClose} onClick={onClose} aria-label="Close dialog"><FiX /></button>
          </Tooltip>
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

export function NLPAnalysisTab({ caseReportId, isAdmin, onRequestClarification }) {
  const [nlpData, setNlpData]     = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus, setNlpStatus]   = useState(null);

  useEffect(() => {
    if (!caseReportId) return;
    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/case_reports/${caseReportId}/nlp`);
        if (res.status === 202 || res.status === 404) {
          setNlpData(null);
          setNlpStatus("processing");
          return;
        }
        if (!res.ok) {
          setNlpData(null);
          setNlpStatus(res.status === 502 ? "failed" : "error");
          return;
        }
        const json = await res.json();
        setNlpData(json.data || json);
        setNlpStatus(null);
      } catch {
        setNlpData(null);
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
      <div className={styles.nlpClassificationCard} style={{ background: c.bg, borderColor: c.border }}>
        <span className={`${styles.nlpBadge} ${type === "category" ? styles.nlpBadgeCategory : styles.nlpBadgeType}`}>
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
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#9a3412", display: "flex", gap: 8, alignItems: "flex-start" }}>
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

      {nlpStatus === "failed" && !nlpLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#991b1b" }}>
          <FiAlertCircle style={{ flexShrink: 0 }} />
          NLP analysis failed on the server. Check the backend NLP service URL and logs, then rerun analysis for this case.
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
              Suggested Classification
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

          <div className={`${styles.nlpResultBox} ${nlpData.referral_suggested ? styles.nlpResultWarning : styles.nlpResultSuccess}`}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700 }}>
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
                  <span style={{ fontSize: "1.1rem", flexShrink: 0, margin: 0, color: "#92400e"  }}><IoIosAlert /></span>
                  <div>
                      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#92400e" }}>
                          Report Needs Clarification
                      </p>
                      <p style={{ margin: "4px 0 8px", fontSize: "0.82rem", color: "#78350f", lineHeight: 1.6 }}>
                          {nlpData.clarification_reason}
                      </p>
                      <button
                          onClick={onRequestClarification}
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
                      Report Structure Assessment
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                          { key: "has_introduction", label: "Introduction", notes: nlpData.report_structure.introduction_notes },
                          { key: "has_body",         label: "Body",         notes: nlpData.report_structure.body_notes },
                          { key: "has_conclusion",   label: "Conclusion",   notes: nlpData.report_structure.conclusion_notes },
                      ].map(({ key, label, notes }) => (
                          <div
                              key={key}
                              className={`${styles.nlpStructureItem} ${nlpData.report_structure[key] ? styles.nlpStructurePass : styles.nlpStructureFail}`}
                          >
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
      
      const interviewRes = await authFetch(`${API_URL}/api/interviews`, {
        method: "POST",
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

function AssessmentActionGroup({ title, records, fields, emptyText }) {
  return (
    <DetailAccordion
      title={title}
      summary={`${records.length} saved update${records.length === 1 ? "" : "s"}`}
    >
      {records.length === 0 ? (
        <p className={styles.emptyState}>{emptyText}</p>
      ) : (
        records.map((record, index) => (
          <div key={record.case_assessment_id || `${title}-${record.created_at}-${index}`} className={styles.reviewDetailBlock}>
            <p className={styles.historyMeta}>
              {record.created_at
                ? new Date(record.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
                : "Date unavailable"}
            </p>
            <div className={styles.detailGrid}>
              {fields(record).map(([label, value]) => {
                const formatted = Array.isArray(value) ? value.filter(Boolean).join(", ") : value;
                if (formatted === undefined || formatted === null || String(formatted).trim() === "") return null;
                return (
                  <div key={label} className={styles.detailItem}>
                    <p className={styles.detailKey}>{label}</p>
                    <p className={styles.detailVal}>{formatted}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </DetailAccordion>
  );
}

function CaseManagementTab({
  caseData,
  setCaseData,
  isAdmin,
  isCaseOfficer,
  isLegal,
  actorName,
  userId,
  userRole,
  showToast,
  onOpenDuplicateCheck,
  onOpenNlpAnalysis,
  onRequestClarification,
}) {
  const [modal, setModal] = useState(null);

  function getAvailableTransitionsLocal() {
    return getAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal });
  }

  async function submitForApproval(proposedStatus, changeDetails) {
    try {
      const res = await authFetch(`${API_URL}/api/case_status_history`, {
        method: "POST",
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
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to submit.");
      const historyId = payload.historyRow?.history_id;
      setCaseData((prev) => ({
        ...prev,
        status: payload.requiresApproval ? prev.status : proposedStatus,
        pendingApproval: payload.requiresApproval ? {
          historyId,
          proposedStatus,
          ...changeDetails,
        } : null,
        statusHistory: [
          ...(prev.statusHistory || []),
          {
            historyId,
            status: proposedStatus,
            date: new Date().toLocaleDateString("en-PH"),
            by: actorName,
            notes: changeDetails.notes,
            formData: changeDetails.formData,
            approvalStatus: payload.requiresApproval ? "pending" : "approved",
          },
        ],
      }));
      showToast(payload.message || `Status updated to "${proposedStatus}".`);
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
  const [referralPublicUpdate, setReferralPublicUpdate] = useState({ isPublic: false, publicMessage: "" });
  const [internalNotes, setInternalNotes] = useState(caseData.internalNotes || "");
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [noteLogs, setNoteLogs] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [nlpSuggestion, setNlpSuggestion] = useState(null);
  const [nlpSuggestionLoading, setNlpSuggestionLoading] = useState(false);

  const hasSavedCaseType = Boolean(
    (Array.isArray(caseData.caseType) && caseData.caseType.length > 0) ||
    (!Array.isArray(caseData.caseType) && caseData.caseType) ||
    (caseData.assessmentHistory || []).some((record) =>
      Array.isArray(record.case_type)
        ? record.case_type.length > 0
        : Boolean(record.case_type)
    )
  );
  const hasSavedCategory = Boolean(
    caseData.caseCategory ||
    caseData.primaryCategory ||
    (caseData.assessmentHistory || []).some(
      (record) =>
        record.primary_category ||
      (record.additional_categories || []).length > 0
    )
  );
  const hasSuggestedCaseType = Boolean(nlpSuggestion?.case_types?.length);
  const hasSuggestedCategory = Boolean(nlpSuggestion?.primary_categories?.length);

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
        const res = await authFetch(`${API_URL}/api/case_report_logs/case/${caseData.id}`);
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

  useEffect(() => {
    if (
      !caseData.id ||
      !["setCaseType", "setCategory"].includes(modal) ||
      (hasSavedCaseType && hasSavedCategory)
    ) return;

    const fetchNlpSuggestion = async () => {
      setNlpSuggestionLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/case_reports/${caseData.id}/nlp`);
        if (!res.ok) return;

        const body = await res.json();
        const suggestion = body.data || body;
        setNlpSuggestion(suggestion);

        if (!hasSavedCaseType) {
          const suggestedTypes = (suggestion.case_types || [])
            .map((item) => typeof item === "string" ? item : item?.type)
            .filter((item) => VIOLENCE_TYPES.includes(item));
          setCaseTypeVal([...new Set(suggestedTypes)]);
        }

        if (!hasSavedCategory) {
          const suggestedCategories = (suggestion.primary_categories || [])
            .map((item) => typeof item === "string" ? item : item?.category)
            .filter((item) => ["Physical", "Virtual", "Verbal"].includes(item));
          const [primary, ...additional] = [...new Set(suggestedCategories)];
          setCaseCatVal(primary || "");
          setAlsoCatVal(additional);
        }
      } catch (_) {
        // Keep the forms manually editable when analysis is unavailable.
      } finally {
        setNlpSuggestionLoading(false);
      }
    };

    fetchNlpSuggestion();
  }, [caseData.id, modal, hasSavedCaseType, hasSavedCategory]);

  async function saveInternalNote() {
    const trimmed = internalNotes.trim();
    if (!trimmed) return showToast("Please enter a note before saving.", "error");
    try {
      const res = await authFetch(`${API_URL}/api/case_report_logs`, {
        method: "POST",
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
      const id = getLogId(log);
      const res = await authFetch(`${API_URL}/api/case_report_logs/${id}`, {
        method: "PATCH",
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
      const id = getLogId(log);
      const res = await authFetch(`${API_URL}/api/case_report_logs/${id}`, { method: "DELETE" });
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
      const res = await authFetch(`${API_URL}/api/case_assessments/case/${caseData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, case_officer_id: userId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save.");
      setCaseData((current) => ({
        ...current,
        assessmentHistory: body.data
          ? [body.data, ...(current.assessmentHistory || [])]
          : current.assessmentHistory || [],
      }));
      onSuccess(body.data);
      setModal(null);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function saveReferralEndorsement() {
    try {
      const referralRequired = referralReq === "yes";
      const selectedBody = referralRequired ? referralVal : null;

      await saveAssessment({
        referral_required: referralRequired,
        referral_body: selectedBody,
        endorsement: selectedBody ? { endorsed_to: selectedBody, notes: endorseNotes, date: new Date().toISOString() } : null,
      }, () => {
        setCaseData((p) => ({
          ...p,
          referralRequired,
          referralBody: selectedBody,
          endorsementStatus: selectedBody ? `Endorsed to ${selectedBody}` : null,
        }));
        showToast(selectedBody ? `Case referred and endorsed to ${selectedBody}.` : "Referral details updated.");
      });

      if (selectedBody && referralPublicUpdate.isPublic) {
        const res = await authFetch(`${API_URL}/api/case_report_logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_report_id: caseData.id,
            action_type: "referral_endorsed",
            remarks: endorseNotes || `Case referred and endorsed to ${selectedBody}.`,
            performed_by_user_id: userId,
            is_public: true,
            public_message: referralPublicUpdate.publicMessage,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to save public referral update.");
      }

      setReferralPublicUpdate({ isPublic: false, publicMessage: "" });
      setModal(null);
    } catch (err) {
      showToast(err.message || "Failed to save referral details.", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PendingStatusApproval
        caseData={caseData}
        setCaseData={setCaseData}
        isAdmin={isAdmin}
        approverId={userId}
        showToast={showToast}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Actions</h2>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          {canOpenStatusModal && !caseData.pendingApproval && <button onClick={() => setModal("statusRouter")} style={btnStyle("#037F81")}>Update Status</button>}
          <button onClick={() => setModal("setCaseType")} style={btnStyle("#037F81")}>Set Case Type</button>
          <button onClick={() => setModal("setCategory")} style={btnStyle("#037F81")}>Set Category</button>
          {isCaseOfficer && caseData.isWillingForInterview === true && <button onClick={() => setModal("inviteInterview")} style={btnStyle("#037F81")}>Invite to Interview</button>}
          <button onClick={() => setModal("referralEndorse")} style={btnStyle("#037F81")}>Referral / Endorse</button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Current Case Assignment</h2>
        <div className={styles.detailGrid}>
          {[
            ["Assigned Case Officer", caseData.assignedOfficer || "Unassigned"],
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

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Case Management Details</h2>
        <DetailAccordion
          title="Update Status"
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

        <AssessmentActionGroup
          title="Set Case Type"
          records={(caseData.assessmentHistory || []).filter((record) => Array.isArray(record.case_type) ? record.case_type.length > 0 : Boolean(record.case_type))}
          emptyText="No case type changes have been saved yet."
          fields={(record) => [["Case Type(s)", record.case_type]]}
        />

        <AssessmentActionGroup
          title="Set Category"
          records={(caseData.assessmentHistory || []).filter((record) => record.primary_category || (record.additional_categories || []).length > 0)}
          emptyText="No category changes have been saved yet."
          fields={(record) => [
            ["Primary Category", record.primary_category],
            ["Also Involves", record.additional_categories],
          ]}
        />

        <AssessmentActionGroup
          title="Referral / Endorse"
          records={(caseData.assessmentHistory || []).filter((record) =>
            record.referral_required !== null &&
            record.referral_required !== undefined
          )}
          emptyText="No referral or endorsement changes have been saved yet."
          fields={(record) => [
            ["Referral Required", record.referral_required ? "Yes" : "No"],
            ["Referral Body", record.referral_body || "None"],
            ["Endorsement Notes", record.endorsement?.notes],
          ]}
        />
      </section>

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
                    <Tooltip text="Edit this internal note">
                      <button type="button" className={styles.noteIconBtn} aria-label="Edit note" onClick={() => { setEditingNoteId(id); setEditingNoteText(log.remarks || ""); }}><FiEdit2 /></button>
                    </Tooltip>
                    <Tooltip text="Delete this internal note">
                      <button type="button" className={`${styles.noteIconBtn} ${styles.noteIconDanger}`} aria-label="Delete note" onClick={() => deleteNote(log)}><FiTrash2 /></button>
                    </Tooltip>
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

      <UpdateStatusModal
        open={modal === "statusRouter"}
        caseData={caseData}
        onClose={() => setModal(null)}
        onSubmit={submitForApproval}
        actorName={actorName}
        isAdmin={isAdmin}
        isCaseOfficer={isCaseOfficer}
        isLegal={isLegal}
        viewCaseMode
        includeCurrentStatus
        onOpenDuplicateCheck={() => {
          setModal(null);
          onOpenDuplicateCheck?.();
        }}
        onOpenNlpAnalysis={() => {
          setModal(null);
          onOpenNlpAnalysis?.();
        }}
        onRequestClarification={() => {
          setModal(null);
          onRequestClarification?.();
        }}
      />

      {modal === "inviteInterview" && <InviteToInterviewModal open onClose={() => setModal(null)} caseData={caseData} actorName={actorName} userId={userId} userRole={userRole} showToast={showToast} />}

      <Modal open={modal === "setCaseType"} onClose={() => setModal(null)} title="Set Case Type" wide>
        {!hasSavedCaseType && (
          <div className={styles.nlpApprovalNotice}>
            <FiInfo />
            <div>
              <strong>NLP-suggested classification</strong>
              <p>
                {nlpSuggestionLoading
                  ? "Loading the latest NLP analysis..."
                  : hasSuggestedCaseType
                    ? "Review the preselected result below. You may change it before approving."
                    : "No case type was suggested. Select the correct classification and save it."}
              </p>
            </div>
          </div>
        )}
        <div className={styles.formGrid}>
          <FormGroup label="Case Type(s)" required>
            <div className={styles.checkGroup}>
              {VIOLENCE_TYPES.map((v) => {
                const checked = caseTypeVal.includes(v);
                return (
                  <label key={v} className={`${styles.checkLabel} ${checked ? styles.checkLabelActive : ""}`}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={checked}
                      onChange={() => setCaseTypeVal((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                    />
                    <span className={styles.checkLabelText}>
                      <span className={styles.checkLabelTitle}>{v}</span>
                      {checked && CASE_TYPE_DESCRIPTIONS[v] && (
                        <span className={styles.checkDescription}>{CASE_TYPE_DESCRIPTIONS[v]}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={caseTypeVal.length === 0} onClick={() => saveAssessment({ case_type: caseTypeVal }, () => { setCaseData((p) => ({ ...p, caseType: caseTypeVal })); showToast(hasSuggestedCaseType && !hasSavedCaseType ? "Case type approved and saved." : "Case type saved."); })}>{hasSavedCaseType ? "Save Changes" : hasSuggestedCaseType ? "Approve Classification" : "Save"}</button></div>
      </Modal>

      <Modal open={modal === "setCategory"} onClose={() => setModal(null)} title="Set Category" wide>
        {!hasSavedCategory && (
          <div className={styles.nlpApprovalNotice}>
            <FiInfo />
            <div>
              <strong>NLP-suggested classification</strong>
              <p>
                {nlpSuggestionLoading
                  ? "Loading the latest NLP analysis..."
                  : hasSuggestedCategory
                    ? "Review the preselected primary and additional categories. You may change them before approving."
                    : "No category was suggested. Select the correct category and save it."}
              </p>
            </div>
          </div>
        )}
        <div className={styles.formGrid}>
          <FormGroup label="Case Category" required>
            <FSelect value={caseCatVal} onChange={(e) => { setCaseCatVal(e.target.value); setAlsoCatVal((prev) => prev.filter((c) => c !== e.target.value)); }}><option value="">Select case category</option><option value="Physical">Physical</option><option value="Virtual">Virtual</option><option value="Verbal">Verbal</option></FSelect>
          </FormGroup>
          <FormGroup label="Also involves (optional)">
            <div className={styles.checkGroup}>{["Physical", "Virtual", "Verbal"].filter((c) => c !== caseCatVal).map((c) => <label key={c} className={styles.checkLabel}><input type="checkbox" className={styles.checkInput} checked={alsoCatVal.includes(c)} onChange={() => setAlsoCatVal((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />{c}</label>)}</div>
          </FormGroup>
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={!caseCatVal} onClick={() => saveAssessment({ primary_category: caseCatVal, additional_categories: alsoCatVal }, () => { setCaseData((p) => ({ ...p, caseCategory: caseCatVal, primaryCategory: caseCatVal, alsoInvolves: alsoCatVal, additionalCategories: alsoCatVal })); showToast(hasSuggestedCategory && !hasSavedCategory ? "Category approved and saved." : "Category saved."); })}>{hasSavedCategory ? "Save Changes" : hasSuggestedCategory ? "Approve Classification" : "Save"}</button></div>
      </Modal>

      <Modal open={modal === "referralEndorse"} onClose={() => setModal(null)} title="Referral / Endorse Case">
        <div className={styles.formGrid}>
          <FormGroup label="Case ID"><FInput value={caseData.caseId} disabled /></FormGroup>
          <FormGroup label="Referral required?"><FSelect value={referralReq} onChange={(e) => { setReferralReq(e.target.value); if (e.target.value === "no") setReferralVal(""); }}><option value="no">No</option><option value="yes">Yes</option></FSelect></FormGroup>
          {referralReq === "yes" && <FormGroup label="Referral / Endorsement Body" required><FSelect value={referralVal} onChange={(e) => setReferralVal(e.target.value)}><option value="">Select body</option>{ENDORSEMENT_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}</FSelect></FormGroup>}
          {referralReq === "yes" && <FormGroup label="Referral / endorsement notes"><FTextarea placeholder="Explain basis for referral or endorsement and any supporting details..." value={endorseNotes} onChange={(e) => setEndorseNotes(e.target.value)} /></FormGroup>}
          {referralReq === "yes" && (
            <PublicMessageField
              actionType="referral_endorsed"
              contextFields={{ institution: referralVal }}
              value={referralPublicUpdate}
              onChange={setReferralPublicUpdate}
            />
          )}
        </div>
        <div className={styles.modalFooter}><button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button><button className={styles.btnPrimary} disabled={referralReq === "yes" && !referralVal} onClick={saveReferralEndorsement}>Save</button></div>
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

function DuplicateComparePanel({ currentCase, compareCase, loading, error }) {
  const rows = [
    ["Complainant", currentCase?.name, compareCase?.name],
    ["Email", currentCase?.email, compareCase?.email],
    ["Contact", currentCase?.contactNumber, compareCase?.contactNumber],
    ["Incident Date", currentCase?.incidentDate, compareCase?.incidentDate],
    ["Location", currentCase?.incidentLocationDisplay, compareCase?.incidentLocationDisplay],
    ["Case Category", currentCase?.caseCategory || currentCase?.primaryCategory, compareCase?.caseCategory || compareCase?.primaryCategory],
    ["Status", currentCase?.status, compareCase?.status],
  ];

  return (
    <section className={duplicateStyles.comparePanel}>
      <div className={duplicateStyles.compareHeader}>
        <div>
          <p className={duplicateStyles.compareEyebrow}>Duplicate comparison</p>
          <h2 className={duplicateStyles.compareTitle}>
            {currentCase.caseId} vs {compareCase?.caseId || "matched case"}
          </h2>
        </div>
      </div>

      {loading ? (
        <p className={duplicateStyles.compareState}>Loading matched case...</p>
      ) : error ? (
        <p className={duplicateStyles.compareState}>{error}</p>
      ) : compareCase ? (
        <>
          <div className={duplicateStyles.compareGrid}>
            <div className={duplicateStyles.compareCaseCard}>
              <span className={duplicateStyles.compareCaseLabel}>Current report</span>
              <strong>{currentCase.caseId}</strong>
            </div>
            <div className={duplicateStyles.compareCaseCard}>
              <span className={duplicateStyles.compareCaseLabel}>Possible duplicate</span>
              <strong>{compareCase.caseId}</strong>
            </div>
          </div>

          <div className={duplicateStyles.compareTable}>
            {rows.map(([label, currentValue, compareValue]) => (
              <div className={duplicateStyles.compareRow} key={label}>
                <div className={duplicateStyles.compareField}>{label}</div>
                <div className={duplicateStyles.compareValue}>{currentValue || "Not provided"}</div>
                <div className={duplicateStyles.compareValue}>{compareValue || "Not provided"}</div>
              </div>
            ))}
            <div className={`${duplicateStyles.compareRow} ${duplicateStyles.compareDescriptionRow}`}>
              <div className={duplicateStyles.compareField}>Description</div>
              <div className={duplicateStyles.compareValue}>{currentCase.description || "Not provided"}</div>
              <div className={duplicateStyles.compareValue}>{compareCase.description || "Not provided"}</div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function DuplicateCheckTab({
  caseData,
  compareCaseId,
  compareCaseData,
  compareLoading,
  compareError,
  onDismiss,
  onViewCompare,
  onCloseCompare,
}) {
  const matches = caseData.possibleDuplicates || [];

  return (
    <div className={duplicateStyles.reviewShell}>
      <section className={duplicateStyles.summaryPanel}>
        <div>
          <p className={duplicateStyles.summaryEyebrow}>Duplicate check</p>
          <h2 className={duplicateStyles.summaryTitle}>
            Possible duplicate report{matches.length === 1 ? "" : "s"}
          </h2>
          <p className={duplicateStyles.summaryText}>
            Review these matches before proceeding. This warning does not block case work.
          </p>
        </div>
        <span className={duplicateStyles.summaryCount}>
          {matches.length} match{matches.length === 1 ? "" : "es"}
        </span>
      </section>

      {matches.length > 0 ? (
        <div className={duplicateStyles.matchList}>
          {matches.map((match) => {
            const isComparing = String(compareCaseId) === String(match.matched_case_report_id);
            return (
              <article
                key={match.duplicate_match_id}
                className={`${duplicateStyles.matchCard} ${
                  isComparing
                    ? duplicateStyles.matchCardActive
                    : ""
                }`}
              >
                <div className={duplicateStyles.matchInfo}>
                  <div className={duplicateStyles.matchMeta}>
                    <a
                      href={`/cases/view?caseId=${match.matched_case_report_id}`}
                      className={duplicateStyles.matchCaseLink}
                    >
                      Case #{match.matched_case_report_id}
                    </a>
                    <span className={duplicateStyles.matchScore}>
                      {Number(match.similarity_score)}% match
                    </span>
                  </div>
                  <div className={duplicateStyles.fieldPills}>
                    {(match.matched_fields || []).map((field) => (
                      <span key={field}>{field}</span>
                    ))}
                  </div>
                </div>
                <div className={duplicateStyles.matchActions}>
                  <button
                    type="button"
                    className={duplicateStyles.primaryButton}
                    onClick={() => isComparing ? onCloseCompare() : onViewCompare(match.matched_case_report_id)}
                  >
                    {isComparing ? "Close" : "View"}
                  </button>
                  <button
                    type="button"
                    className={duplicateStyles.secondaryButton}
                    onClick={() => onDismiss(match.duplicate_match_id)}
                  >
                    Not a duplicate
                  </button>
                </div>
                {isComparing && (
                  <div className={duplicateStyles.inlineCompare}>
                    <DuplicateComparePanel
                      currentCase={caseData}
                      compareCase={compareCaseData}
                      loading={compareLoading}
                      error={compareError}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className={duplicateStyles.emptyState}>
          <strong>No active duplicate warnings</strong>
          <p>All detected matches have been dismissed or no possible duplicate reports were found.</p>
        </section>
      )}
    </div>
  );
}

export default function ViewCase() {
  
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();

  const caseId    = searchParams.get("caseId");
  const fromParam = searchParams.get("from");
  const compareCaseId = searchParams.get("compareCaseId");
  const initialTab = compareCaseId ? "duplicates" : searchParams.get("tab") || "details";

  const [caseData, setCaseData] = useState(null);
  const [compareCaseData, setCompareCaseData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hasInterviewRecord, setHasInterviewRecord] = useState(false);
  const [interviewsChecked, setInterviewsChecked] = useState(false);
  const [toast, setToast]       = useState(null);
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAffidavit, setWithdrawAffidavit] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [followUpComposerOpen, setFollowUpComposerOpen] = useState(false);
  const [caseRefreshKey, setCaseRefreshKey] = useState(0);

  const user = {
    role: authUser?.role_name || authUser?.role || null,
    firstName: authUser?.first_name || "",
    lastName: authUser?.last_name || "",
    id: authUser?.user_id || authUser?.id || null,
  };
  const userLoaded = !authLoading;
  const normalizedRole = user.role?.toLowerCase();
  const isAdmin      = normalizedRole === "admin";
  const isCaseOfficer = normalizedRole === "case officer" || normalizedRole === "case_officer";
  const isLegal      = normalizedRole === "legal personnel" || normalizedRole === "legal_personnel";
  const isStaff      = isAdmin || isCaseOfficer || isLegal;
  const canManageFollowUps = isAdmin || isCaseOfficer;

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

  const goToDuplicateTab = () => {
    setActiveTab("duplicates");
    router.push(`/cases/view?caseId=${caseData.id}&tab=duplicates`);
  };

  const goToNlpAnalysisTab = () => {
    setActiveTab("nlp");
    router.push(`/cases/view?caseId=${caseData.id}&tab=nlp`);
  };

  const requestClarificationFromAnalysis = () => {
    setActiveTab("follow-ups");
    router.push(`/cases/view?caseId=${caseData.id}&tab=follow-ups`);
    setFollowUpComposerOpen(true);
  };

  const viewDuplicateCompare = (matchedCaseId) => {
    setActiveTab("duplicates");
    router.push(`/cases/view?caseId=${caseData.id}&tab=duplicates&compareCaseId=${matchedCaseId}`);
  };

  const closeDuplicateCompare = () => {
    router.push(`/cases/view?caseId=${caseData.id}&tab=duplicates`);
  };

  const dismissDuplicate = async (matchId) => {
    const response = await authFetch(
      `${API_URL}/api/case_reports/${caseData.id}/duplicates/${matchId}/dismiss`,
      { method: "PATCH" }
    );
    if (response.ok) {
      setCaseData((current) => ({
        ...current,
        possibleDuplicates: current.possibleDuplicates.filter(
          (item) => item.duplicate_match_id !== matchId
        ),
      }));
      showToast("Duplicate warning dismissed.");
    } else {
      showToast("Could not dismiss duplicate warning.", "danger");
    }
  };

  const handleWithdraw = async (id) => {
    if (!withdrawReason.trim()) {
      showToast("Enter a reason for withdrawal.", "error");
      return;
    }
    try {
      setWithdrawing(true);
      const form = new FormData();
      form.append("reason", withdrawReason.trim());
      if (withdrawAffidavit) form.append("affidavit", withdrawAffidavit);
      const res = await authFetch(`${API_URL}/api/case_reports/${id}/withdraw`, {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to withdraw case.");
      showToast(body.message || "Withdrawal submitted.");
      setWithdrawModalOpen(false);
      setWithdrawReason("");
      setWithdrawAffidavit(null);
      setCaseRefreshKey((current) => current + 1);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    if (!caseId) { setError("No case ID provided"); setLoading(false); return; }
    const fetchCase = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/case_reports/${caseId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Case not found");
        }
        const { data } = await res.json();
        setCaseData(mapCaseReportToViewData(data));

        const asmRes = await authFetch(`${API_URL}/api/case_assessments/case/${data.case_report_id}`);
        if (asmRes.ok) {
          const asmJson = await asmRes.json();
          const assessments = asmJson.data || [];
          if (assessments.length > 0) {
            const latestType = assessments.find((record) => Array.isArray(record.case_type) ? record.case_type.length > 0 : Boolean(record.case_type));
            const latestCategory = assessments.find((record) => record.primary_category || (record.additional_categories || []).length > 0);
            const latestReferral = assessments.find((record) =>
              record.referral_required !== null &&
              record.referral_required !== undefined
            );
            setCaseData((prev) => ({
              ...prev,
              assessmentHistory: assessments,
              caseType:          latestType?.case_type || prev.caseType,
              caseCategory:      latestCategory?.primary_category || prev.caseCategory,
              primaryCategory:   latestCategory?.primary_category || prev.primaryCategory || prev.caseCategory,
              alsoInvolves:      latestCategory?.additional_categories || prev.alsoInvolves || [],
              additionalCategories: latestCategory?.additional_categories || prev.additionalCategories || prev.alsoInvolves || [],
              referralRequired:  latestReferral?.referral_required ?? prev.referralRequired,
              referralBody:      latestReferral?.referral_body ?? prev.referralBody,
              endorsementStatus: latestReferral
                ? latestReferral.endorsement?.endorsed_to
                  ? `Endorsed to ${latestReferral.endorsement.endorsed_to}`
                  : null
                : prev.endorsementStatus,
            }));
          }
        }

        const historyRes = await authFetch(`${API_URL}/api/case_status_history/${data.case_report_id}?staffView=true`);
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

        const followUpsRes = await authFetch(
          `${API_URL}/api/case_reports/${data.case_report_id}/follow-ups`,
          { cache: "no-store" }
        );
        if (followUpsRes.ok) {
          const followUpsJson = await followUpsRes.json().catch(() => ({}));
          setCaseData((prev) => ({
            ...prev,
            followUps: followUpsJson.data || [],
          }));
        }

        setCompareCaseData(null);
        setCompareError(null);
        if (compareCaseId && String(compareCaseId) !== String(data.case_report_id)) {
          try {
            setCompareLoading(true);
            const compareRes = await authFetch(`${API_URL}/api/case_reports/${compareCaseId}`);
            if (!compareRes.ok) {
              const body = await compareRes.json().catch(() => ({}));
              throw new Error(body.error || "Matched case not found");
            }
            const compareJson = await compareRes.json();
            setCompareCaseData(mapCaseReportToViewData(compareJson.data));
          } catch (compareErr) {
            setCompareError(compareErr.message);
          } finally {
            setCompareLoading(false);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId, caseRefreshKey, compareCaseId]);

  useEffect(() => {
    if (!userLoaded || !caseData?.id) return;
    if (isStaff) return;

    let cancelled = false;
    const fetchInterviewAccess = async () => {
      setInterviewsChecked(false);
      try {
        const res = await authFetch(`${API_URL}/api/interviews?type=case_report&case_report_id=${caseData.id}`);
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
  const withdrawalCopy = getWithdrawalCopy(caseData?.status);
  const withdrawalPending = caseData?.withdrawalRequest?.status === "pending";

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
    { id: "details", label: "Case Details", tooltip: "View the submitted report and case information.", staffOnly: false },
    { id: "updates", label: "Case Updates", tooltip: "See progress and announcements about your case.", staffOnly: false },
    ...(showInterviewTab ? [
      { id: "interview", label: "Interview", tooltip: "View or manage interview scheduling and details.", staffOnly: false },
    ] : []),
    { id: "follow-ups", label: "Follow-ups", tooltip: "View clarification requests, corrections, and replies.", staffOnly: false },
    ...(isStaff ? [
      { id: "management", label: "Case Management", tooltip: "Manage status, classification, referrals, and internal notes.", staffOnly: true },
      { id: "duplicates", label: "Duplicate Check", tooltip: "Review possible duplicate report matches.", staffOnly: true },
      { id: "nlp", label: "NLP Analysis", tooltip: "Review automated language and case-structure analysis.", staffOnly: true },
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

        <button className={styles.backBtn} onClick={() => router.push(backRoute)}>
          <FiArrowLeft /> {backLabel}
        </button>

        {/* Header card */}
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.caseTitle}>{caseData.caseId}</h1>
              <p className={styles.caseSubtitle}>Submitted: {caseData.dateSubmitted}</p>
            </div>
            <div className={styles.headerActions}>
              <StatusBadge status={caseData.status} />
              <FollowUpBadge summary={caseData.followUpSummary} />
              {isStaff && caseData.possibleDuplicates?.length > 0 && (
                <button
                  type="button"
                  className={styles.duplicateHeaderButton}
                  onClick={goToDuplicateTab}
                >
                  Duplicate Check
                  <span>{caseData.possibleDuplicates.length}</span>
                </button>
              )}
              {(!isStaff || canManageFollowUps) &&
                !["Dismissed", "Perpetrator Convicted", "Resolved", "Withdrawn"].includes(caseData.status) && (
                <Tooltip text={
                    caseData.followUpSummary?.type ===
                      (isStaff ? "officer_clarification_request" : "user_change_request") &&
                    ["open", "responded"].includes(caseData.followUpSummary?.status)
                      ? "A follow-up is already in progress."
                      : isStaff
                        ? "Request additional information from the complainant."
                        : "Request a correction or provide more case information."
                }>
                  <button
                    className={styles.followUpButton}
                    disabled={
                      caseData.followUpSummary?.type ===
                        (isStaff ? "officer_clarification_request" : "user_change_request") &&
                      ["open", "responded"].includes(caseData.followUpSummary?.status)
                    }
                    onClick={() => setFollowUpComposerOpen(true)}
                  >
                    {isStaff ? "Request Clarification" : "Follow Up"}
                  </button>
                </Tooltip>
              )}
              {!isStaff &&
                getWithdrawalActionType(caseData.status) !== WITHDRAWAL_ACTION.BLOCK && (
                <button
                  style={{ background: "#6b7280", padding: "6px 14px", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
                  disabled={withdrawalPending}
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  {withdrawalPending ? "Withdrawal Pending" : withdrawalCopy.buttonLabel}
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
              <Tooltip key={t.id} text={t.tooltip} position="bottom">
                <button style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Tab content */}
          {displayedActiveTab === "details" && userLoaded && (
            <CaseDetailsPage caseData={caseData} isStaff={isStaff} />
          )}

          {displayedActiveTab === "updates" && userLoaded && (
            <CaseUpdatesTab caseId={caseData.id} />
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

          {displayedActiveTab === "follow-ups" && userLoaded && (
            <FollowUpsPanel
              caseId={caseData.id}
              caseStatus={caseData.status}
              isStaff={isStaff}
              canManage={canManageFollowUps}
              currentUserId={user.id}
              reportData={caseData.reportData}
              onCaseChanged={() => setCaseRefreshKey((current) => current + 1)}
              onSummaryChange={(followUpSummary) =>
                setCaseData((current) => ({ ...current, followUpSummary }))
              }
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
              onOpenDuplicateCheck={goToDuplicateTab}
              onOpenNlpAnalysis={goToNlpAnalysisTab}
              onRequestClarification={requestClarificationFromAnalysis}
            />
          )}

          {displayedActiveTab === "duplicates" && isStaff && userLoaded && (
            <DuplicateCheckTab
              caseData={caseData}
              compareCaseId={compareCaseId}
              compareCaseData={compareCaseData}
              compareLoading={compareLoading}
              compareError={compareError}
              onDismiss={dismissDuplicate}
              onViewCompare={viewDuplicateCompare}
              onCloseCompare={closeDuplicateCompare}
            />
          )}

          {displayedActiveTab === "nlp" && isStaff && userLoaded && (
            <NLPAnalysisTab
              caseReportId={caseData.id}
              isAdmin={isAdmin}
              onRequestClarification={requestClarificationFromAnalysis}
            />
          )}

        </div>
        
        {/* Withdraw Modals */}
        <Modal open={withdrawModalOpen} onClose={() => !withdrawing && setWithdrawModalOpen(false)} title={withdrawalCopy.title}>
          <p className={styles.formDesc}>
            {withdrawalCopy.description}
          </p>
          <FormGroup label="Reason for withdrawal" required>
            <FTextarea
              value={withdrawReason}
              onChange={(event) => setWithdrawReason(event.target.value)}
              placeholder="Explain why you want to withdraw this case."
            />
          </FormGroup>
          {withdrawalCopy.requiresAffidavit && (
            <FormGroup label="Affidavit of Desistance or official withdrawal document" required>
              <input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={(event) => setWithdrawAffidavit(event.target.files?.[0] || null)}
              />
            </FormGroup>
          )}
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} disabled={withdrawing} onClick={() => setWithdrawModalOpen(false)}>Cancel</button>
            <button
              className={styles.btnPrimary}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              disabled={
                withdrawing ||
                !withdrawReason.trim() ||
                (withdrawalCopy.requiresAffidavit && !withdrawAffidavit)
              }
              onClick={() => handleWithdraw(caseData.id)}
            >
              {withdrawing
                ? "Submitting..."
                : withdrawalCopy.actionType === WITHDRAWAL_ACTION.REQUIRE_APPROVAL
                  ? "Submit Request"
                  : "Confirm Withdrawal"}
            </button>
          </div>
        </Modal>

        <FollowUpComposer
          open={followUpComposerOpen}
          onClose={() => setFollowUpComposerOpen(false)}
          caseId={caseData.id}
          isStaff={isStaff}
          reportData={caseData.reportData}
          activeFollowUp={
            caseData.followUpSummary?.type ===
              (isStaff ? "officer_clarification_request" : "user_change_request") &&
            ["open", "responded"].includes(caseData.followUpSummary?.status)
              ? caseData.followUpSummary
              : null
          }
          onCreated={(created) => {
            setCaseData((current) => ({ ...current, followUpSummary: created }));
            setCaseRefreshKey((current) => current + 1);
            setActiveTab("follow-ups");
          }}
        />

      </div>
    </div>
  );
}
