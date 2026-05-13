"use client";

import { useState, useRef } from "react";
import styles from "./ApplyApplicationForm.module.css";

// ── NCR Data ──────────────────────────────────────────────────────────────────
const NCR_CITIES = [
  "Caloocan",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Pateros",
  "Quezon City",
  "San Juan",
  "Taguig",
  "Valenzuela",
];

// ── Validation helpers ────────────────────────────────────────────────────────
const PHONE_REGEX = /^\+639\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalises a raw phone input into +63XXXXXXXXXX format.
 * Accepts:  09XXXXXXXXX  |  9XXXXXXXXX  |  +639XXXXXXXXX  (with/without separators)
 * Returns the cleaned string (may be partial — caller decides validity).
 */
function normalisePhone(raw) {
  // Strip everything except digits and a leading +
  let digits = raw.replace(/[^\d]/g, "");

  // Strip a leading country-code prefix if present (63…)
  if (digits.startsWith("63")) digits = digits.slice(2);

  // Strip a leading 0 (local format 09XX…)
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Cap at 10 digits (9XXXXXXXXX)
  digits = digits.slice(0, 10);

  return digits ? `+63${digits}` : "";
}

function validateStep0(data) {
  const errors = {};

  if (!data.name) errors.name = "Name is required.";
  if (!data.age) errors.age = "Age is required.";
  if (!data.gender) errors.gender = "Gender identity is required.";
  if (!data.organization) errors.organization = "Organization is required.";

  if (!data.contactNumber) {
    errors.contactNumber = "Contact number is required.";
  } else if (!PHONE_REGEX.test(data.contactNumber)) {
    errors.contactNumber = "Enter a valid Philippine mobile number (must be 11 digits).";
  }

  if (!data.email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "Enter a valid email address (e.g. sample@gmail.com).";
  }

  if (!data.interview) errors.interview = "Consent to interview is required.";

  return errors;
}

function validateStep1(data) {
  const errors = {};

  if (!data.socialStance) errors.socialStance = "This field is required.";
  if (!data.shaKnowledge) errors.shaKnowledge = "This field is required.";
  if (!data.openToLearn) errors.openToLearn = "This field is required.";
  if (!data.enthusiasm) errors.enthusiasm = "This field is required.";
  if (!data.commitment) errors.commitment = "This field is required.";

  return errors;
}

function validateStep2(data) {
  const errors = {};

  if (!data.description) errors.description = "Essay response is required.";

  return errors;
}

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Applicant's Info" },
  { id: 1, label: "Screening Questions" },
  { id: 2, label: "Essay" },
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
function Field({ label, children, required, hint, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}{required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className={styles.fieldHint}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.fieldError}>
          {error}
        </p>
      )}
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
function StepApplicantInfo({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    const value = e.target.value;
    if (key === "contactNumber") {
      const formatted = normalisePhone(value);
      onChange({ ...data, [key]: formatted });
    } else {
      onChange({ ...data, [key]: value });
    }
  };
  
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Applicant's</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      <div className={styles.formGrid}>
        <Field label="Name" required error={errors.name}>
          <Input placeholder="Full name" value={data.name} onChange={set("name")} />
        </Field>
        <Field label="Age" required error={errors.age}>
          <Input type="number" placeholder="Age" value={data.age} onChange={set("age")} />
        </Field>
        <Field label="Gender Identity" required error={errors.gender}>
          <Select value={data.gender} onChange={set("gender")}>
            <option value="">Select gender identity</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Organization" required error={errors.organization}>
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
        <Field label="Contact Number" required hint="We will use this to reach you." error={errors.contactNumber}>
          <Input type="tel" placeholder="+639XXXXXXXXX" value={data.contactNumber} onChange={set("contactNumber")} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" placeholder="sample@gmail.com" value={data.email} onChange={set("email")} />
        </Field>
      </div>

      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Consent</h3>
      <Field label="Willingness to be interviewed by a SASHA Representative" required error={errors.interview}>
        <RadioGroup
          name="interview"
          options={["Yes", "No"]}
          value={data.interview}
          onChange={(v) => { clearError("interview"); onChange({ ...data, interview: v }); }}
        />
      </Field>
    </div>
  );
}

// ── Page 2 — Screening Questions ───────────────────────────────────────────────
function StepScreeningQuestions({ data, onChange, errors, clearError }) {
  const setRadio = (key) => (v) => {
    clearError(key);
    onChange({ ...data, [key]: v });
  };
  
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Screening Questions</span>
      </h2>
      <p className={styles.stepDesc}>
        Please answer the following questions truthfully and honestly.
      </p>

      <div className={styles.radioColumn}>
        <Field label="Do you actively follow and stay informed about current social and political affairs?" required error={errors.socialStance}>
          <RadioGroup name="socialStance" options={["Yes", "No"]} value={data.socialStance} onChange={setRadio("socialStance")} />
        </Field>
        <Field label="Are you familiar with SASHA's mission and concerns related to gender equality and harassment prevention?" required error={errors.shaKnowledge}>
          <RadioGroup name="shaKnowledge" options={["Yes", "No"]} value={data.shaKnowledge} onChange={setRadio("shaKnowledge")} />
        </Field>
        <Field label="Are you open to learning more about social advocacy and gender-related issues?" required error={errors.openToLearn}>
          <RadioGroup name="openToLearn" options={["Yes", "No"]} value={data.openToLearn} onChange={setRadio("openToLearn")} />
        </Field>
        <Field label="Are you enthusiastic about actively contributing to the fight against gender-based discrimination and harassment?" required error={errors.enthusiasm}>
          <RadioGroup name="enthusiasm" options={["Yes", "No"]} value={data.enthusiasm} onChange={setRadio("enthusiasm")} />
        </Field>
        <Field label="Are you committed to dedicating time and effort as a SASHA volunteer?" required error={errors.commitment}>
          <RadioGroup name="commitment" options={["Yes", "No"]} value={data.commitment} onChange={setRadio("commitment")} />
        </Field>
      </div>
    </div>
  );
}

