"use client";

import { useState, useRef } from "react";
import styles from "./ApplyApplicationForm.module.css";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Applicant's Info" },
  { id: 1, label: "Screening Questions" },
  { id: 2, label: "Essay" },
  { id: 3, label: "Supporting Credentials" },
  { id: 4, label: "Review & Submit" },
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

// ── Page 1 — Applicant's Information ───────────────────────────────────────
function StepApplicantInfo({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Applicant's</span> Information
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
      <Field label="Willingness to be interviewed by a SASHA Representative">
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

// ── Page 2 — Screening Questions ───────────────────────────────────────────────
function StepScreeningQuestions({ data, onChange }) {
  const setRadio = (key) => (v) => onChange({ ...data, [key]: v });
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Screening Questions</span>
      </h2>
      <p className={styles.stepDesc}>
        Please answer the following questions truthfully and honestly.
      </p>
      

        <div className={styles.radioColumn}>
          <Field label="Do you actively follow and stay informed about current social and political affairs?" required>
            <RadioGroup name="socialStance" options={["Yes", "No"]} value={data.socialStance} onChange={setRadio("socialStance")} />
          </Field>
          <Field label="Are you familiar with SASHA's mission and concerns related to gender equality and harassment prevention?" required>
            <RadioGroup name="shaKnowledge" options={["Yes", "No"]} value={data.shaKnowledge} onChange={setRadio("shaKnowledge")} />
          </Field>
          <Field label="Are you open to learning more about social advocacy and gender-related issues?" required>
            <RadioGroup name="openToLearn" options={["Yes", "No"]} value={data.openToLearn} onChange={setRadio("openToLearn")} />
          </Field>
          <Field label="Are you enthusiastic about actively contributing to the fight against gender-based discrimination and harassment?" required>
            <RadioGroup name="enthusiasm" options={["Yes", "No"]} value={data.enthusiasm} onChange={setRadio("enthusiasm")} />
          </Field>
          <Field label="Are you committed to dedicating time and effort as a SASHA volunteer?" required>
            <RadioGroup name="commitment" options={["Yes", "No"]} value={data.commitment} onChange={setRadio("commitment")} />
          </Field>
        </div>
    </div>
  );
}

// ── Page 3 — Essay ─────────────────────────────────────────────────
function StepEssay({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  const setRadio = (key) => (v) => onChange({ ...data, [key]: v });

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Essay</span>
      </h2>
      <p className={styles.stepDesc}>
        Please answer truthfully and honestly.
      </p>
      

      <div className={styles.formGrid}>
        <div>
          <Field label="Why do you want to Volunteer with SASHA?" required>
            <textarea
              className={styles.textarea}
              placeholder="Answer here..."
              value={data.description}
              onChange={set("description")}
              rows={5}
            />
          </Field>
          <p className={styles.fieldHint}>Please provide factual and clear information.</p>

          {/* <Field label="What action or outcome are you seeking?">
            <textarea
              className={styles.textarea}
              placeholder="Describe the action or outcome you are seeking..."
              value={data.outcome}
              onChange={set("outcome")}
              rows={3}
            />
          </Field> */}
        </div>
      </div>
    </div>
  );
}

// ── Page 4 — Supporting Credentials ─────────────────────────────────────────────
function StepCredentials({ data, onChange }) {
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
        <span className={styles.stepTitleAccent}>Supporting</span> Credentials
      </h2>
      <p className={styles.stepDesc}>
        Please submit your Resume, Certificates, Recommendation letters, or any relevant files that can support your application.
      </p>

      <div className={styles.credentialsLayout}>
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
    </div>
  );
}

// ── Page 5 — Review & Submit ──────────────────────────────────────────────────
function StepReview({ applicant, screeningQuestions, essay, credentials }) {
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
        Please review all information before submitting. Once submitted, your application will be handled with strict confidentiality.
      </p>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Applicant's Information</h3>
        <Row label="Name" value={applicant.name} />
        <Row label="Age" value={applicant.age} />
        <Row label="Gender Identity" value={applicant.gender} />
        <Row label="Organization" value={applicant.organization} />
        <Row label="Willing to be interviewed" value={applicant.interview} />
        <Row label="Contact Number" value={applicant.contactNumber} />
        <Row label="Email" value={applicant.email} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Screening Questions</h3>
        <Row label="Social stance on current affairs" value={screeningQuestions.socialStance} />
        <Row label="SASHA mission & gender equality knowledge" value={screeningQuestions.shaKnowledge} />
        <Row label="Openness to learn" value={screeningQuestions.openToLearn} />
        <Row label="Enthusiasm to join the fight" value={screeningQuestions.enthusiasm} />
        <Row label="Commitment to volunteering" value={screeningQuestions.commitment} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Essay Details</h3>
        <Row label="Description" value={essay.description} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Supporting Credentials</h3>
        <Row
          label="Files attached"
          value={
            credentials.files && credentials.files.length > 0
              ? credentials.files.map((f) => f.name).join(", ")
              : "None"
          }
        />
      </div>
    </div>
  );
}

