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

export function getLegalCaseDeadlines(caseData) {
  return [
    { type: "referral", label: "Referral follow-up", value: caseData.endorsementDetails?.["Follow-up Date"] },
    ...(caseData.statusHistory || []).flatMap((entry) => [
      { type: "filing", label: "Filing date", value: entry.formData?.filingDate || entry.form_data?.filingDate },
      { type: "hearing", label: "Next hearing", value: entry.formData?.nextHearingDate || entry.form_data?.nextHearingDate },
      { type: "investigation", label: "Investigation follow-up", value: entry.formData?.nextFollowUp || entry.form_data?.nextFollowUp },
    ]),
  ]
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
