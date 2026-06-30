"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiInfo } from "react-icons/fi";
import { IoIosInformationCircle, IoIosWarning } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import EvidenceGallery from "./EvidenceGallery";
import styles from "./ViewCase.module.css";

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

const CASE_TYPE_DESCRIPTIONS = {
  "Sexual harassment": "This covers unwanted sexual remarks, advances, requests, or conduct that happens in person.",
  "Online sexual harassment": "This covers sexual harassment that takes place through chat, social media, email, calls, or any digital platform.",
  "Non-consensual sharing of intimate images/videos": "This includes sharing or threatening to share private intimate images or videos without the person's consent.",
  "Sexual assault / unwanted sexual touching": "This covers unwanted physical sexual contact such as groping, forced kissing, or coercive contact.",
  "Rape / attempted rape": "This includes forced or attempted forced sexual penetration.",
  "Child sexual abuse": "This covers any sexual act, grooming, exploitation, or coercion involving a minor.",
  "Sexual exploitation / trafficking-related sexual abuse": "This includes abuse tied to exchange, coercion, or exploitation involving power, money, or favors.",
  "Stalking with sexual nature or intent": "This covers persistent following, monitoring, threats, or repeated unwanted contact with sexual overtones.",
  "Gender-based sexual harassment in institutions": "This covers harassment in school, workplace, organization, training, or Scouting-related settings.",
};

