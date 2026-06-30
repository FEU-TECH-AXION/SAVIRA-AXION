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

const LAW_OPTIONS = [
  {
    label: "RA 11313 (Safe Spaces Act)",
    description: "Covers gender-based sexual harassment in streets, public spaces, online spaces, workplaces, and educational or training institutions.",
  },
  {
    label: "RA 9262 (VAWC)",
    description: "Applies to violence against women and their children committed by a spouse, former spouse, or person with whom the survivor has or had a sexual or dating relationship.",
  },
  {
    label: "RA 7877 (Anti-Sexual Harassment Act)",
    description: "Addresses sexual harassment involving authority, influence, or moral ascendancy in work, education, or training settings.",
  },
  {
    label: "RA 9995 (Anti-Photo and Video Voyeurism Act)",
    description: "Covers non-consensual recording, reproduction, distribution, publication, or broadcasting of sexual images or videos.",
  },
  {
    label: "RA 10175 (Cybercrime Prevention Act)",
    description: "Provides cybercrime provisions that may apply when abuse, threats, identity misuse, or sexual exploitation occurs through computer systems.",
  },
  {
    label: "RA 11930 (Anti-OSAEC and Anti-CSAEM Act)",
    description: "Covers online sexual abuse or exploitation of children and child sexual abuse or exploitation materials.",
  },
  {
    label: "Revised Penal Code - Rape provisions",
    description: "Applies to rape and related criminal offenses under the Revised Penal Code, as amended by later special laws.",
  },
  {
    label: "RA 9208 (Anti-Trafficking in Persons Act)",
    description: "Applies to trafficking, recruitment, transport, harboring, or exploitation for sexual exploitation or other prohibited purposes.",
  },
  {
    label: "Administrative / institutional rules",
    description: "Applies to school, workplace, organizational, or agency procedures such as CODI processes, student discipline, HR action, or professional sanctions.",
  },
];

