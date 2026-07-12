"use client";

const STATUS_DETAIL_LABELS = {
  duplicateChecked: "Duplicate Report Checked",
  safetyIssues: "Immediate Safety Issues",
  missingInfo: "Missing Information",
  survivorContacted: "Survivor Contacted",
  credibilityBasis: "Basis for Credibility",
  scopeConfirmed: "Scope Confirmed",
  supportAction: "Recommended Next Action",
  reason: "Primary Reason",
  additionalReason: "Detailed Explanation",
  recordsHandled: "Records Handling",
  pathways: "Recommended Pathways",
  evidenceGaps: "Evidence Gaps",
  survivorInformed: "Survivor Informed",
  legalRisks: "Legal Risks / Considerations",
  filedWith: "Filed With",
  filingDate: "Filing Date",
  receivingOfficer: "Receiving Officer / Desk",
  referenceNumber: "Reference / Blotter Number",
  stationDetail: "Station / Desk Details",
  investigator: "Assigned Investigator",
  swornStatements: "Sworn Statements Taken",
  medicoLegal: "Medico-Legal / Evidence Preservation",
  codiOffice: "CODI / Office",
  respondentNotified: "Respondent Notified",
  hearingDate: "Hearing Date",
  investigationUpdate: "Investigation Status Update",
  survivorSafety: "Survivor Safety Assessment",
  proceduralFairness: "Procedural Fairness",
  nextFollowUp: "Next Follow-up Date",
  hearingType: "Type of Hearing / Proceeding",
  nextHearingDate: "Next Scheduled Hearing Date",
  attendanceNeeds: "Attendance Requirements",
  survivorSupport: "Survivor Support Needs",
  dismissalReason: "Reason for Dismissal",
  dismissingBody: "Dismissing Body / Institution",
  remainingRemedies: "Other Available Remedies",
  survivorNotified: "Survivor Notified",
  forum: "Deciding Forum / Institution",
  outcomeType: "Nature of Conviction / Finding",
  sanctions: "Sanctions Imposed",
  survivorSupportNeeds: "Continuing Survivor Support Needs",
  notes: "Additional Notes",
};

function humanize(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function normalizeFormData(entry) {
  const raw = entry?.formData ?? entry?.form_data;
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

export default function StatusDetailsSection({
  caseData,
  styles,
  title = "Status Details",
  emptyText = "No status details have been saved yet.",
  wrap = true,
  newestFirst = false,
}) {
  const entries = (caseData?.statusHistory || [])
    .map((entry) => ({ ...entry, formData: normalizeFormData(entry) }))
    .filter((entry) => !entry.approvalStatus || entry.approvalStatus === "approved")
    .filter((entry) => entry.formData && Object.values(entry.formData).some((value) => {
      const formatted = formatValue(value);
      return formatted !== undefined && formatted !== null && String(formatted).trim() !== "";
    }));
  const orderedEntries = newestFirst ? [...entries].reverse() : entries;

  const content = (
    <>
      {title && <h2 className={styles.sectionHeadingText}>{title}</h2>}
      {orderedEntries.length === 0 ? (
        <p className={styles.emptyState}>{emptyText}</p>
      ) : (
        orderedEntries.map((entry, index) => {
          const key = entry.historyId || `${entry.status}-${entry.date}-${index}`;
          const details = (
            <div className={styles.detailGrid}>
              {[
                ["Date", entry.date],
                ["Updated By", entry.by],
                ...Object.entries(entry.formData).map(([fieldKey, value]) => [STATUS_DETAIL_LABELS[fieldKey] || humanize(fieldKey), formatValue(value)]),
              ].map(([label, value]) => {
                if (value === undefined || value === null || String(value).trim() === "") return null;
                return (
                  <div key={label} className={styles.detailItem}>
                    <p className={styles.detailKey}>{label}</p>
                    <p className={styles.detailVal}>{value}</p>
                  </div>
                );
              })}
            </div>
          );

          return (
            <div key={key} className={styles.reviewDetailBlock}>
              <h3 className={styles.reviewDetailTitle}>{entry.status}</h3>
              {details}
            </div>
          );
        })
      )}
    </>
  );

  return wrap ? <section className={styles.section}>{content}</section> : content;
}
