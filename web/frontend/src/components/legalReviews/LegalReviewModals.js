"use client";

import { useEffect, useState } from "react";
import { FiChevronDown, FiX } from "react-icons/fi";
import Tooltip from "@/components/ui/Tooltip";
import PublicMessageField from "@/components/cases/PublicMessageField";
import styles from "./LegalReviewModals.module.css";

export const ENDORSEMENT_BODIES = [
  "DSWD",
  "PNP Women and Children Protection Desk",
  "BSP/GSP Mechanism",
  "School/Workplace CODI",
  "Court (with lawyer)",
];

export const PARALEGAL_EVIDENCE_LABELS = [
  "Sworn statement",
  "Incident timeline",
  "Screenshots / digital evidence",
  "ID documents",
  "Medico-legal report",
  "Witness statements",
];

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} style={wide ? { maxWidth: 700 } : undefined} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <Tooltip text="Close dialog">
            <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close dialog"><FiX /></button>
          </Tooltip>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export function FormGroup({ label, required, hint, error, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
      {hint && !error && <span className={styles.formHint}>{hint}</span>}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

export function FInput({ error, ...props }) {
  return <input className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props} />;
}

export function FTextarea({ error, ...props }) {
  return <textarea className={`${styles.formInput} ${error ? styles.inputError : ""}`} rows={3} style={{ resize: "vertical" }} {...props} />;
}

export function FSelect({ error, children, ...props }) {
  return <select className={`${styles.formInput} ${error ? styles.inputError : ""}`} {...props}>{children}</select>;
}

function emptyEvidence() {
  return Object.fromEntries(PARALEGAL_EVIDENCE_LABELS.map((label) => [
    label,
    { status: "Not started", notes: "", fileLink: "" },
  ]));
}

export function ParalegalSupportModal({ open, onClose, caseData, onSave, actorName }) {
  const [expandedEvidenceLabels, setExpandedEvidenceLabels] = useState([]);
  const [publicUpdate, setPublicUpdate] = useState({ isPublic: false, publicMessage: "" });
  const [form, setForm] = useState({
    evidenceItems: emptyEvidence(),
    selectedEvidenceLabels: [],
    incidentDetails: "",
    otherNotes: "",
    explainedToSurvivor: "",
    survivorUnderstood: false,
    readyForLawyerReview: false,
  });

  useEffect(() => {
    if (!open || !caseData) return;
    const record = caseData.paralegalRecord || {};
    const legacyObtained = new Set(record.documents?.split(", ").filter(Boolean) || []);
    const evidenceItems = Object.fromEntries(PARALEGAL_EVIDENCE_LABELS.map((label) => [
      label,
      record.evidenceItems?.[label] || {
        status: legacyObtained.has(label) ? "Obtained" : "Not started",
        notes: "",
        fileLink: "",
      },
    ]));
    const selectedEvidenceLabels = Array.isArray(record.selectedEvidenceLabels)
      ? record.selectedEvidenceLabels.filter((label) => PARALEGAL_EVIDENCE_LABELS.includes(label))
      : PARALEGAL_EVIDENCE_LABELS.filter((label) => {
          const item = evidenceItems[label];
          return legacyObtained.has(label) ||
            item?.status === "Obtained" ||
            item?.status === "In progress" ||
            item?.status === "Survivor declined" ||
            Boolean(item?.notes) ||
            Boolean(item?.fileLink);
        });

    setForm({
      evidenceItems,
      selectedEvidenceLabels,
      incidentDetails: record.incidentDetails || "",
      otherNotes: record.otherNotes || "",
      explainedToSurvivor: record.explainedToSurvivor || "",
      survivorUnderstood: Boolean(record.survivorUnderstood),
      readyForLawyerReview: Boolean(record.readyForLawyerReview),
    });
    setExpandedEvidenceLabels(selectedEvidenceLabels.slice(0, 1));
    setPublicUpdate({ isPublic: false, publicMessage: "" });
  }, [open, caseData]);

  if (!caseData) return null;

  const setEvidence = (label, key, value) => setForm((previous) => ({
    ...previous,
    evidenceItems: {
      ...previous.evidenceItems,
      [label]: { ...previous.evidenceItems[label], [key]: value },
    },
  }));

  const toggleEvidence = (label, checked) => setForm((previous) => ({
    ...previous,
    selectedEvidenceLabels: checked
      ? [...new Set([...previous.selectedEvidenceLabels, label])]
      : previous.selectedEvidenceLabels.filter((item) => item !== label),
  }));

  const handleEvidenceChecked = (label, checked) => {
    toggleEvidence(label, checked);
    setExpandedEvidenceLabels((previous) => checked
      ? [...new Set([...previous, label])]
      : previous.filter((item) => item !== label));
  };

  const toggleEvidencePanel = (label) => setExpandedEvidenceLabels((previous) => (
    previous.includes(label)
      ? previous.filter((item) => item !== label)
      : [...previous, label]
  ));

  async function handleSave() {
    const selectedEvidenceLabels = form.selectedEvidenceLabels.filter((label) => PARALEGAL_EVIDENCE_LABELS.includes(label));
    const obtained = selectedEvidenceLabels.filter((label) => form.evidenceItems[label]?.status === "Obtained");
    const linkedDocuments = selectedEvidenceLabels
      .filter((label) => form.evidenceItems[label]?.fileLink)
      .map((label) => ({
        name: label,
        link: form.evidenceItems[label].fileLink,
        confidential: true,
        uploadedBy: actorName,
        addedAt: new Date().toISOString(),
      }));

    await onSave({
      ...caseData,
      paralegalRecord: {
        organizedBy: actorName,
        date: new Date().toLocaleDateString("en-PH"),
        documents: obtained.join(", "),
        evidenceItems: form.evidenceItems,
        selectedEvidenceLabels,
        incidentDetails: form.incidentDetails,
        otherNotes: form.otherNotes,
        explainedToSurvivor: form.explainedToSurvivor,
        survivorUnderstood: form.survivorUnderstood,
        readyForLawyerReview: form.readyForLawyerReview,
        readyAt: form.readyForLawyerReview ? new Date().toISOString() : null,
      },
      documentRepository: linkedDocuments,
      is_public: publicUpdate.isPublic,
      public_message: publicUpdate.publicMessage,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Paralegal Support — Evidence Checklist" wide>
      <p className={styles.formDesc}>Track each evidence item, record what was explained to the survivor, and mark the file ready for lawyer review.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.caseId || caseData.id} disabled /></FormGroup>
        <FormGroup label="Evidence to document" hint="Select an item to open its evidence card.">
          <div className={styles.evidenceSelector}>
            {PARALEGAL_EVIDENCE_LABELS.map((label) => (
              <label key={label} className={styles.checkLabel}>
                <input
                  className={styles.checkInput}
                  type="checkbox"
                  checked={form.selectedEvidenceLabels.includes(label)}
                  onChange={(event) => handleEvidenceChecked(label, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </FormGroup>
        {PARALEGAL_EVIDENCE_LABELS.map((label) => (
          form.selectedEvidenceLabels.includes(label) && (
            <div key={label} className={styles.evidenceCard}>
              <button
                type="button"
                className={styles.evidenceAccordionButton}
                onClick={() => toggleEvidencePanel(label)}
                aria-expanded={expandedEvidenceLabels.includes(label)}
              >
                <span className={styles.evidenceTitle}>{label}</span>
                <span className={styles.evidenceAccordionMeta}>
                  {form.evidenceItems[label]?.status || "Not started"}
                  <FiChevronDown
                    className={`${styles.evidenceChevron} ${expandedEvidenceLabels.includes(label) ? styles.evidenceChevronOpen : ""}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {expandedEvidenceLabels.includes(label) && (
                <div className={styles.evidenceAccordionBody}>
                  <FormGroup label="Status">
                    <FSelect value={form.evidenceItems[label]?.status || "Not started"} onChange={(event) => setEvidence(label, "status", event.target.value)}>
                      <option>Not started</option>
                      <option>In progress</option>
                      <option>Obtained</option>
                      <option>Survivor declined</option>
                    </FSelect>
                  </FormGroup>
                  <FormGroup label="Notes"><FTextarea value={form.evidenceItems[label]?.notes || ""} onChange={(event) => setEvidence(label, "notes", event.target.value)} /></FormGroup>
                  <FormGroup label="Optional secure file link"><FInput type="url" value={form.evidenceItems[label]?.fileLink || ""} onChange={(event) => setEvidence(label, "fileLink", event.target.value)} /></FormGroup>
                </div>
              )}
            </div>
          )
        ))}
        <FormGroup label="Key incident details"><FTextarea value={form.incidentDetails} onChange={(event) => setForm((previous) => ({ ...previous, incidentDetails: event.target.value }))} /></FormGroup>
        <FormGroup label="What was explained to the survivor?"><FTextarea value={form.explainedToSurvivor} onChange={(event) => setForm((previous) => ({ ...previous, explainedToSurvivor: event.target.value }))} /></FormGroup>
        <FormGroup label="Additional notes"><FTextarea value={form.otherNotes} onChange={(event) => setForm((previous) => ({ ...previous, otherNotes: event.target.value }))} /></FormGroup>
        <label className={styles.checkLabel}><input className={styles.checkInput} type="checkbox" checked={form.survivorUnderstood} onChange={(event) => setForm((previous) => ({ ...previous, survivorUnderstood: event.target.checked }))} />Survivor confirmed understanding</label>
        <label className={styles.checkLabel}><input className={styles.checkInput} type="checkbox" checked={form.readyForLawyerReview} onChange={(event) => setForm((previous) => ({ ...previous, readyForLawyerReview: event.target.checked }))} />Ready for lawyer review</label>
        <PublicMessageField
          actionType="paralegal_record_saved"
          contextFields={{}}
          value={publicUpdate}
          onChange={setPublicUpdate}
        />
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSave}>Save Checklist</button>
      </div>
    </Modal>
  );
}

const DETAIL_FIELDS = {
  DSWD: [
    ["Date of Endorsement", "date"],
    ["Receiving Office", "text"],
    ["Reference No.", "text"],
    ["Follow-up Date", "date"],
    ["Services Provided", "textarea"],
  ],
  "PNP Women and Children Protection Desk": [
    ["Date of Endorsement", "date"],
    ["Station", "text"],
    ["Blotter No.", "text"],
    ["Investigator", "text"],
    ["Forwarded to Prosecutor", "text"],
  ],
  "BSP/GSP Mechanism": [
    ["Date of Endorsement", "date"],
    ["Chapter/Unit", "text"],
    ["Receiving Official", "text"],
    ["Fact-Finding Started", "text"],
    ["Sanctions/Inaction", "textarea"],
  ],
  "School/Workplace CODI": [
    ["Date of Endorsement", "date"],
    ["Institution", "text"],
    ["CODI Focal Person", "text"],
    ["Investigation Schedule", "text"],
    ["Status Updates", "textarea"],
    ["Final Decision", "textarea"],
  ],
  "Court (with lawyer)": [
    ["Case No.", "text"],
    ["Filing Date", "date"],
    ["Counsel", "text"],
    ["Hearing Dates", "textarea"],
    ["Postponements", "textarea"],
    ["Witness Preparation", "textarea"],
    ["Judgment", "textarea"],
  ],
};

export function EndorseModal({ open, onClose, caseData, onSave }) {
  const [body, setBody] = useState("");
  const [details, setDetails] = useState({});
  const [publicUpdate, setPublicUpdate] = useState({ isPublic: false, publicMessage: "" });

  useEffect(() => {
    if (!open || !caseData) return;
    setBody(caseData.endorsedTo || "");
    setDetails(caseData.endorsementDetails || {});
    setPublicUpdate({ isPublic: false, publicMessage: "" });
  }, [open, caseData]);

  if (!caseData) return null;
  const recommendedBodies = caseData.lawyerRecord?.actionType?.includes("Criminal action")
    ? ["PNP Women and Children Protection Desk", "Court (with lawyer)"]
    : [];

  async function handleSave() {
    await onSave({
      ...caseData,
      endorsedTo: body,
      referralBody: body,
      referralRequired: true,
      endorsementStatus: `Endorsed to ${body}`,
      endorsementDetails: {
        ...details,
        "Lawyer Recommendation": caseData.lawyerRecord?.recommendation || "",
        "Recommendation Alignment": recommendedBodies.length === 0 || recommendedBodies.includes(body) ? "Aligned" : "Different path selected",
      },
      is_public: publicUpdate.isPublic,
      public_message: publicUpdate.publicMessage,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Endorse / Track Referral" wide>
      <p className={styles.formDesc}>Record referral details so the receiving institution and follow-up obligations remain visible.</p>
      {recommendedBodies.length > 0 && <p className={styles.notice}>Based on the lawyer’s recommendation, consider {recommendedBodies.join(" or ")}. This remains overridable.</p>}
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.caseId || caseData.id} disabled /></FormGroup>
        <FormGroup label="Endorse to institution" required>
          <FSelect value={body} onChange={(event) => { setBody(event.target.value); setDetails({}); }}>
            <option value="">Select institution</option>
            {ENDORSEMENT_BODIES.map((institution) => <option key={institution}>{institution}</option>)}
          </FSelect>
        </FormGroup>
        {body && <div className={styles.sectionDivider}>{body} details</div>}
        {(DETAIL_FIELDS[body] || []).map(([label, type]) => (
          <FormGroup key={label} label={label}>
            {type === "textarea"
              ? <FTextarea value={details[label] || ""} onChange={(event) => setDetails((previous) => ({ ...previous, [label]: event.target.value }))} />
              : <FInput type={type} value={details[label] || ""} onChange={(event) => setDetails((previous) => ({ ...previous, [label]: event.target.value }))} />}
          </FormGroup>
        ))}
        <PublicMessageField
          actionType="endorsement_saved"
          contextFields={{ institution: body }}
          value={publicUpdate}
          onChange={setPublicUpdate}
        />
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={!body}>Save Endorsement</button>
      </div>
    </Modal>
  );
}

export function MonitoringModal({ open, onClose, caseData, onSave, actorName }) {
  const [update, setUpdate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [publicUpdate, setPublicUpdate] = useState({ isPublic: false, publicMessage: "" });

  useEffect(() => {
    if (!open) return;
    setUpdate("");
    setDate(new Date().toISOString().split("T")[0]);
    setPublicUpdate({ isPublic: false, publicMessage: "" });
  }, [open]);

  if (!caseData) return null;

  async function handleSave() {
    if (!update.trim()) return;
    const entry = { date: new Date(`${date}T00:00:00`).toLocaleDateString("en-PH"), by: actorName, update };
    await onSave({
      ...caseData,
      monitoringLog: [...(caseData.monitoringLog || []), entry],
      is_public: publicUpdate.isPublic,
      public_message: publicUpdate.publicMessage,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Monitoring Update" wide>
      <p className={styles.formDesc}>Log referral progress, survivor contact, institutional action, and the next follow-up.</p>
      <div className={styles.formGrid}>
        <FormGroup label="Case ID"><FInput value={caseData.caseId || caseData.id} disabled /></FormGroup>
        <FormGroup label="Current institution"><FInput value={caseData.endorsedTo || "Not yet endorsed"} disabled /></FormGroup>
        <FormGroup label="Date of follow-up" required><FInput type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormGroup>
        <FormGroup label="Update / findings" required><FTextarea rows={5} value={update} onChange={(event) => setUpdate(event.target.value)} /></FormGroup>
        <PublicMessageField
          actionType="monitoring_update_added"
          contextFields={{ institution: caseData.endorsedTo }}
          value={publicUpdate}
          onChange={setPublicUpdate}
        />
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={!update.trim()}>Add Entry</button>
      </div>
    </Modal>
  );
}