// ── Page 3 — Essay ─────────────────────────────────────────────────
function StepEssay({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    onChange({ ...data, [key]: e.target.value });
  };

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
          <Field label="Why do you want to Volunteer with SASHA?" required hint="Please provide factual and clear information." error={errors.description}>
            <textarea
              className={styles.textarea}
              placeholder="Answer here..."
              value={data.description}
              onChange={set("description")}
              rows={5}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Page  — Supporting Credentials ─────────────────────────────────────────────
// function StepCredentials({ data, onChange }) {
//   const fileInputRef = useRef();
//   const [dragging, setDragging] = useState(false);

//   const addFiles = (newFiles) => {
//     const arr = Array.from(newFiles);
//     onChange({ ...data, files: [...(data.files || []), ...arr] });
//   };

//   const removeFile = (idx) => {
//     const updated = data.files.filter((_, i) => i !== idx);
//     onChange({ ...data, files: updated });
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragging(false);
//     addFiles(e.dataTransfer.files);
//   };

//   return (
//     <div>
//       <h2 className={styles.stepTitle}>
//         <span className={styles.stepTitleAccent}>Supporting</span> Credentials
//       </h2>
//       <p className={styles.stepDesc}>
//         Please submit your Resume, Certificates, Recommendation letters, or any relevant files that can support your application.
//       </p>

//       <div className={styles.credentialsLayout}>
//         {/* Drop zone */}
//         <div
//           className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
//           onClick={() => fileInputRef.current.click()}
//           onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
//           onDragLeave={() => setDragging(false)}
//           onDrop={handleDrop}
//         >
//           <div className={styles.dropIcon}>↑</div>
//           <p className={styles.dropText}>Drag and drop to upload files</p>
//           <button
//             type="button"
//             className={styles.browseBtn}
//             onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
//           >
//             Browse
//           </button>
//           <p className={styles.dropHint}>Supported files: PDF, JPG, PNG, MP4</p>
//           <input
//             ref={fileInputRef}
//             type="file"
//             multiple
//             accept=".pdf,.jpg,.jpeg,.png,.mp4"
//             style={{ display: "none" }}
//             onChange={(e) => addFiles(e.target.files)}
//           />
//         </div>

//         {/* File list */}
//         <div className={styles.fileList}>
//           <h3 className={styles.fileListTitle}>Submitted Files</h3>
//           {(!data.files || data.files.length === 0) ? (
//             <p className={styles.noFiles}>No files uploaded yet.</p>
//           ) : (
//             data.files.map((f, i) => (
//               <div key={i} className={styles.fileItem}>
//                 <span className={styles.fileIcon}>📄</span>
//                 <span className={styles.fileName}>{f.name}</span>
//                 <button
//                   type="button"
//                   className={styles.fileRemove}
//                   onClick={() => removeFile(i)}
//                 >
//                   ×
//                 </button>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// ── Page 4 — Review & Submit ──────────────────────────────────────────────────
function StepReview({ applicant, screeningQuestions, essay }) {
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
        {/* <h3 className={styles.reviewSectionTitle}>Supporting Credentials</h3>
        <Row
          label="Files attached"
          value={
            credentials.files && credentials.files.length > 0
              ? credentials.files.map((f) => f.name).join(", ")
              : "None"
          }
        /> */}
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
    socialStance: "", shaKnowledge: "",
    openToLearn: "", enthusiasm: "",
    commitment: "",
  });
  const [essay, setEssay] = useState({
    description: "",
  });
  
  const [errors, setErrors] = useState({});
  // const [credentials, setCredentials] = useState({ files: []});

  const totalSteps = STEPS.length;

  const clearError = (key) => {
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const handleNext = () => {
    if (step === 0) {
      const stepErrors = validateStep0(applicant);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    } else if (step === 1) {
      const stepErrors = validateStep1(screeningQuestions);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    } else if (step === 2) {
      const stepErrors = validateStep2(essay);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
    }
    
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    setErrors({});
  };

  const handleSubmit = () => {
    const stepErrors = validateStep0(applicant);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setSubmitted(true);
  };

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
                Submit an Application
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
              {step === 0 && <StepApplicantInfo data={applicant} onChange={setApplicant} errors={errors} clearError={clearError} />}
              {step === 1 && <StepScreeningQuestions data={screeningQuestions} onChange={setScreeningQuestions} errors={errors} clearError={clearError} />}
              {step === 2 && <StepEssay data={essay} onChange={setEssay} errors={errors} clearError={clearError} />}
              {/* {step === 3 && <StepCredentials        data={credentials}    onChange={setCredentials}    />} */}
              {step === 3 && <StepReview applicant={applicant} screeningQuestions={screeningQuestions} essay={essay}/>}
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