const ACTION_OPTIONS = [
  {
    label: "Administrative action",
    description: "Pursue remedies through school, workplace, organizational, agency, or professional disciplinary channels.",
  },
  {
    label: "Civil action",
    description: "Consider civil remedies such as damages, protection orders, or other court relief focused on survivor protection or compensation.",
  },
  {
    label: "Criminal action",
    description: "Refer or prepare for police, prosecutor, or court processes where the facts may support criminal liability.",
  },
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

function DescribedCheckbox({ option, checked, onChange }) {
  return (
    <label className={`${styles.describedCheckLabel} ${checked ? styles.describedCheckLabelSelected : ""}`}>
      <span className={styles.describedCheckTop}>
        <input
          type="checkbox"
          className={styles.checkInput}
          checked={checked}
          onChange={onChange}
        />
        <span className={styles.describedCheckText}>{option.label}</span>
      </span>
      {checked && <span className={styles.describedCheckDescription}>{option.description}</span>}
    </label>
  );
}

export function LawyerConsultModal({ open, onClose, caseData, onSave, actorName }) {
  if (!open || !caseData) return null;
  return (
    <LawyerConsultModalForm
      open={open}
      onClose={onClose}
      caseData={caseData}
      onSave={onSave}
      actorName={actorName}
    />
  );
}

function LawyerConsultModalForm({ open, onClose, caseData, onSave, actorName }) {
  const automaticGaps = Object.entries(caseData?.paralegalRecord?.evidenceItems || {})
    .filter(([, item]) => item.status !== "Obtained")
    .map(([label, item]) => `${label}: ${item.status}`)
    .join("\n");
  const record = caseData.lawyerRecord || {};
  const [publicUpdate, setPublicUpdate] = useState({ isPublic: false, publicMessage: "" });
  const [form, setForm] = useState(() => ({
    consultationType: record.consultationType ? "Follow-up" : "Initial",
    consultationDate: new Date().toISOString().split("T")[0],
    engagementStatus: record.engagementStatus || "Advisory input only",
    applicableLaws: record.applicableLaws || [],
    actionType: record.actionType || [],
    evidenceGaps: record.evidenceGaps || automaticGaps,
    recommendation: record.recommendation || "",
    additionalNotes: record.additionalNotes || "",
  }));

  const toggle = (key, value) => setForm((previous) => ({
    ...previous,
    [key]: previous[key].includes(value)
      ? previous[key].filter((item) => item !== value)
      : [...previous[key], value],
  }));

  async function handleSave() {
    const consultation = {
      assessedBy: actorName,
      date: form.consultationDate,
      consultationType: form.consultationType,
      engagementStatus: form.engagementStatus,
      applicableLaws: form.applicableLaws,
      actionType: form.actionType,
      evidenceGaps: form.evidenceGaps,
      recommendation: form.recommendation,
      additionalNotes: form.additionalNotes,
      savedAt: new Date().toISOString(),
    };
    await onSave({
      ...caseData,
      lawyerRecord: {
        ...consultation,
        consultations: [...(caseData.lawyerRecord?.consultations || []), consultation],
      },
      is_public: publicUpdate.isPublic,
      public_message: publicUpdate.publicMessage,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Lawyer Consultation - Legal Assessment" wide>
      {caseData.paralegalRecord?.readyForLawyerReview && <p className={styles.approvalNotice}>The paralegal marked this file ready for lawyer review.</p>}
      <div className={styles.formGrid}>
        <FormGroup label="Consultation type">
          <FSelect value={form.consultationType} onChange={(event) => setForm((previous) => ({ ...previous, consultationType: event.target.value }))}>
            <option>Initial</option>
            <option>Follow-up</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Consultation date">
          <FInput type="date" value={form.consultationDate} onChange={(event) => setForm((previous) => ({ ...previous, consultationDate: event.target.value }))} />
        </FormGroup>
        <FormGroup label="Engagement status">
          <FSelect value={form.engagementStatus} onChange={(event) => setForm((previous) => ({ ...previous, engagementStatus: event.target.value }))}>
            <option>Advisory input only</option>
            <option>Counsel of record</option>
          </FSelect>
        </FormGroup>
        <FormGroup label="Applicable laws / provisions">
          <div className={styles.checkGroup}>
            {LAW_OPTIONS.map((law) => (
              <DescribedCheckbox
                key={law.label}
                option={law}
                checked={form.applicableLaws.includes(law.label)}
                onChange={() => toggle("applicableLaws", law.label)}
              />
            ))}
          </div>
        </FormGroup>
        <FormGroup label="Possible courses of action">
          <div className={styles.checkGroup}>
            {ACTION_OPTIONS.map((action) => (
              <DescribedCheckbox
                key={action.label}
                option={action}
                checked={form.actionType.includes(action.label)}
                onChange={() => toggle("actionType", action.label)}
              />
            ))}
          </div>
        </FormGroup>
        <FormGroup label="Evidence gaps identified" hint="Pre-filled from evidence items that are not yet obtained.">
          <FTextarea value={form.evidenceGaps} onChange={(event) => setForm((previous) => ({ ...previous, evidenceGaps: event.target.value }))} />
        </FormGroup>
        <FormGroup label="Legal recommendation" required>
          <FTextarea value={form.recommendation} onChange={(event) => setForm((previous) => ({ ...previous, recommendation: event.target.value }))} />
        </FormGroup>
        <FormGroup label="Additional notes">
          <FTextarea value={form.additionalNotes} onChange={(event) => setForm((previous) => ({ ...previous, additionalNotes: event.target.value }))} />
        </FormGroup>
        <PublicMessageField
          actionType="lawyer_consultation_saved"
          contextFields={{ consultationType: form.consultationType }}
          value={publicUpdate}
          onChange={setPublicUpdate}
        />
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={!form.recommendation.trim()}>Save Consultation</button>
      </div>
    </Modal>
  );
}
