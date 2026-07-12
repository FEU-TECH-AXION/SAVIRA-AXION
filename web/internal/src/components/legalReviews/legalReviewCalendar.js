export function normalizeLegalList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value !== "string") return [String(value)];
  return value.trim().replace(/^\{|\}$/g, "")
    .split(/\s*,\s*|\s*\|\s*|\s*;\s*/)
    .map((item) => item.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

export function formatCaseTypes(caseData) {
  return [...new Set(normalizeLegalList(caseData.caseType))].join(", ");
}

export function formatCaseCategories(caseData) {
  return [...new Set([
    ...normalizeLegalList(caseData.primaryCategory),
    ...normalizeLegalList(caseData.additionalCategories),
  ])].join(", ");
}

function isDateLike(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function splitDateValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitDateValues);
  if (value instanceof Date) return [value];

  const text = String(value);
  const matches = [
    ...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g),
    ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g),
    ...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi),
  ].map((match) => match[0]);

  if (matches.length > 0) return matches;
  return isDateLike(text) ? [text] : [];
}

function titleFromKey(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function eventTypeFromLabel(label) {
  const text = String(label || "").toLowerCase();
  if (text.includes("hearing")) return "hearing";
  if (text.includes("investigation")) return "investigation";
  if (text.includes("referral") || text.includes("endorsement")) return "referral";
  if (text.includes("filing") || text.includes("filed")) return "filing";
  if (text.includes("consult")) return "consultation";
  if (text.includes("monitor") || text.includes("follow")) return "monitoring";
  if (text.includes("paralegal") || text.includes("lawyer review")) return "paralegal";
  return "legal";
}

function addDateEvents(events, { type, label, value, source }) {
  splitDateValues(value).forEach((dateValue) => {
    events.push({
      type: type || eventTypeFromLabel(label),
      label,
      value: dateValue,
      source,
    });
  });
}

function addObjectDateEvents(events, object, { source, prefix = "" } = {}) {
  Object.entries(object || {}).forEach(([key, value]) => {
    const label = `${prefix}${titleFromKey(key)}`;
    const keyText = key.toLowerCase();
    if (keyText.includes("date") || keyText.includes("schedule") || keyText.includes("hearing")) {
      addDateEvents(events, { label, value, source });
    }
  });
}

export function getLegalCaseDeadlines(caseData) {
  const events = [];

  addObjectDateEvents(events, caseData.endorsementDetails, { source: "endorsement" });

  (caseData.statusHistory || []).forEach((entry) => {
    const formData = entry.formData || entry.form_data || {};
    addDateEvents(events, { type: "status", label: `${entry.status || "Status"} update`, value: entry.date, source: "status" });
    addObjectDateEvents(events, formData, { source: "status" });
  });

  if (caseData.paralegalRecord) {
    addDateEvents(events, { type: "paralegal", label: "Paralegal support recorded", value: caseData.paralegalRecord.date, source: "paralegal" });
    addDateEvents(events, { type: "paralegal", label: "Ready for lawyer review", value: caseData.paralegalRecord.readyAt, source: "paralegal" });
  }

  if (caseData.lawyerRecord) {
    addDateEvents(events, { type: "consultation", label: "Lawyer consultation", value: caseData.lawyerRecord.date, source: "lawyer" });
    addDateEvents(events, { type: "consultation", label: "Lawyer consultation saved", value: caseData.lawyerRecord.savedAt, source: "lawyer" });
    (caseData.lawyerRecord.consultations || []).forEach((consultation) => {
      addDateEvents(events, {
        type: "consultation",
        label: `${consultation.consultationType || "Lawyer"} consultation`,
        value: consultation.date || consultation.consultationDate,
        source: "lawyer",
      });
      addDateEvents(events, { type: "consultation", label: "Lawyer consultation saved", value: consultation.savedAt, source: "lawyer" });
    });
  }

  (caseData.monitoringLog || []).forEach((entry) => {
    addDateEvents(events, { type: "monitoring", label: "Monitoring follow-up", value: entry.date, source: "monitoring" });
  });

  (caseData.documentRepository || []).forEach((document) => {
    addDateEvents(events, { type: "document", label: `Document added${document.label ? `: ${document.label}` : ""}`, value: document.addedAt, source: "document" });
  });

  return events
    .filter((item) => item.value && !Number.isNaN(new Date(item.value).getTime()))
    .map((item, index) => ({
      ...item,
      id: `${caseData.id}-${item.type}-${item.value}-${index}`,
      caseReportId: caseData.id,
      caseId: caseData.caseId || caseData.id,
      status: caseData.status,
      date: new Date(item.value),
      dateKey: String(item.value).slice(0, 10),
    }))
    .sort((a, b) => a.date - b.date);
}
