"use client";

import { useState, useRef } from "react";
import styles from "./CreateReport.module.css";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Complainant's Info" },
  { id: 1, label: "Incident Details" },
  { id: 2, label: "Supporting Evidence" },
  { id: 3, label: "Review & Submit" },
];

// ── Wizard Progress Bar ───────────────────────────────────────────────────────
function WizardStepper({ current }) {
  return (
    <div className={styles.wizardStepper}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={step.id} className={styles.wizardStepItem}>
            {i > 0 && (
              <div className={`${styles.wizardLine} ${done ? styles.wizardLineDone : ""}`} />
            )}
            <div
              className={`${styles.wizardDot}
                ${active ? styles.wizardDotActive : ""}
                ${done   ? styles.wizardDotDone  : ""}`}
            >
              {done ? "✓" : i + 1}
            </div>
            <span className={`${styles.wizardLabel} ${active ? styles.wizardLabelActive : ""} ${done ? styles.wizardLabelDone : ""}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared field components ───────────────────────────────────────────────────
function Field({ label, children, required }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}{required && <span className={styles.required}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return <input className={styles.input} {...props} />;
}

function Select({ children, ...props }) {
  return (
    <select className={styles.select} {...props}>
      {children}
    </select>
  );
}

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div className={styles.radioGroup}>
      {options.map((opt) => (
        <label key={opt} className={styles.radioLabel}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className={styles.radioInput}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── Page 1 — Complainant's Information ───────────────────────────────────────
function StepComplainantInfo({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Complainant's</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      <div className={styles.formGrid}>
        <Field label="Name" required>
          <Input placeholder="Full name" value={data.name} onChange={set("name")} />
        </Field>
        <Field label="Age" required>
          <Input type="number" placeholder="Age" value={data.age} onChange={set("age")} />
        </Field>
        <Field label="Gender Identity">
          <Select value={data.gender} onChange={set("gender")}>
            <option value="">Select gender identity</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Organization">
          <Select value={data.organization} onChange={set("organization")}>
            <option value="">Select organization</option>
            <option>BSP Unit</option>
            <option>GSPH Troop</option>
            <option>Other</option>
          </Select>
        </Field>
      </div>

      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Mode of Contact</h3>
      <div className={styles.formGrid}>
        <Field label="Contact Number" required>
          <Input placeholder="09XX-XXX-XXXX" value={data.contactNumber} onChange={set("contactNumber")} />
        </Field>
        <Field label="Email" required>
          <Input type="email" placeholder="sample@gmail.com" value={data.email} onChange={set("email")} />
        </Field>
      </div>

      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Consent</h3>
      <Field label="Willingness to be interviewed by a SASHA Representative and a SASHA paralegal and/or lawyer">
        <RadioGroup
          name="interview"
          options={["Yes", "No"]}
          value={data.interview}
          onChange={(v) => onChange({ ...data, interview: v })}
        />
      </Field>
    </div>
  );
}

// ── Page 2 — Incident Details ─────────────────────────────────────────────────
function StepIncidentDetails({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  const setRadio = (key) => (v) => onChange({ ...data, [key]: v });

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Incident</span> Details
      </h2>
      <p className={styles.stepDesc}>
        Provide as much detail as possible. Accurate information helps us assist you better.
      </p>

      <div className={styles.formGrid3}>
        <Field label="Date" required>
          <Input type="date" value={data.date} onChange={set("date")} />
        </Field>
        <Field label="Time">
          <Input type="time" value={data.time} onChange={set("time")} />
        </Field>
        <Field label="Location" required>
          <Input placeholder="Location" value={data.location} onChange={set("location")} />
        </Field>
      </div>
      <p className={styles.fieldHint}>Avoid including exact home addresses if you prefer privacy.</p>

      <div className={styles.formGrid}>
        <div>
          <Field label="Description of Incident" required>
            <textarea
              className={styles.textarea}
              placeholder="Describe what happened, including relevant details such as individuals involved and sequence of events."
              value={data.description}
              onChange={set("description")}
              rows={5}
            />
          </Field>
          <p className={styles.fieldHint}>Please provide factual and clear information.</p>

          <Field label="What action or outcome are you seeking?">
            <textarea
              className={styles.textarea}
              placeholder="Describe the action or outcome you are seeking..."
              value={data.outcome}
              onChange={set("outcome")}
              rows={3}
            />
          </Field>
        </div>

        <div className={styles.radioColumn}>
          <Field label="Is the perpetrator known?">
            <RadioGroup name="perpetratorKnown" options={["Yes", "No"]} value={data.perpetratorKnown} onChange={setRadio("perpetratorKnown")} />
          </Field>
          <Field label="Are there any witnesses?">
            <RadioGroup name="witnesses" options={["Yes", "No"]} value={data.witnesses} onChange={setRadio("witnesses")} />
          </Field>
          <Field label="Have you told anyone about the incident?">
            <RadioGroup name="toldAnyone" options={["Yes", "No"]} value={data.toldAnyone} onChange={setRadio("toldAnyone")} />
          </Field>
          <Field label="Have you told the police?">
            <RadioGroup name="toldPolice" options={["Yes", "No"]} value={data.toldPolice} onChange={setRadio("toldPolice")} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Page 3 — Supporting Evidence ─────────────────────────────────────────────
function StepEvidence({ data, onChange }) {
  const fileInputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    onChange({ ...data, files: [...(data.files || []), ...arr] });
  };

  const removeFile = (idx) => {
    const updated = data.files.filter((_, i) => i !== idx);
    onChange({ ...data, files: updated });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Supporting</span> Evidence
      </h2>
      <p className={styles.stepDesc}>
        Attach any files, photos, or documents relevant to the incident (optional).
      </p>

      <div className={styles.evidenceLayout}>
        {/* Drop zone */}
        <div
          className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className={styles.dropIcon}>↑</div>
          <p className={styles.dropText}>Drag and drop to upload files</p>
          <button
            type="button"
            className={styles.browseBtn}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
          >
            Browse
          </button>
          <p className={styles.dropHint}>Supported files: PDF, JPG, PNG, MP4</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.mp4"
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        <div className={styles.fileList}>
          <h3 className={styles.fileListTitle}>Submitted Files</h3>
          {(!data.files || data.files.length === 0) ? (
            <p className={styles.noFiles}>No files uploaded yet.</p>
          ) : (
            data.files.map((f, i) => (
              <div key={i} className={styles.fileItem}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileName}>{f.name}</span>
                <button
                  type="button"
                  className={styles.fileRemove}
                  onClick={() => removeFile(i)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.anonymousRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={data.anonymous}
            onChange={(e) => onChange({ ...data, anonymous: e.target.checked })}
          />
          I would like to submit Anonymously
        </label>
      </div>
    </div>
  );
}

// ── Page 4 — Review & Submit ──────────────────────────────────────────────────
function StepReview({ complainant, incident, evidence }) {
  const Row = ({ label, value }) => (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value || <em className={styles.reviewEmpty}>Not provided</em>}</span>
    </div>
  );

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Review</span> & Submit
      </h2>
      <p className={styles.stepDesc}>
        Please review all information before submitting. Once submitted, your report will be handled with strict confidentiality.
      </p>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Complainant's Information</h3>
        <Row label="Name" value={complainant.name} />
        <Row label="Age" value={complainant.age} />
        <Row label="Gender Identity" value={complainant.gender} />
        <Row label="Organization" value={complainant.organization} />
        <Row label="Willing to be interviewed" value={complainant.interview} />
        <Row label="Contact Number" value={complainant.contactNumber} />
        <Row label="Email" value={complainant.email} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Incident Details</h3>
        <Row label="Date" value={incident.date} />
        <Row label="Time" value={incident.time} />
        <Row label="Location" value={incident.location} />
        <Row label="Description" value={incident.description} />
        <Row label="Outcome sought" value={incident.outcome} />
        <Row label="Perpetrator known" value={incident.perpetratorKnown} />
        <Row label="Witnesses" value={incident.witnesses} />
        <Row label="Told anyone" value={incident.toldAnyone} />
        <Row label="Told police" value={incident.toldPolice} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Supporting Evidence</h3>
        <Row label="Anonymous submission" value={evidence.anonymous ? "Yes" : "No"} />
        <Row
          label="Files attached"
          value={
            evidence.files && evidence.files.length > 0
              ? evidence.files.map((f) => f.name).join(", ")
              : "None"
          }
        />
      </div>
    </div>
  );
}

// ── Status Stepper (for report cards below) ───────────────────────────────────
function StatusStepper({ steps, current }) {
  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} className={styles.stepItem}>
            {i > 0 && (
              <div className={`${styles.stepLine} ${done || active ? styles.stepLineDone : ""}`} />
            )}
            <div className={`${styles.stepDot} ${active ? styles.stepDotActive : ""} ${done ? styles.stepDotDone : ""}`} />
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Report Status Card ────────────────────────────────────────────────────────
function ReportStatusCard({ reportData, onView }) {
  const steps = ["Submitted", "Under Review", "Resolved"];
  const { description = "—", location = "—", dateApplied = "—", id = "—", currentStep = 0 } = reportData ?? {};
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Report 2</span>
        <button className={styles.headerViewBtn} onClick={onView}>View →</button>
      </div>
      <div className={styles.statusCardBody}>
        <div className={styles.reportMetaRow}>
          <div>
            <p className={styles.statusMeta}>Description: {description}</p>
            <p className={styles.statusMeta}>Location: {location}</p>
            <p className={styles.statusMeta}>Date Reported: {dateApplied}</p>
          </div>
          <span className={styles.reportId}>ID: {id}</span>
        </div>
        <StatusStepper steps={steps} current={currentStep} />
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function CreateReport({
  reportData      = null,
  applicationData = null,
  notifications   = [],
  events          = [],
}) {
  const [step, setStep]   = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [complainant, setComplainant] = useState({
    name: "", age: "", gender: "", organization: "",
    interview: "", contactNumber: "", email: "",
  });
  const [incident, setIncident] = useState({
    date: "", time: "", location: "", description: "",
    outcome: "", perpetratorKnown: "", witnesses: "",
    toldAnyone: "", toldPolice: "",
  });
  const [evidence, setEvidence] = useState({ files: [], anonymous: false });

  const totalSteps = STEPS.length;

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };
  const handleSubmit = () => setSubmitted(true);

  // ── Demo fallback data for status cards ───────────────────────────────────
  const resolvedReport = reportData ?? {
    description: "Lorem Ipsum Dolor",
    location: "123 Metro Manila",
    dateApplied: "March 3, 2026",
    id: "00111222333",
    currentStep: 0,
  };

  const resolvedReport2 = {
    description: "Lorem Ipsum Dolor",
    location: "123 Metro Manila",
    dateApplied: "Feb 24, 2026",
    id: "00111222333",
    currentStep: 1,
  };

  return (
    <main className={styles.pageWrapper}>
        <div className={styles.pageInner}>
      <div className="container-xl py-5">

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <p className={styles.heroEyebrow}>
                <span className={styles.heroLine} />
                Submit a Report
              </p>
              <h1 className={styles.heroTitle}>
                We're Here
                <span className={styles.heroTitleAccent}> to Help</span>
              </h1>
              <p className={styles.heroDesc}>
                Please provide accurate and detailed information. All reports are handled with strict confidentiality.
              </p>
            </div>
          </div>
        </section>

        {/* ── Paginated Form Card ── */}
        {!submitted ? (
          <div className={styles.formCard}>
            {/* Form card header */}
            <div className={styles.formCardHeader}>
              <div className={styles.formCardHeaderLines}>
                <div className={styles.formCardHeaderLine} />
              </div>
              <h2 className={styles.formCardTitle}>Report Submission Form</h2>
              <div className={styles.formCardHeaderLines}>
                <div className={styles.formCardHeaderLine} />
              </div>
            </div>

            {/* Wizard stepper */}
            <WizardStepper current={step} />

            {/* Step content */}
            <div className={styles.formBody}>
              {step === 0 && <StepComplainantInfo data={complainant} onChange={setComplainant} />}
              {step === 1 && <StepIncidentDetails data={incident}    onChange={setIncident}    />}
              {step === 2 && <StepEvidence        data={evidence}    onChange={setEvidence}    />}
              {step === 3 && <StepReview complainant={complainant} incident={incident} evidence={evidence} />}
            </div>

            {/* Navigation buttons */}
            <div className={styles.formNav}>
              {step > 0 ? (
                <button type="button" className={styles.backBtn} onClick={handleBack}>
                  ← Back
                </button>
              ) : <div />}

              {step < totalSteps - 1 ? (
                <button type="button" className={styles.nextBtn} onClick={handleNext}>
                  Next →
                </button>
              ) : (
                <button type="button" className={styles.submitBtn} onClick={handleSubmit}>
                  Submit Report
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Report Submitted!</h2>
            <p className={styles.successDesc}>
              Your report has been received. We will review it and get back to you via your provided contact details.
              All information is handled with strict confidentiality.
            </p>
            <button className={styles.submitBtn} onClick={() => { setSubmitted(false); setStep(0); }}>
              Submit Another Report
            </button>
          </div>
        )}

        {/* ── Your Report Status ── */}
        <div className={`${styles.sectionHeading} mt-5`}>
          <h2 className={styles.sectionTitle}>Your Report Status</h2>
          <div className={styles.headingLine} />
        </div>

        <div className="row g-3">
          <div className="col-12">
            <ReportStatusCard reportData={resolvedReport} onView={() => {}} />
          </div>
          <div className="col-12">
            <ReportStatusCard reportData={resolvedReport2} onView={() => {}} />
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}