// ── Status Stepper (for application cards below) ───────────────────────────────────
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

// ── Application Status Card ────────────────────────────────────────────────────────
function ApplicationStatusCard({ applicationData, onView }) {
  const steps = ["Submitted", "Under Review", "Resolved"];
  const { description = "—", location = "—", dateApplied = "—", id = "—", currentStep = 0 } = applicationData ?? {};
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Application 2</span>
        <button className={styles.headerViewBtn} onClick={onView}>View →</button>
      </div>
      <div className={styles.statusCardBody}>
        <div className={styles.applicationMetaRow}>
          <div>
            <p className={styles.statusMeta}>Description: {description}</p>
            <p className={styles.statusMeta}>Location: {location}</p>
            <p className={styles.statusMeta}>Date Applied: {dateApplied}</p>
          </div>
          <span className={styles.applicationId}>ID: {id}</span>
        </div>
        <StatusStepper steps={steps} current={currentStep} />
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function CreateApplication({
  applicationData = null,
  notifications   = [],
  events          = [],
}) {
  const [step, setStep]   = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [applicant, setApplicant] = useState({
    name: "", age: "", gender: "", organization: "",
    interview: "", contactNumber: "", email: "",
  });
  const [screeningQuestions, setScreeningQuestions] = useState({
  perpetratorKnown: "", witnesses: "",
    toldAnyone: "", toldPolice: "",
});
  const [essay, setEssay] = useState({
    description: "",
  });
  const [credentials, setCredentials] = useState({ files: []});

  const totalSteps = STEPS.length;

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };
  const handleSubmit = () => setSubmitted(true);

  // ── Demo fallback data for status cards ───────────────────────────────────
  const resolvedApplication = applicationData ?? {
    description: "Lorem Ipsum Dolor",
    location: "123 Metro Manila",
    dateApplied: "March 3, 2026",
    id: "00111222333",
    currentStep: 0,
  };

  const resolvedApplication2 = {
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
                Submit a Application
              </p>
              <h1 className={styles.heroTitle}>
                We're Here
                <span className={styles.heroTitleAccent}> to Help</span>
              </h1>
              <p className={styles.heroDesc}>
                Please provide accurate and detailed information. All applications are handled with strict confidentiality.
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
              <h2 className={styles.formCardTitle}>Application Submission Form</h2>
              <div className={styles.formCardHeaderLines}>
                <div className={styles.formCardHeaderLine} />
              </div>
            </div>

            {/* Wizard stepper */}
            <WizardStepper current={step} />

            {/* Step content */}
            <div className={styles.formBody}>
              {step === 0 && <StepApplicantInfo data={applicant} onChange={setApplicant} />}
              {step === 1 && <StepScreeningQuestions data={screeningQuestions} onChange={setScreeningQuestions} />}
              {step === 2 && <StepEssay data={essay} onChange={setEssay} />}
              {step === 3 && <StepCredentials        data={credentials}    onChange={setCredentials}    />}
              {step === 4 && <StepReview applicant={applicant} screeningQuestions={screeningQuestions} essay={essay} credentials={credentials} />}
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
                  Submit Application
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Application Submitted!</h2>
            <p className={styles.successDesc}>
              Your application has been received. We will review it and get back to you via your provided contact details.
              All information is handled with strict confidentiality.
            </p>
            <button className={styles.submitBtn} onClick={() => { setSubmitted(false); setStep(0); }}>
              Submit Another Application
            </button>
          </div>
        )}

        {/* ── Your Application Status ── */}
        <div className={`${styles.sectionHeading} mt-5`}>
          <h2 className={styles.sectionTitle}>Your Application Status</h2>
          <div className={styles.headingLine} />
        </div>

        <div className="row g-3">
          <div className="col-12">
            <ApplicationStatusCard applicationData={resolvedApplication} onView={() => {}} />
          </div>
          <div className="col-12">
            <ApplicationStatusCard applicationData={resolvedApplication2} onView={() => {}} />
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}