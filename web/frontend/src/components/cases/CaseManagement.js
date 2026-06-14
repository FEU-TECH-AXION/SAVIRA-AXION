"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./CaseManagement.module.css";
import { FiSearch, FiX, FiAlertTriangle, FiCheck, FiClock, FiChevronDown, FiChevronUp } from "react-icons/fi";
import CasesTable from "./CasesTable";
import FilterMenu from "./FilterMenu";
import UpdateStatusModal, { getAvailableTransitions } from "./UpdateStatusModals";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getDateRangeFromFilter(filterValue) {
  if (!filterValue) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate, endDate;
  
  switch (filterValue) {
    case "today":
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case "thisWeek":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - today.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case "thisYear":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear() + 1, 0, 1);
      break;
    case "last30Days":
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      if (filterValue.startsWith("custom|")) {
        const parts = filterValue.split("|");
        if (parts.length === 3) {
          startDate = new Date(parts[1] + "T00:00:00");
          endDate = new Date(parts[2] + "T23:59:59");
        }
      }
  }
  
  return startDate && endDate ? { startDate, endDate } : null;
}

function isDateInRange(dateString, startDate, endDate) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date >= startDate && date <= endDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

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

// Which statuses a Case Officer is responsible for initiating
const CASE_OFFICER_STATUSES = [
  "For Verification",
  "Undergoing Review",
  "Verified - True",
  "Verified - False",
  "Under Case Evaluation",
];

// Which statuses Legal Personnel is responsible for
const LEGAL_STATUSES_OWN = [
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
  "Dismissed",
  "Perpetrator Convicted",
];

const STATUS_FILTERS = ["All", ...ALL_STATUSES];

const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

const VIOLENCE_TYPES = [
  "Child sexual abuse",
  "Gender-based sexual harassment in institutions",
  "Non-consensual sharing of intimate images/videos",
  "Online sexual harassment",
  "Rape / attempted rape",
  "Sexual assault / unwanted sexual touching",
  "Sexual exploitation / trafficking-related sexual abuse",
  "Stalking with sexual nature or intent",
  "Sexual harassment",
];

const OFFICERS = ["Alexa Gagan", "Marco Santos", "Ryan Dela Paz", "Ben Mercado", "Camille Torres"];
const LEGAL_OFFICERS = ["Ryan Dela Paz", "Noel Ramos", "Lena Cruz"];
const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER DATA
// ─────────────────────────────────────────────────────────────────────────────

function makeCase(id) {
  const statuses = ALL_STATUSES;
  const month = String((id % 9) + 1).padStart(2, "0");
  const day   = String((id % 7) + 1).padStart(2, "0");
  const year  = 2026;
  const dateISO = `${year}-${month}-${day}T${String(8 + (id % 3)).padStart(2, "0")}:${String((id * 7) % 60).padStart(2, "0")}:00`;
 
  return {
    id,
    // Year-based case ID: "2026-011" (year of submission + zero-padded id)
    caseId: `${year}-` + String(id).padStart(3, "0"),
    reporterId: String(10000000 + id * 7).slice(0, 8),
    region: ["NCR", "Region I", "Region III", "Region IV-A"][id % 4],
    status: statuses[id % statuses.length],
    assignedOfficer: OFFICERS[id % OFFICERS.length],
    dateSubmitted: dateISO,  // ISO string so CasesTable can format it
    caseType: [
      "Child Sexual Abuse",
      "Gender-Based Sexual Harassment in Institutions",
      "Non-Consensual Sharing of Intimate Images/Videos",
      "Online Sexual Harassment",
      "Rape / Attempted Rape",
      "Sexual Assault / Unwanted Sexual Touching",
      "Sexual Exploitation / Trafficking-Related Sexual Abuse",
      "Sexual Harassment",
      "Stalking With Sexual Nature or Intent",
    ][id % 9],
    violenceType: VIOLENCE_TYPES[id % VIOLENCE_TYPES.length],
    description: "Complainant reported an incident involving unwanted conduct.",
    endorsedTo: null,
    endorsementDetails: null,
    pendingApproval: null,
    statusHistory: [
      { status: "For Verification", date: dateISO, by: OFFICERS[id % OFFICERS.length], notes: "Report received and logged." }
    ],
  };
}

