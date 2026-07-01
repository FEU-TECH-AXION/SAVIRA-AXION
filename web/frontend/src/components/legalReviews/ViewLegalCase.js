"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiAlertCircle,
  FiCheck,
} from "react-icons/fi";
import { IoIosArrowBack, IoIosInformationCircle, } from "react-icons/io";
import styles from "./ViewLegalCase.module.css";
import { NLPAnalysisTab as SharedNLPAnalysisTab } from "../cases/ViewCase";
import UpdateStatusModal, { getAvailableTransitions as getSharedAvailableTransitions } from "../cases/UpdateStatusModals";
import StatusDetailsSection from "../cases/StatusDetailsSection";
import DetailAccordion from "../cases/DetailAccordion";
import PendingStatusApproval from "../cases/PendingStatusApproval";
import CaseDetailsPage from "../cases/CaseDetailsPage";
import Tooltip from "@/components/ui/Tooltip";
import { FollowUpCaseHistory } from "../cases/FollowUps";
import {
  Modal,
  ParalegalSupportModal,
  LawyerConsultModal,
  EndorseModal,
  MonitoringModal,
  PARALEGAL_EVIDENCE_LABELS,
} from "./LegalReviewModals";
import { getLegalCaseDeadlines } from "./legalReviewCalendar";
import { useAuth } from "@/lib/AuthContext";

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

// ─── Descriptions for complainants (from sasha-explain.md) ───────────────────

function normalizePersonnelType(value) {
  return String(value || "").trim().toLowerCase();
}

function isLawyerType(value) {
  return ["lawyer", "legal officer"].includes(normalizePersonnelType(value));
}

function isParalegalType(value) {
  return normalizePersonnelType(value) === "paralegal";
}

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

// ─────────────────────────────────────────────────────────────────────────────
// PARALEGAL SUPPORT MODAL — organize case facts and documents
// ─────────────────────────────────────────────────────────────────────────────


// ─── Status Change Modals (imported from CaseManagement pattern) ──────────────

function NLPAnalysisTab({ caseReportId, isAdmin }) {
  return <SharedNLPAnalysisTab caseReportId={caseReportId} isAdmin={isAdmin} />;

  const [nlpData, setNlpData]     = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpStatus, setNlpStatus]   = useState(null);

  useEffect(() => {
    if (!caseReportId) return;
    const fetchNlp = async () => {
      setNlpLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
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

  const CategoryBadge = ({ label }) => (
    <span className={`${styles.nlpBadge} ${styles.nlpBadgeCategory}`}>{label}</span>
  );
  const CaseTypeBadge = ({ label }) => (
    <span className={`${styles.nlpBadge} ${styles.nlpBadgeType}`}>{label}</span>
  );
  const getClassificationLabel = (item, field) => {
    if (!item) return "";
    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item);
        return parsed?.[field] || parsed?.category || parsed?.type || item;
      } catch {
        return item;
      }
    }
    if (typeof item === "object") return item[field] || item.category || item.type || "";
    return String(item);
  };

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
            <h4 style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Suggested Classification</h4>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary Categories</p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.primary_categories?.length > 0 ? nlpData.primary_categories.map((c, i) => <CategoryBadge key={`${getClassificationLabel(c, "category")}-${i}`} label={getClassificationLabel(c, "category")} />) : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Possible Case Types</p>
            <div style={{ marginBottom: 12 }}>
              {nlpData.case_types?.length > 0 ? nlpData.case_types.map((t, i) => <CaseTypeBadge key={`${getClassificationLabel(t, "type")}-${i}`} label={getClassificationLabel(t, "type")} />) : <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>None suggested</span>}
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

function safeDocumentUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

const PARALEGAL_LEGACY_FIELD_MAP = {
  "Sworn statement": "swornStatement",
  "Incident timeline": "timeline",
  "Screenshots / digital evidence": "screenshots",
  "ID documents": "idDocuments",
  "Medico-legal report": "medicoLegalReport",
  "Witness statements": "witnessStatements",
};

function normalizeParalegalEvidence(record = {}) {
  const knownStatuses = ["Not started", "In progress", "Obtained", "Survivor declined"];
  const obtainedDocuments = new Set(typeof record.documents === "string" ? record.documents.split(", ").filter(Boolean) : []);

  return PARALEGAL_EVIDENCE_LABELS.map((label) => {
    const savedItem = record.evidenceItems?.[label] || {};
    const legacyValue = record[PARALEGAL_LEGACY_FIELD_MAP[label]];
    const legacyStatus = knownStatuses.includes(legacyValue) ? legacyValue : "";
    const status = savedItem.status || (obtainedDocuments.has(label) ? "Obtained" : legacyStatus || (legacyValue ? "In progress" : "Not started"));

    return {
      label,
      status,
      notes: savedItem.notes || (!knownStatuses.includes(legacyValue) && legacyValue ? String(legacyValue) : ""),
      fileLink: savedItem.fileLink || "",
    };
  });
}