const STATUS_EXPLANATIONS = {
  "For Verification": {
    title: "Your report has been received",
    description: "SASHA has received your report. An intake officer has logged your case and is checking the basic details, urgency, and available evidence.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  },
  "Undergoing Review": {
    title: "Your case is being reviewed",
    description: "A SASHA case officer is reviewing your report to determine whether it falls within SASHA's scope and what information may still be needed.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  },
  "Verified - True": {
    title: "Your report has been verified",
    description: "Your report has been found sufficiently credible and falls within SASHA's scope. SASHA can proceed with support, referral, or further case development.",
    icon: <FaCheckCircle />,
    color: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  },
  "Verified - False": {
    title: "Your report could not be verified",
    description: "SASHA was unable to proceed with your case after review. Your records remain confidential and controlled.",
    icon: <IoIosWarning />,
    color: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  },
  "Under Case Evaluation": {
    title: "Your case is being evaluated",
    description: "SASHA's team is assessing the best course of action, such as referral, legal proceedings, or other support.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  },
  "Case Filed": {
    title: "A formal complaint has been filed",
    description: "A formal complaint has been lodged with the appropriate body on your behalf. SASHA has recorded filing details for monitoring.",
    icon: <IoIosInformationCircle />,
    color: { bg: "#e0f2fe", color: "#0c4a6e", border: "#7dd3fc" },
  },
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

function formatIncidentDate(caseData) {
  if (caseData.incidentDate && caseData.incidentDate !== "Not provided") {
    const parsed = new Date(caseData.incidentDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });
    }
    return caseData.incidentDate;
  }

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const year = caseData.incidentYear ?? caseData.incident_year;
  const month = caseData.incidentMonth ?? caseData.incident_month;
  const day = caseData.incidentDay ?? caseData.incident_day;
  return [monthNames[Number(month)] || "", day, year].filter(Boolean).join(" ") || "Not provided";
}

function formatIncidentTime(value) {
  if (!value || value === "N/A") return "Not provided";
  const parsed = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
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

export default function CaseDetailsPage({ caseData, isStaff }) {
  const caseTypes = Array.isArray(caseData.caseType)
    ? caseData.caseType.filter(Boolean)
    : caseData.caseType ? [caseData.caseType] : [];
  const primaryCategory = caseData.primaryCategory || caseData.caseCategory || "";
  const additionalCategories = Array.isArray(caseData.additionalCategories)
    ? caseData.additionalCategories
    : Array.isArray(caseData.alsoInvolves) ? caseData.alsoInvolves : [];
  const categoryDisplay = primaryCategory
    ? additionalCategories.length > 0 ? `${primaryCategory} (also: ${additionalCategories.join(", ")})` : primaryCategory
    : additionalCategories.join(", ") || "Not yet classified";
  const assignedParalegals = (caseData.assignedLegal || [])
    .filter((person) => person.assignment_role === "paralegal")
    .map((person) => person.name)
    .filter(Boolean)
    .join(", ");
  const requestedOutcomes = Array.isArray(caseData.requestedOutcome)
    ? caseData.requestedOutcome
    : caseData.requestedOutcome ? [caseData.requestedOutcome] : [];
  const evidences = Array.isArray(caseData.evidences) ? caseData.evidences : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Complainant Details</h2>
        <div className={styles.detailGrid}>
          {[
            ["Name", caseData.name],
            ["Age", caseData.age],
            ["Gender Identity", caseData.genderIdentity],
            ["Email", caseData.email],
            ["Contact Number", caseData.contactNumber],
            ["Willing for Interview?", caseData.isWillingForInterview ? "Yes" : "No"],
            ["Anonymous Report?", caseData.isAnonymous ? "Yes" : "No"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Incident Details</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Location Type", caseData.incidentLocationType],
            ["Location", caseData.incidentLocationDisplay],
            ["Date", formatIncidentDate(caseData)],
            ["Time", formatIncidentTime(caseData.incidentTime)],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
        <p className={styles.detailKey}>Incident Description</p>
        <p className={styles.descriptionVal}>{caseData.description}</p>
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
            ] : [
              ["Gender of Perpetrator (as perceived)", caseData.perpetratorUnknownGender],
              ["Appearance or identifying details", caseData.perpetratorUnknownAppearance],
            ]),
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
      </section>

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

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Additional Context</h2>
        <div className={styles.detailGrid}>
          {[
            ["Reported to Anyone Else?", caseData.reportedToOthers ? "Yes" : "No"],
            ...(caseData.reportedToOthers && caseData.toldAnyoneWho ? [["Told To", caseData.toldAnyoneWho]] : []),
            ["Reported to Police?", caseData.reportedToPolice ? "Yes" : "No"],
            ...(caseData.reportedToPolice && caseData.policeStation ? [["Police Station", caseData.policeStation]] : []),
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeadingText}>Case Classification</h2>
        <div className={styles.detailGrid} style={{ marginBottom: "1rem" }}>
          {[
            ["Current Status", <StatusBadge key="current-status" status={caseData.status} />],
            ["Case Type", caseTypes.join(", ") || "Not yet classified"],
            ["Case Categories", categoryDisplay],
            ["Referral Required", caseData.referralRequired ? "Yes" : "No"],
            ["Referral Body", caseData.referralBody || "Unassigned"],
            ["Assigned Officer", caseData.assignedOfficer || "Unassigned"],
            ...(caseData.status === "Verified - True" || caseData.assignedParalegal || assignedParalegals
              ? [["Assigned Paralegal", assignedParalegals || caseData.assignedParalegal || "Pending assignment"]]
              : []),
            ["Endorsement", caseData.endorsementStatus || "Unassigned"],
          ].map(([k, v]) => (
            <div key={k} className={styles.detailItem}>
              <p className={styles.detailKey}>{k}</p>
              <p className={styles.detailVal}>{v || "Not provided"}</p>
            </div>
          ))}
        </div>

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

      {!isStaff ? (
        <section className={styles.section}>
          <h2 className={styles.sectionHeadingText}>Your Case History</h2>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.6 }}>
            Below is a timeline of your case&apos;s progress. Each entry shows what status your case moved to, when it changed, and any notes from the SASHA team.
          </p>
          <StatusHistorySection caseData={caseData} />
        </section>
      ) : (
        <StatusHistorySection caseData={caseData} />
      )}
    </div>
  );
}