const PLACEHOLDER_CASES = Array.from({ length: 22 }, (_, i) => makeCase(i + 1));

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

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
      <div className={styles.actionIconWrap}>
        <span className={styles.actionIcon}>{icon}</span>
      </div>
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

function FormGroup({ label, required, hint, error, children, className }) {
  return (
    <div className={styles.formGroup}>
      <label className={`${styles.formLabel} ${className || ""}`}>
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
  return <textarea className={`${styles.formInput} ${error ? styles.inputError : ""}`} rows={3} style={{ resize: "vertical" }} {...props} />;
}

function FSelect({ error, children, ...props }) {
  return (
    <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>
      {children}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW CASE MODAL — full detail + history
// ─────────────────────────────────────────────────────────────────────────────

function ViewCaseModal({ open, onClose, caseData, isAdmin, isCaseOfficer }) {
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab]     = useState("details");
  const [nlpData, setNlpData]         = useState(null);
  const [nlpLoading, setNlpLoading]   = useState(false);
  const [nlpError, setNlpError]       = useState(null);

  // ── Fetch NLP analysis when tab is opened ────────────────────
  useEffect(() => {
    if (activeTab !== "nlp" || !caseData) return;
    if (nlpData) return; // already fetched

    const fetchNLP = async () => {
      setNlpLoading(true);
      setNlpError(null);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/case_report_analysis/${caseData.id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Analysis not found.");
        const { data } = await res.json();
        setNlpData(data);
      } catch (err) {
        setNlpError(err.message);
      } finally {
        setNlpLoading(false);
      }
    };

    fetchNLP();
  }, [activeTab, caseData]);

  // Reset when modal closes or case changes
  useEffect(() => {
    if (!open) {
      setActiveTab("details");
      setNlpData(null);
      setNlpError(null);
      setShowHistory(false);
    }
  }, [open]);

  if (!caseData) return null;

  // ── Tab styles ────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
    background: "none",
    color: activeTab === tab ? "#7c3aed" : "#6b7280",
    fontWeight: activeTab === tab ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.15s",
  });

  // ── Category badge ────────────────────────────────────────────
  const CategoryBadge = ({ label }) => {
    const colors = {
      Physical: { bg: "#fee2e2", color: "#991b1b" },
      Verbal:   { bg: "#fef9c3", color: "#854d0e" },
      Virtual:  { bg: "#dbeafe", color: "#1e40af" },
    };
    const s = colors[label] || { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        marginRight: 6,
        marginBottom: 4,
      }}>
        {label}
      </span>
    );
  };

  // ── Case type badge ───────────────────────────────────────────
  const CaseTypeBadge = ({ label }) => (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: "0.78rem",
      fontWeight: 600,
      background: "#f3e8ff",
      color: "#6b21a8",
      marginRight: 6,
      marginBottom: 4,
    }}>
      {label}
    </span>
  );

  // ── NLP status indicator ──────────────────────────────────────
  const NLPStatusBadge = ({ status }) => {
    const map = {
      completed: { bg: "#dcfce7", color: "#166534", label: "Analysis Complete" },
      pending:   { bg: "#fef9c3", color: "#854d0e", label: "Analysis Pending" },
      failed:    { bg: "#fee2e2", color: "#991b1b", label: "Analysis Failed" },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`Case Details — ${caseData.caseId}`} wide>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "1.25rem" }}>
        <button style={tabStyle("details")} onClick={() => setActiveTab("details")}>
          Case Details
        </button>
        {(isAdmin || isCaseOfficer) && (
          <button style={tabStyle("nlp")} onClick={() => setActiveTab("nlp")}>
            NLP Analysis
          </button>
        )}
      </div>

      {/* ══ TAB: CASE DETAILS ══ */}
      {activeTab === "details" && (
        <>
          <div className={styles.viewGrid}>
            {[
              ["Case ID",          caseData.caseId],
              ["Reporter ID",      caseData.reporterId],
              ["Region",           caseData.region],
              ["Type of Violence", caseData.violenceType],
              ["Current Status",   <StatusBadge status={caseData.status} />],
              ["Assigned Officer", caseData.assignedOfficer || "—"],
              ["Date Submitted",   caseData.dateSubmitted],
              ["Description",      caseData.description],
              ...(caseData.endorsedTo ? [["Endorsed To", caseData.endorsedTo]] : []),
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
            <div className={styles.endorsementBlock}>
              <h4 className={styles.endorsementTitle}>Endorsement / Monitoring Details</h4>
              {Object.entries(caseData.endorsementDetails).map(([k, v]) => v ? (
                <div key={k} className={styles.viewRow}>
                  <span className={styles.viewKey}>{k}</span>
                  <span className={styles.viewVal}>{v}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Status History */}
          <button
            className={styles.historyToggle}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? <FiChevronUp /> : <FiChevronDown />}
            {showHistory ? "Hide" : "Show"} Status History ({caseData.statusHistory?.length || 0} entries)
          </button>
          {showHistory && (
            <div className={styles.historyList}>
              {(caseData.statusHistory || []).map((h, i) => (
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

      {/* ══ TAB: NLP ANALYSIS ══ */}
      {activeTab === "nlp" && (
        <div>
          {/* Disclaimer */}
          <div style={{
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: "1.25rem",
            fontSize: "0.82rem",
            color: "#5b21b6",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}><IoIosInformationCircle /></span>
            <span>
              This analysis is <strong>AI-generated</strong> and is intended as a guide only.
              All decisions remain with the case officer and are subject to admin approval.
            </span>
          </div>

          {/* Loading */}
          {nlpLoading && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <p>Loading analysis...</p>
            </div>
          )}

          {/* Error */}
          {nlpError && !nlpLoading && (
            <div style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#991b1b",
              fontSize: "0.875rem",
            }}>
              <strong>Analysis unavailable:</strong> {nlpError}
            </div>
          )}

          {/* NLP Results */}
          {nlpData && !nlpLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Status + analyzed at */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <NLPStatusBadge status={nlpData.status} />
                {nlpData.analyzed_at && (
                  <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                    Analyzed: {new Date(nlpData.analyzed_at).toLocaleString("en-PH")}
                  </span>
                )}
              </div>

              {/* Section 1 — Summary */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                  Incident Summary
                </h4>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
                  {nlpData.summary || "No summary available."}
                </p>
              </div>

              {/* Section 2 — Classification */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                  Suggested Classification
                </h4>

                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Primary Categories
                </p>
                <div style={{ marginBottom: 12 }}>
                  {nlpData.primary_categories?.length > 0
                    ? nlpData.primary_categories.map((c) => <CategoryBadge key={c} label={c} />)
                    : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>
                  }
                </div>

                <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Possible Case Types
                </p>
                <div style={{ marginBottom: 12 }}>
                  {nlpData.case_types?.length > 0
                    ? nlpData.case_types.map((t) => <CaseTypeBadge key={t} label={t} />)
                    : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>
                  }
                </div>

                {nlpData.classification_notes && (
                  <>
                    <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Notes
                    </p>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>
                      {nlpData.classification_notes}
                    </p>
                  </>
                )}
              </div>

              {/* Section 3 — Recommended Steps */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                  Suggested Next Steps
                </h4>
                {nlpData.recommended_steps?.length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 6 }}>
                    {nlpData.recommended_steps.map((step, i) => (
                      <li key={i} style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.6 }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No steps suggested.</p>
                )}
              </div>

              {/* Section 4 — Referral Indicator */}
              <div style={{
                background: nlpData.referral_suggested ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${nlpData.referral_suggested ? "#fcd34d" : "#86efac"}`,
                borderRadius: 8,
                padding: "14px 16px",
              }}>
                <h4 style={{ margin: "0 0 6px", fontSize: "0.875rem", fontWeight: 700, color: nlpData.referral_suggested ? "#92400e" : "#166534" }}>
                  {nlpData.referral_suggested ? "Warning: Referral may be appropriate" : "May be resolvable internally"}
                </h4>
                {nlpData.referral_notes && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.6 }}>
                    {nlpData.referral_notes}
                  </p>
                )}
              </div>

              {/* Section 5 — Technical Info (admin only, collapsible) */}
              {isAdmin && (
                <details style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>
                    Technical Details
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, paddingLeft: 8 }}>
                    <span><strong>Model:</strong> {nlpData.model_used}</span>
                    <span><strong>Language detected:</strong> {nlpData.language_detected}</span>
                    <span><strong>PII detected and masked:</strong> {nlpData.detected_pii?.join(", ") || "None"}</span>
                    <span><strong>Anonymized text:</strong></span>
                    <p style={{ margin: "4px 0 0", background: "#f3f4f6", padding: "8px 10px", borderRadius: 6, lineHeight: 1.6 }}>
                      {nlpData.anonymized_text}
                    </p>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.modalFooter}>
        <button className={styles.btnPrimary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN CASE MODAL (admin only)
// ─────────────────────────────────────────────────────────────────────────────

function AssignCaseModal({ open, onClose, casesData: casesDataProp, onSave, officers: officersProp = [] }) {
  const [officerId, setOfficerId] = useState("");
  const [error, setError] = useState("");
  
  // Support both single case and array of cases
  const casesData = Array.isArray(casesDataProp) ? casesDataProp : (casesDataProp ? [casesDataProp] : []);
  
  useEffect(() => { 
    if (casesData.length > 0) {
      // Reset officer selection when cases change
      setOfficerId("");
    }
  }, [casesData]);
  
  if (casesData.length === 0) return null;

  function handleSave() {
    if (!officerId) { setError("Please select an officer."); return; }
    
    // Find the selected officer object to get the officer name
    const selectedOfficer = officersProp.find(o => o.case_officer_id == officerId);
    const officerName = selectedOfficer?.name || `${selectedOfficer?.first_name || ''} ${selectedOfficer?.last_name || ''}`.trim() || officerId;
    
    // Call onSave for each case
    casesData.forEach(caseData => {
      onSave({ ...caseData, assignedOfficer: officerName, assignedOfficerId: officerId });
    });
    onClose();
  }

  const isBulk = casesData.length > 1;
  const availableOfficers = (officersProp && officersProp.length > 0) ? officersProp : [];

  return (
    <Modal open={open} onClose={onClose} title={isBulk ? `Assign Case Officer (${casesData.length} cases)` : "Assign Case Officer"}>
      <div className={styles.formGrid}>
        {isBulk ? (
          <>
            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.formLabel}>Cases to assign:</label>
              <div style={{ background: "#f3f4f6", borderRadius: 6, padding: 10, fontSize: "0.875rem", maxHeight: 150, overflowY: "auto" }}>
                {casesData.map((c, i) => (
                  <div key={i} style={{ padding: "4px 0", borderBottom: i < casesData.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                    <strong>{c.caseId}</strong> — {c.status} (Reporter: {c.reporterId})
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <FormGroup label="Case ID"><FInput value={casesData[0].caseId} disabled /></FormGroup>
        )}
        <FormGroup label="Assign to Officer" required error={error} style={isBulk ? { gridColumn: "1 / -1" } : {}}>
          <FSelect value={officerId} onChange={(e) => { setOfficerId(e.target.value); setError(""); }} error={error}>
            <option value="">— Select Officer —</option>
            {availableOfficers.length > 0 ? (
              availableOfficers.map((o) => {
                const officerName = o.name || `${o.first_name || ''} ${o.last_name || ''}`.trim();
                return <option key={o.case_officer_id} value={o.case_officer_id}>{officerName}</option>;
              })
            ) : (
              <option disabled>No case officers available</option>
            )}
          </FSelect>
        </FormGroup>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={availableOfficers.length === 0}>
          {isBulk ? `Assign to ${casesData.length} Case${casesData.length === 1 ? '' : 's'}` : "Assign Officer"}
        </button>
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
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Case ID</span>
          <span className={styles.approvalVal}>{caseData.caseId}</span>
        </div>
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Current Status</span>
          <span className={styles.approvalVal}><StatusBadge status={caseData.status} /></span>
        </div>
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Proposed Status</span>
          <span className={styles.approvalVal}><StatusBadge status={pa.proposedStatus} /></span>
        </div>
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Submitted by</span>
          <span className={styles.approvalVal}>{pa.submittedBy}</span>
        </div>
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Date Submitted</span>
          <span className={styles.approvalVal}>{pa.date}</span>
        </div>
        <div className={styles.approvalRow}>
          <span className={styles.approvalKey}>Officer Notes</span>
          <span className={styles.approvalVal}>{pa.notes}</span>
        </div>
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
          <button className={styles.btnSuccess} onClick={() => { onApprove(caseData); onClose(); }}>
            <FiCheck size={14} /> Approve &amp; Apply
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL CASES MODAL (quick view)
// ─────────────────────────────────────────────────────────────────────────────

function AllCasesModal({ open, onClose, cases, onView, onAction }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    cases.filter((c) => c.caseId.includes(q) || c.reporterId.includes(q) || c.region.toLowerCase().includes(q.toLowerCase())),
    [cases, q]
  );
  return (
    <Modal open={open} onClose={onClose} title="All Cases" wide>
      <div className={styles.searchWrap} style={{ marginBottom: "1rem" }}>
        <input className={styles.searchInput} placeholder="Search by Case ID, region…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={styles.searchIcon}><FiSearch /></span>
      </div>
      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>Case ID</th><th>Region</th><th>Status</th><th>Officer</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} className={styles.emptyState}>No cases found.</td></tr>
              : filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.caseId}</td>
                  <td>{c.region}</td>
                  <td><StatusBadge status={c.status} />{c.pendingApproval && <span style={{ marginLeft: 4 }}><PendingBadge /></span>}</td>
                  <td>{c.assignedOfficer || "—"}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className={styles.tblBtnView} onClick={() => { onView(c); onClose(); }}>View</button>
                      {onAction && <button className={styles.tblBtnEdit} onClick={() => { onAction(c); onClose(); }}>Action</button>}
                    </div>
                  </td>
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
// STATUS CHANGE ROUTER — decides which modal to show based on target status
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CaseManagement() {
  const [selectedCase, setSelectedCase] = useState(null);
const [nextStatus, setNextStatus] = useState("");

// State controls for the modals
const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
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

  const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Officer";
  const isAdmin   = user.role?.toLowerCase() === "admin";
  const isCaseOfficer = user.role?.toLowerCase() === "case officer" || user.role?.toLowerCase() === "case_officer";
  const isLegal   = user.role?.toLowerCase() === "legal personnel" || user.role?.toLowerCase() === "legal_personnel";

  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);

  // Dynamic officers list (try backend, fallback to deriving from cases)
  const [officers, setOfficers] = useState([]);

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

useEffect(() => {
  const fetchCases = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/case_reports/all`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CaseManagement] API error:', res.status, errorText);
        throw new Error(`Failed to fetch cases: ${res.status} ${errorText}`);
      }
      const { data } = await res.json();

      // Map DB shape to the shape CaseManagement expects
      let mapped = data.map((r, i) => {
        const year = new Date(r.created_at).getFullYear();
        return {
        id:              r.case_report_id,
        caseId:          `${year}-` + String(r.case_report_id).padStart(3, "0"),
        reporterId:      String(r.complainant_id),
        region:          r.incident_province || r.incident_city || "—",
        status:          STATUS_STEP[r.case_status_id] || "For Verification",
        assignedOfficer: r.assigned_officer || null,
        dateSubmitted:   new Date(r.created_at).toLocaleDateString('en-PH'),
        violenceType:    "—",  // not in DB yet
        description:     r.incident_description || "—",
        endorsedTo:      null,
        endorsementDetails: null,
        pendingApproval: null,
        statusHistory: [
          {
            status: STATUS_STEP[r.case_status_id] || "For Verification",
            date:   new Date(r.created_at).toLocaleDateString('en-PH'),
            by:     r.assigned_officer || "System",
            notes:  "Report received and logged.",
          }
        ],
        };
      });

      // Case officers only see cases assigned to them
      if (isCaseOfficer && actorName) {
        console.log('[CaseManagement] Case officer filter - actorName:', actorName);
        console.log('[CaseManagement] Before filter - total cases:', mapped.length);
        mapped = mapped.filter(c => {
          const match = c.assignedOfficer === actorName;
          if (!match) console.log('[CaseManagement] Filtered out case:', c.caseId, 'assigned to:', c.assignedOfficer);
          return match;
        });
        console.log('[CaseManagement] After filter - visible cases:', mapped.length);
      }

      setCases(mapped);
    } catch (err) {
      console.error('[CaseManagement] fetch error:', err);
    } finally {
      setCasesLoading(false);
    }
  };

  fetchCases();
}, [isCaseOfficer, actorName]);

// Fetch case officers from database
useEffect(() => {
  const loadOfficers = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_URL}/api/case_officers`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Expect data = [{ case_officer_id, name, user_id, is_available, ... }]
        const availableOfficers = (Array.isArray(data) ? data : data.data || [])
          .filter(officer => officer.is_available !== false); // Only include available officers
        setOfficers(availableOfficers);
      }
    } catch (e) {
      console.error('[CaseManagement] Failed to fetch case officers:', e);
      setOfficers([]);
    }
  };

  loadOfficers();
}, []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: "",
    assignedOfficer: "",
    caseType: "",
    dateSubmitted: "",
    primaryCategory: "",
    city: "",
  });
  const [sortField, setSortField] = useState("dateSubmitted");
  const [sortDir, setSortDir]     = useState("desc");

  // Modal state
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function closeModal() { setModal(null); }

  // ── Stats ──
  const ACTIVE_STATUSES = [
  "Submitted",
  "For Verification",
  "Undergoing Review",
  "Verified - True",
  "Under Case Evaluation",
  "Case Filed",
  "Investigation Ongoing",
  "Hearing Ongoing",
];

const stats = useMemo(() => {
  const pending = cases.filter((c) => c.pendingApproval).length;

  return [
    {
      num: cases.filter((c) => c.status === "For Verification").length,
      label: "Awaiting Verification",
    },
    {
      num: cases.filter((c) => ACTIVE_STATUSES.includes(c.status)).length,
      label: "Active Cases",
    },
    {
      num: cases.length,
      label: "Total Cases",
    },
    ...(isAdmin
      ? [
          {
            num: pending,
            label: "Pending Approvals",
            highlight: pending > 0,
          },
        ]
      : []),
  ];
}, [cases, isAdmin]);

  // ── Filtering ──
  const filtered = useMemo(() =>
    cases.filter((c) => {
      const ms = !search || c.caseId.includes(search) || c.reporterId.includes(search) || c.region.toLowerCase().includes(search.toLowerCase());
      
      // Apply advanced filters
      let mf = true;
      if (advancedFilters.status && advancedFilters.status !== "" && advancedFilters.status !== "All") {
        mf = mf && c.status === advancedFilters.status;
      }
      if (advancedFilters.assignedOfficer && advancedFilters.assignedOfficer !== "" && advancedFilters.assignedOfficer !== "All") {
        mf = mf && (c.assignedOfficer || "").toLowerCase().includes(advancedFilters.assignedOfficer.toLowerCase());
      }
      if (advancedFilters.caseType && advancedFilters.caseType !== "" && advancedFilters.caseType !== "All") {
        mf = mf && (c.caseType || "") === advancedFilters.caseType;
      }
      if (advancedFilters.dateSubmitted && advancedFilters.dateSubmitted !== "") {
        const range = getDateRangeFromFilter(advancedFilters.dateSubmitted);
        if (range) {
          mf = mf && isDateInRange(c.dateSubmitted, range.startDate, range.endDate);
        }
      }
      if (advancedFilters.primaryCategory && advancedFilters.primaryCategory !== "" && advancedFilters.primaryCategory !== "All") {
        mf = mf && (c.primaryCategory || "") === advancedFilters.primaryCategory;
      }
      if (advancedFilters.city && advancedFilters.city !== "" && advancedFilters.city !== "All") {
        mf = mf && (c.region || "").toLowerCase().includes(advancedFilters.city.toLowerCase());
      }
      
      return ms && mf;
    }),
    [cases, search, advancedFilters]
  );
  useEffect(() => setPage(1), [search, advancedFilters]);
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

  // ── Status change — submit for approval ──
  function submitForApproval(caseData, proposedStatus, changeDetails) {
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? { ...c, pendingApproval: { proposedStatus, ...changeDetails } }
      : c
    ));
    showToast(`Status change for ${caseData.caseId} submitted for admin approval.`);
    closeModal();
  }

  // ── Admin: approve ──
  function approveChange(caseData) {
    const pa = caseData.pendingApproval;
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? {
          ...c,
          status: pa.proposedStatus,
          pendingApproval: null,
          statusHistory: [...(c.statusHistory || []), {
            status: pa.proposedStatus,
            date: pa.date,
            by: pa.submittedBy,
            notes: pa.notes,
          }],
        }
      : c
    ));
    showToast(`Case ${caseData.caseId} status updated to "${pa.proposedStatus}".`);
  }

  // ── Admin: reject ──
  function rejectChange(caseData, reason) {
    setCases((prev) => prev.map((c) => c.id === caseData.id
      ? {
          ...c,
          pendingApproval: null,
          statusHistory: [...(c.statusHistory || []), {
            status: c.status,
            date: new Date().toLocaleDateString(),
            by: "Admin",
            notes: `Status change REJECTED. Reason: ${reason}`,
          }],
        }
      : c
    ));
    showToast(`Status change for ${caseData.caseId} rejected.`, "danger");
  }

  // ── Assign officer (admin) ──
  function assignOfficer(updated) {
    // Update local state
    setCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    
    // Save to backend via API
    const saveToBackend = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        if (updated.assignedOfficerId) {
          const res = await fetch(`${API_URL}/api/case_assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              case_report_id: updated.id,
              case_officer_id: updated.assignedOfficerId,
            }),
          });
          if (!res.ok) {
            console.error('[assignOfficer] API error:', res.status);
            showToast('Failed to save assignment to database', 'danger');
          } else {
            showToast(`Officer assigned to ${updated.caseId}.`);
          }
        }
      } catch (err) {
        console.error('[assignOfficer] Error:', err);
        showToast('Error saving assignment', 'danger');
      }
    };
    
    saveToBackend();
  }

  // ── Open correct status modal ──
  function openStatusModal(c) {
    setSelected(c);
    setModal("statusRouter");
  }

  // pending cases for admin
  const pendingCases = useMemo(() => cases.filter((c) => c.pendingApproval), [cases]);

  // Next valid statuses given current status + role
  function getAvailableTransitions(c) {
    const curr = c.status;
    if (isAdmin) return ALL_STATUSES.filter((s) => s !== curr);

    if (isCaseOfficer) {
      const map = {
        "For Verification":      ["Undergoing Review"],
        "Undergoing Review":     ["Verified - True", "Verified - False"],
        "Verified - True":       ["Under Case Evaluation"],
        "Verified - False":      [],
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
              <h1 className={styles.heroTitle}>Case Management</h1>
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
            {/* View Cases — everyone */}
            {/* <div className="col-12 col-sm-6 col-lg-3">
              <ActionCard
                icon={<img src="CaseIconView.png" alt="" className={styles.actionIconImg} />}
                title="View All Cases"
                description="Browse all submitted cases, their current statuses, and status history."
                onView={() => setModal("viewAll")}
              />
            </div> */}

            {/* Manage Interviews — case officers */}
            {(isCaseOfficer || isAdmin) && (
              <div className="col-12 col-sm-6 col-lg-3">
                <Link href="/caseInterviews" style={{ textDecoration: 'none' }}>
                  <ActionCard
                    icon={<img src="CaseIconInterview.png" alt="" className={styles.actionIconImg} />}
                    title="Manage Interviews"
                    description="Create interview schedules, manage invitations, and track interview progress."
                    onView={() => router.push("/caseInterviews")}
                  />
                </Link>
              </div>
            )}

            {/* Assign Officer — admin only */}
            {/* {(isAdmin) && (
              <div className="col-12 col-sm-6 col-lg-3">
                <ActionCard
                  icon={<img src="CaseIconAssign.png" alt="" className={styles.actionIconImg} />}
                  title="Assign Case Officer"
                  description="Assign or reassign a case officer to an unhandled case."
                  onView={() => setModal("viewAll_assign")}
                />
              </div>
            )} */}

            {/* Admin: approve pending changes */}
            {isAdmin && (
              <div className="col-12 col-sm-6 col-lg-3">
                <ActionCard
                  icon={<img src="CaseIconVerify.png" alt="" className={styles.actionIconImg} />}
                  title="Approve Status Changes"
                  description="Review and approve or reject pending status change requests from officers."
                  badge={pendingCases.length > 0 ? <span className={styles.pendingCount}>{pendingCases.length} pending</span> : null}
                  onView={() => setModal("viewPending")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <section className={styles.allList}>
          <div className="container-xl">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>All Cases</h2>
              <div className={styles.headingLine} />
            </div>
            <div className={styles.layout}>
              <div>
                <div className={styles.tableTopBar}>
                  <div className={styles.searchWrap} style={{ flex: 1 }}>
                    <input className={styles.searchInput} type="text" placeholder="Search by Case ID, Reporter ID, or Region…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span className={styles.searchIcon}><FiSearch /></span>
                  </div>
                  <FilterMenu 
                    activeFilters={advancedFilters} 
                    onFilterChange={setAdvancedFilters}
                    onDone={() => {}} 
                  />
                </div>
                <CasesTable
                  paginated={paginated}
                  page={page}
                  totalPages={totalPages}
                  totalRecords={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  onRowClick={(c) => router.push(`/cases/view?caseId=${c.id}`)}
                  onAssign={(cases) => {
                    // bulk assign: pass all selected cases
                    setSelected(cases);
                    setModal("assign");
                  }}
                  onUpdateStatus={(cases) => {
                    setSelected(cases[0]);
                    setModal("statusRouter");
                  }}
                  isAdmin={isAdmin}
                  getAvailableTransitions={getAvailableTransitions}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={(field) => {
                    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
                    else { setSortField(field); setSortDir("asc"); }
                  }}
                  activeFilters={advancedFilters}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══ MODALS ══ */}

      {/* View */}
      <ViewCaseModal
        open={modal === "view"}
        onClose={closeModal}
        caseData={selected}
        isAdmin={isAdmin}
        isCaseOfficer={isCaseOfficer}
      />

      {/* Assign (admin) */}
      <AssignCaseModal open={modal === "assign"} onClose={closeModal} casesData={selected} onSave={assignOfficer} officers={officers} />

      {/* Status Router — inline transition picker */}
      <UpdateStatusModal
      open={modal === "statusRouter"}
      activeModal={modal}
      onModalChange={setModal}
      onClose={() => { setModal(null); setSelected(null); }}
      caseData={selected}
      isAdmin={isAdmin}
      isCaseOfficer={isCaseOfficer}
      isLegal={isLegal}
      actorName={actorName}
      styles={styles}
      onSubmit={(proposedStatus, changeDetails) =>
        submitForApproval(selected, proposedStatus, changeDetails)
      }
      getAvailableTransitions={
      (c) => getAvailableTransitions(c.status, { isAdmin, isCaseOfficer, isLegal })
    }
    />

      {/* Admin approval */}
      <ApprovalModal open={modal === "approval"} onClose={closeModal} caseData={selected} onApprove={approveChange} onReject={rejectChange} />

      {/* All Cases quick browsers */}
      <AllCasesModal open={modal === "viewAll"}            onClose={closeModal} cases={cases} onView={(c) => router.push(`/cases/view?caseId=${c.id}`)} />
      <AllCasesModal open={modal === "viewAll_assign"}     onClose={closeModal} cases={cases} onView={(c) => router.push(`/cases/view?caseId=${c.id}`)} onAction={(c) => { setSelected([c]); setModal("assign"); }} />

      {/* Pending approvals list */}
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
                      <td>{c.caseId}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td><StatusBadge status={c.pendingApproval.proposedStatus} /></td>
                      <td>{c.pendingApproval.submittedBy}</td>
                      <td>{c.pendingApproval.date}</td>
                      <td>
                        <button className={styles.tblBtnApprove} onClick={() => { setSelected(c); setModal("approval"); }}>Review</button>
                      </td>
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