function getParalegalStatusClass(status = "") {
  const normalized = status.toLowerCase();
  if (normalized === "obtained") return styles.paralegalStatusObtained;
  if (normalized === "in progress") return styles.paralegalStatusProgress;
  if (normalized === "survivor declined") return styles.paralegalStatusDeclined;
  return styles.paralegalStatusIdle;
}

function formatLegalReviewDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH");
}

function ParalegalStatusPill({ status }) {
  return (
    <span className={`${styles.paralegalStatusPill} ${getParalegalStatusClass(status)}`}>
      {status || "Not started"}
    </span>
  );
}

function ParalegalSupportDetails({ record, caseId }) {
  const evidenceItems = normalizeParalegalEvidence(record);
  const obtainedCount = evidenceItems.filter((item) => item.status === "Obtained").length;
  const progressCount = evidenceItems.filter((item) => item.status === "In progress").length;
  const declinedCount = evidenceItems.filter((item) => item.status === "Survivor declined").length;
  const readyForLawyer = Boolean(record.readyForLawyerReview);
  const completionPercent = evidenceItems.length > 0 ? Math.round((obtainedCount / evidenceItems.length) * 100) : 0;
  const overviewItems = [
    ["Case ID", caseId || "Not recorded"],
    ["Organized By", record.organizedBy || "Not recorded"],
    ["Last Updated", record.date || "Not recorded"],
    ["Ready For Lawyer Review", readyForLawyer ? "Yes" : "No"],
    ["Survivor Confirmed Understanding", record.survivorUnderstood ? "Yes" : "No"],
    ...(record.readyAt ? [["Marked Ready On", formatLegalReviewDate(record.readyAt)]] : []),
  ];

  return (
    <div className={styles.paralegalPanel}>
      <div className={styles.paralegalOverviewGrid}>
        <div className={`${styles.paralegalOverviewCard} ${readyForLawyer ? styles.paralegalOverviewReady : styles.paralegalOverviewPending}`}>
          <p className={styles.paralegalOverviewLabel}>Review Readiness</p>
          <div className={styles.paralegalOverviewValue}>
            {readyForLawyer ? <FiCheck aria-hidden="true" /> : <FiClock aria-hidden="true" />}
            <span>{readyForLawyer ? "Ready" : "Not ready"}</span>
          </div>
          <p className={styles.paralegalOverviewHint}>{obtainedCount} of {evidenceItems.length} evidence items obtained</p>
        </div>

        <div className={styles.paralegalOverviewCard}>
          <p className={styles.paralegalOverviewLabel}>Evidence Progress</p>
          <div className={styles.paralegalProgressTrack} aria-label={`${completionPercent}% evidence completion`}>
            <span className={styles.paralegalProgressFill} style={{ width: `${completionPercent}%` }} />
          </div>
          <p className={styles.paralegalOverviewHint}>{completionPercent}% complete</p>
        </div>

        <div className={styles.paralegalOverviewCard}>
          <p className={styles.paralegalOverviewLabel}>Needs Attention</p>
          <p className={styles.paralegalOverviewValueText}>{progressCount + declinedCount}</p>
          <p className={styles.paralegalOverviewHint}>{progressCount} in progress, {declinedCount} declined</p>
        </div>
      </div>

      <div className={styles.detailGrid}>
        {overviewItems.map(([key, value]) => (
          <div key={key} className={styles.detailItem}>
            <p className={styles.detailKey}>{key}</p>
            <p className={styles.detailVal}>{value}</p>
          </div>
        ))}
      </div>

      <div className={styles.paralegalTextGrid}>
        {[
          ["Key Incident Details", record.incidentDetails],
          ["What Was Explained To The Survivor", record.explainedToSurvivor],
          ["Additional Notes", record.otherNotes],
        ].map(([key, value]) => (
          <div key={key} className={styles.paralegalTextBlock}>
            <p className={styles.detailKey}>{key}</p>
            <p className={styles.descriptionVal}>{value || "Not recorded"}</p>
          </div>
        ))}
      </div>

      <div className={styles.paralegalChecklistHeader}>
        <h3>Evidence Checklist</h3>
        <span>{obtainedCount}/{evidenceItems.length} obtained</span>
      </div>

      <div className={styles.paralegalChecklistGrid}>
        {evidenceItems.map((item) => {
          const safeUrl = safeDocumentUrl(item.fileLink);
          return (
            <article key={item.label} className={styles.paralegalChecklistCard}>
              <div className={styles.paralegalChecklistTop}>
                <h4>{item.label}</h4>
                <ParalegalStatusPill status={item.status} />
              </div>
              <div className={styles.paralegalChecklistBody}>
                <div>
                  <p className={styles.detailKey}>Notes</p>
                  <p className={styles.descriptionVal}>{item.notes || "No notes recorded"}</p>
                </div>
                <div>
                  <p className={styles.detailKey}>Secure File Link</p>
                  {item.fileLink ? (
                    safeUrl ? (
                      <a className={styles.paralegalFileLink} href={safeUrl} target="_blank" rel="noreferrer">Open secure file</a>
                    ) : (
                      <p className={styles.descriptionVal}>Saved link is invalid</p>
                    )
                  ) : (
                    <p className={styles.descriptionVal}>No file linked</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LegalReviewDetailsSection({ caseData }) {
  const hasParalegal = !!caseData.paralegalRecord;
  const hasLawyer = !!caseData.lawyerRecord;
  const hasEndorsement = !!(caseData.endorsedTo || caseData.endorsementDetails);
  const hasMonitoring = (caseData.monitoringLog || []).length > 0;
  const hasDocuments = (caseData.documentRepository || []).length > 0;
  const hasStatusDetails = (caseData.statusHistory || []).some((entry) => entry.formData || entry.form_data);
  const deadlines = getLegalCaseDeadlines(caseData);
  const paralegalEvidence = hasParalegal ? normalizeParalegalEvidence(caseData.paralegalRecord) : [];
  const paralegalObtainedCount = paralegalEvidence.filter((item) => item.status === "Obtained").length;
  const paralegalSummary = hasParalegal
    ? [
        `${paralegalObtainedCount}/${paralegalEvidence.length} evidence items obtained`,
        caseData.paralegalRecord.readyForLawyerReview ? "Ready for lawyer review" : "Not ready for lawyer review",
        caseData.paralegalRecord.date,
        caseData.paralegalRecord.organizedBy,
      ].filter(Boolean).join(" - ")
    : "";

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
          summary={paralegalSummary}
          defaultOpen
        >
          <ParalegalSupportDetails record={caseData.paralegalRecord} caseId={caseData.caseId || caseData.id} />
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
              const dayDelta = Math.ceil((deadline.date - new Date(new Date().toDateString())) / 86400000);
              return (
                <div key={`${deadline.label}-${deadline.value}-${index}`} className={styles.detailItem}>
                  <p className={styles.detailKey}>{deadline.label}</p>
                  <p className={styles.detailVal}>
                    {deadline.date.toLocaleDateString("en-PH")} ({dayDelta < 0 ? `${Math.abs(dayDelta)} day(s) overdue` : dayDelta === 0 ? "today" : `in ${dayDelta} day(s)`})
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

function CaseManagementTab({ caseData, setCaseData, isAdmin, isCaseOfficer, isLegal, isParalegal, isLawyer, actorName, userId, userRole, showToast }) {
  const [modal, setModal] = useState(null);
  const canUseParalegalWorkflows = isAdmin || isParalegal;
  const canUseLawyerWorkflow = isAdmin || isLawyer;
  const canUseAllLegalWorkflows = isAdmin || isParalegal;
  const canUseCalendarWorkflow = isAdmin || isParalegal || isLawyer;

  // Determine available status transitions
  function getAvailableTransitions() {
    if (isAdmin) return LEGAL_CASE_STATUSES.filter((s) => s !== caseData.status);
    return getSharedAvailableTransitions(caseData, { isAdmin, isCaseOfficer, isLegal: isParalegal })
      .filter((status) => LEGAL_CASE_STATUSES.includes(status));
  }

  async function saveCase(updated) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    let body = {
      performed_by_user_id: userId || null,
      action_type: "legal_review_updated",
      remarks: `Legal review updated for case ${caseData.caseId || caseData.id}.`,
      is_public: Boolean(updated.is_public),
      public_message: updated.is_public ? updated.public_message : null,
    };

    if (updated.paralegalRecord !== caseData.paralegalRecord) {
      body = {
        ...body,
        action_type: "paralegal_record_saved",
        remarks: "Paralegal support record saved.",
        paralegal_record: updated.paralegalRecord,
        document_repository: updated.documentRepository || [],
      };
    } else if (updated.lawyerRecord !== caseData.lawyerRecord) {
      body = {
        ...body,
        action_type: "lawyer_consultation_saved",
        remarks: "Lawyer consultation record saved.",
        lawyer_record: updated.lawyerRecord,
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

      const res = await fetch(`${API_URL}/api/case_status_history`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          case_report_id:   caseData.id,
          proposed_status:  proposedStatus,
          changed_by_id:    userId || null,
          changed_by_role:  userRole || 'legal personnel',
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
  const canOpenStatusModal = transitions.length > 0 || LEGAL_CASE_STATUSES.includes(caseData.status);

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
          {canUseParalegalWorkflows && (
            <Tooltip text="Assign or update paralegal support for this case.">
              <button onClick={() => setModal("paralegalSupport")} style={btnStyle("#037F81")}>Paralegal Support</button>
            </Tooltip>
          )}

          {canUseLawyerWorkflow && (
            <Tooltip text="Record a lawyer consultation and legal assessment.">
              <button onClick={() => setModal("lawyerConsult")} style={btnStyle("#037F81")}>Consult</button>
            </Tooltip>
          )}

          {canUseAllLegalWorkflows && (
            <Tooltip text="Endorse the case to another legal service or organization.">
              <button onClick={() => setModal("endorseFull")} style={btnStyle("#037F81")}>Endorse</button>
            </Tooltip>
          )}

          {canUseAllLegalWorkflows && (
            <Tooltip text="Record a monitoring update for the legal case.">
              <button onClick={() => setModal("monitorFull")} style={btnStyle("#037F81")}>Monitor</button>
            </Tooltip>
          )}

          {canUseCalendarWorkflow && (
            <Tooltip text="Jump to this case's hearings, deadlines, and legal events.">
              <button onClick={() => document.getElementById("legal-case-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={btnStyle("#037F81")}>Case Calendar</button>
            </Tooltip>
          )}

          {canUseAllLegalWorkflows && canOpenStatusModal && !caseData.pendingApproval && (
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
            ["Status",             <StatusBadge key="current-status" status={caseData.status} />],
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
        isLegal={isParalegal}
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

      <LawyerConsultModal
        open={modal === "lawyerConsult"}
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

export default function ViewCase() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();

  const caseId    = searchParams.get("caseId");
  const fromParam = searchParams.get("from");

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [toast, setToast]       = useState(null);

  const user = {
    role: authUser?.role_name || authUser?.role || null,
    firstName: authUser?.first_name || "",
    lastName: authUser?.last_name || "",
    id: authUser?.user_id || authUser?.id || null,
    legalPersonnelType: authUser?.legal_personnel_type || "",
  };
  const userLoaded = !authLoading;
  const normalizedRole = user.role?.toLowerCase();
  const isAdmin      = normalizedRole === "admin";
  const isCaseOfficer = normalizedRole === "case officer" || normalizedRole === "case_officer";
  const isLegal      = normalizedRole === "legal personnel" || normalizedRole === "legal_personnel";
  const isParalegal  = isLegal && isParalegalType(user.legalPersonnelType);
  const isLawyer     = isLegal && isLawyerType(user.legalPersonnelType);
  const isStaff      = isAdmin || isCaseOfficer || isLegal;
  const canViewNlp   = isStaff && !isLawyer;

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
    if (!caseId) { setError("No case ID provided"); setLoading(false); return; }
    const fetchCase = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
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
          incidentDate:            data.incident_date || null,
          incidentYear:            data.incident_year ?? null,
          incidentMonth:           data.incident_month ?? null,
          incidentDay:             data.incident_day ?? null,
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
          const calendarRes = await fetch(`${API_URL}/api/legal_reviews/case/${caseId}/calendar`, { credentials: "include" });
          if (calendarRes.ok) {
            const calendarPayload = await calendarRes.json().catch(() => ({}));
            setCaseData({ ...mappedCase, ...(calendarPayload.data || {}) });
          } else {
            setCaseData(mappedCase);
          }
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
      ...(canViewNlp ? [{ id: "nlp", label: "AI / NLP Analysis", tooltip: "Review automated language and case-structure analysis.", staffOnly: true }] : []),
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
          {activeTab === "details" && userLoaded && (
            <CaseDetailsPage caseData={caseData} isStaff={isStaff} />
          )}

          {activeTab === "management" && isStaff && userLoaded && (
            <CaseManagementTab
              caseData={caseData}
              setCaseData={setCaseData}
              isAdmin={isAdmin}
              isCaseOfficer={isCaseOfficer}
              isLegal={isLegal}
              isParalegal={isParalegal}
              isLawyer={isLawyer}
              actorName={actorName}
              userId={user.id}
              userRole={user.role}
              showToast={showToast}
            />
          )}

          {activeTab === "nlp" && canViewNlp && userLoaded && (
            <SharedNLPAnalysisTab caseReportId={caseData.id} isAdmin={isAdmin} />
          )}

        </div>
      </div>
    </div>
  );
}

