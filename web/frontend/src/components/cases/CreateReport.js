"use client";

import { useState, useRef } from "react";
import styles from "./CreateReport.module.css";

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
function Field({
  label,
  children,
  required,
  hint,
  error,
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {required && (
          <span className={styles.required}>*</span>
        )}
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

function Input({ error, ...props }) {
  return (
    <input
      className={`${styles.input} ${
        error ? styles.inputError : ""
      }`}
      data-error={error ? "true" : "false"}
      {...props}
    />
  );
}

function Select({ children, error, ...props }) {
  return (
    <select
      className={`${styles.select} ${
        error ? styles.inputError : ""
      }`}
      data-error={error ? "true" : "false"}
      {...props}
    >
      {children}
    </select>
  );
}

function RadioGroup({ name, options, value, onChange, error }) {
  return (
    <div className={`${styles.radioGroup} ${error ? styles.radioGroupError : ""}`}>
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

// ── Validation helpers ────────────────────────────────────────────────────────
// ── Contact & email format helpers ───────────────────────────────────────────
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

  if (!data.age)           errors.age           = "Age is required.";
  if (!data.gender)        errors.gender        = "Gender identity is required.";

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

  if (!data.interview)     errors.interview     = "Consent to interview is required.";
  if (!data.organization)  errors.organization  = "Organization is required.";

  const isScoutOrg =
    data.organization === "Boy Scouts of the Philippines (BSP)" ||
    data.organization === "Girl Scouts of the Philippines (GSP)";

  if (isScoutOrg) {
    if (!data.council) errors.council = "Council is required.";
  }

  if (data.organization === "Others") {
    if (!data.organizationType) errors.organizationType = "Organization type is required.";

    const hasAffiliation =
      data.organizationType && data.organizationType !== "No Organization / Independent";

    if (hasAffiliation) {
      if (!data.orgName) errors.orgName = "Organization name is required.";
      if (!data.orgCity) errors.orgCity = "Organization city is required.";
    }
    if (!data.userCity) errors.userCity = "Your city/municipality is required.";
  }

  return errors;
}

function validateStep1(data) {
  const errors = {};

  if (!data.date)          errors.date         = "Date is required.";
  if (!data.time)          errors.time         = "Time is required.";
  if (!data.incidentCity)  errors.incidentCity = "Incident city/municipality is required.";
  if (!data.description)   errors.description  = "Description of incident is required.";
  if (!data.perpetratorKnown) errors.perpetratorKnown = "Please indicate if the perpetrator is known.";
  if (!data.witnesses)     errors.witnesses    = "Please indicate if there are witnesses.";
  if (!data.toldAnyone)    errors.toldAnyone   = "Please indicate if you told anyone.";
  if (!data.toldPolice)    errors.toldPolice   = "Please indicate if you told the police.";

  if (data.perpetratorKnown === "Yes") {
    if (!data.perpetratorName)   errors.perpetratorName   = "Perpetrator name is required.";
    if (!data.perpetratorGender) errors.perpetratorGender = "Perpetrator gender is required.";
  }

  if (data.witnesses === "Yes") {
    if (!data.witnessName) errors.witnessName = "Witness name is required.";
    if (!data.witnessContact) errors.witnessContact = "Witness contact information is required.";
  }

  return errors;
}

// ── Page 1 — Complainant's Information ───────────────────────────────────────
function StepComplainantInfo({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    onChange({ ...data, [key]: e.target.value });
  };

  const isScoutOrg =
    data.organization === "Boy Scouts of the Philippines (BSP)" ||
    data.organization === "Girl Scouts of the Philippines (GSP)";

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Complainant's</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      <div className={styles.formGrid}>
        <Field label="Name" hint="Optional — you may leave this blank if you prefer.">
          <Input
            placeholder="Full name"
            value={data.name}
            onChange={set("name")}
          />
        </Field>

        <Field label="Age" required error={errors.age}>
          <Input
            type="number"
            placeholder="Age"
            min={1}
            value={data.age}
            onChange={set("age")}
            error={errors.age}
          />
        </Field>

        <Field label="Gender Identity" required hint="How do you identify? This helps us serve you better." error={errors.gender}>
          <Select value={data.gender} onChange={set("gender")} error={errors.gender}>
            <option value="">Select gender identity</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>

        <Field label="Organization" required error={errors.organization}>
          <Select value={data.organization} onChange={set("organization")} error={errors.organization}>
            <option value="">Select organization</option>
            <option>Boy Scouts of the Philippines (BSP)</option>
            <option>Girl Scouts of the Philippines (GSP)</option>
            <option>Others</option>
          </Select>
        </Field>
      </div>

      {/* ── BSP / GSP fields ── */}
      {isScoutOrg && (
        <>
          <div className={styles.formDivider} />
          <h3 className={styles.subSectionTitle}>Scout Organization Details</h3>
          <div className={styles.formGrid}>
            <Field label="Council" required hint="e.g. Manila Council, Rizal Council" error={errors.council}>
              <Input
                placeholder="Enter your council"
                value={data.council || ""}
                onChange={set("council")}
                error={errors.council}
              />
            </Field>
            <Field label="Region">
              <Input value="National Capital Region (NCR)" readOnly className={`${styles.input} ${styles.inputReadonly}`} />
            </Field>
          </div>
        </>
      )}

      {/* ── Others fields ── */}
{data.organization === "Others" && (
  <>
    <div className={styles.formDivider} />

    <h3 className={styles.subSectionTitle}>Affiliation Details</h3>
    <p className={styles.stepDesc}>
      Tell us whether you are affiliated with any group, institution, or organization.
      If none, you may select “No Organization / Independent”.
    </p>

    <div className={styles.formGrid}>
      <Field
        label="Organization Type"
        required
        hint="Select the type that best describes your affiliation."
        error={errors.organizationType}
      >
        <Select
          value={data.organizationType || ""}
          onChange={set("organizationType")}
          error={errors.organizationType}
        >
          <option value="">Select organization type</option>

          <option value="No Organization / Independent">
            No Organization / Independent
          </option>

          <option value="School / University">
            School / University
          </option>

          <option value="Workplace / Company">
            Workplace / Company
          </option>

          <option value="Government Agency">
            Government Agency
          </option>

          <option value="Non-Governmental Organization">
            Non-Governmental Organization (NGO)
          </option>

          <option value="Community / Youth Organization">
            Community / Youth Organization
          </option>

          <option value="Religious Organization">
            Religious Organization
          </option>

          <option value="Online Community / Platform">
            Online Community / Platform
          </option>

          <option value="Other">
            Other
          </option>
        </Select>
      </Field>

      {/* Optional contextual field */}
      {data.organizationType === "Other" && (
        <Field
          label="Specify Organization Type"
          hint="Enter the type of organization or affiliation."
        >
          <Input
            placeholder="e.g. Sports Club"
            value={data.organizationTypeOther || ""}
            onChange={set("organizationTypeOther")}
          />
        </Field>
      )}
    </div>

    {/* Organization Name only appears if user has affiliation */}
    {data.organizationType &&
      data.organizationType !== "No Organization / Independent" && (
        <>
          <div className={styles.formGrid}>
            <Field
              label="Organization Name"
              required
              hint="Enter the full name of your organization, institution, school, company, or group."
              error={errors.orgName}
            >
              <Input
                placeholder="Organization name"
                value={data.orgName || ""}
                onChange={set("orgName")}
                error={errors.orgName}
              />
            </Field>
          </div>

          {/* Organization Address */}
          <div className={styles.formDivider} />

          <h3 className={styles.subSectionTitle}>
            Organization Location
          </h3>

          <p className={styles.stepDesc}>
            Where is the organization primarily located?
          </p>

          <div className={styles.formGrid}>
            <Field
              label="City / Municipality"
              required
              hint="Select the city or municipality where the organization is based."
              error={errors.orgCity}
            >
              <Select
                value={data.orgCity || ""}
                onChange={set("orgCity")}
                error={errors.orgCity}
              >
                <option value="">Select city / municipality</option>

                {NCR_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <Field label="Region">
              <Input
                value="National Capital Region (NCR)"
                readOnly
                className={`${styles.input} ${styles.inputReadonly}`}
              />
            </Field>
          </div>
        </>
      )}

    {/* Complainant's Location */}
    <div className={styles.formDivider} />

    <h3 className={styles.subSectionTitle}>Your Location</h3>

    <p className={styles.stepDesc}>
      Where are you currently located? This helps us determine the nearest
      appropriate support or referral channel if needed.
    </p>

    <div className={styles.formGrid}>
      <Field
        label="City / Municipality"
        required
        hint="Select the city or municipality where you currently reside or stay."
        error={errors.userCity}
      >
        <Select
          value={data.userCity || ""}
          onChange={set("userCity")}
          error={errors.userCity}
        >
          <option value="">Select city / municipality</option>

          {NCR_CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>

      <Field label="Region">
        <Input
          value="National Capital Region (NCR)"
          readOnly
          className={`${styles.input} ${styles.inputReadonly}`}
        />
      </Field>
    </div>
  </>
)}

      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Mode of Contact</h3>
      <div className={styles.formGrid}>
        <Field
          label="Contact Number"
          required
          hint="We will use this to reach you regarding your report."
          error={errors.contactNumber}
        >
          <Input
            type="tel"
            placeholder="+639XXXXXXXXX"
            value={data.contactNumber}
            onChange={(e) => {
              clearError("contactNumber");
              const formatted = normalisePhone(e.target.value);
              onChange({ ...data, contactNumber: formatted });
            }}
            error={errors.contactNumber}
          />
        </Field>
        <Field label="Email" required hint="A confirmation and updates will be sent here." error={errors.email}>
          <Input
            type="email"
            placeholder="sample@gmail.com"
            value={data.email}
            onChange={(e) => {
              clearError("email");
              onChange({ ...data, email: e.target.value.trim() });
            }}
            error={errors.email}
          />
        </Field>
      </div>

      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Consent</h3>
      <Field
        label="Willingness to be interviewed by a SASHA Representative and a SASHA paralegal and/or lawyer"
        required error={errors.interview}
      >
        <RadioGroup
          name="interview"
          options={["Yes", "No"]}
          value={data.interview}
          onChange={(v) => { clearError("interview"); onChange({ ...data, interview: v }); }}
          error={errors.interview}
        />
      </Field>
    </div>
  );
}

// ── Page 2 — Incident Details ─────────────────────────────────────────────────
function StepIncidentDetails({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    onChange({ ...data, [key]: e.target.value });
  };
  const setRadio = (key) => (v) => {
    clearError(key);
    onChange({ ...data, [key]: v });
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Incident</span> Details
      </h2>
      <p className={styles.stepDesc}>
        Provide as much detail as possible. Accurate information helps us assist you better.
      </p>

      {/* ── Date & Time ── */}
      <h3 className={styles.subSectionTitle}>Date and Time of Incident</h3>
      <div className={styles.formGrid3}>
        <Field label="Date" required hint="When did the incident happen?" error={errors.date}>
          <Input type="date" value={data.date} onChange={set("date")} error={errors.date} />
        </Field>
        <Field label="Time" hint="Approximate time is fine if exact time is unknown." error={errors.time}>
          <Input type="time" value={data.time} onChange={set("time")} error={errors.time} />
        </Field>
      </div>

      {/* ── Incident Location ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Location of Incident</h3>
      <p className={styles.stepDesc}>Where did the incident take place? Avoid including exact home addresses if you prefer privacy.</p>
      <div className={styles.formGrid}>
        <Field label="City / Municipality" required hint="Select the city or municipality where the incident occurred." error={errors.incidentCity}>
          <Select value={data.incidentCity || ""} onChange={set("incidentCity")} error={errors.incidentCity}>
            <option value="">Select city / municipality</option>
            {NCR_CITIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Specific Place / Venue" hint="e.g. school campus, community center, online — do not include your home address.">
          <Input
            placeholder="e.g. Barangay hall, online platform, school"
            value={data.incidentVenue || ""}
            onChange={set("incidentVenue")}
          />
        </Field>
      </div>

      {/* ── Description ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Description of Incident</h3>
      <Field label="What happened?" required hint="Describe the sequence of events clearly and factually." error={errors.description}>
        <textarea
          className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
          placeholder="Describe what happened, including relevant details such as individuals involved and the sequence of events."
          value={data.description}
          onChange={set("description")}
          rows={5}
        />
      </Field>

      <Field label="What action or outcome are you seeking?" hint="Optional — let us know what resolution or support you are looking for.">
        <textarea
          className={styles.textarea}
          placeholder="e.g. legal action, mediation, counseling support..."
          value={data.outcome}
          onChange={set("outcome")}
          rows={3}
        />
      </Field>

      {/* ── Perpetrator ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Perpetrator Information</h3>
      <Field label="Is the perpetrator known to you?" required error={errors.perpetratorKnown}>
        <RadioGroup
          name="perpetratorKnown"
          options={["Yes", "No"]}
          value={data.perpetratorKnown}
          onChange={setRadio("perpetratorKnown")}
        />
      </Field>

      {data.perpetratorKnown === "Yes" && (
        <div className={styles.formGrid}>
          <Field label="Name of Perpetrator" required hint="Full name if known." error={errors.perpetratorName}>
            <Input
              placeholder="Full name"
              value={data.perpetratorName || ""}
              onChange={set("perpetratorName")}
              error={errors.perpetratorName}
            />
          </Field>
          <Field label="Occupation of Perpetrator" hint="What does the perpetrator do for a living?">
            <Input
              placeholder="e.g. teacher, coach, relative, stranger"
              value={data.perpetratorOccupation || ""}
              onChange={set("perpetratorOccupation")}
            />
          </Field>
          <Field label="Relationship to Perpetrator" hint="How do you know this person?">
            <Input
              placeholder="e.g. classmate, supervisor, partner, unknown"
              value={data.perpetratorRelationship || ""}
              onChange={set("perpetratorRelationship")}
            />
          </Field>
          <Field label="Gender of Perpetrator (as you perceive it)" required hint="What is the gender of the perpetrator?" error={errors.perpetratorGender}>
            <Select value={data.perpetratorGender || ""} onChange={set("perpetratorGender")} error={errors.perpetratorGender}>
              <option value="">Select gender identity</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
              <option>Unknown / Prefer not to say</option>
            </Select>
          </Field>
        </div>
      )}

      {/* ── Witnesses ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Witnesses</h3>
      <Field label="Are there any witnesses?" required error={errors.witnesses}>
        <RadioGroup
          name="witnesses"
          options={["Yes", "No"]}
          value={data.witnesses}
          onChange={setRadio("witnesses")}
        />
      </Field>

      {data.witnesses === "Yes" && (
        <div className={styles.formGrid}>
        <Field label="Name of Witness" required hint="Full name if known." error={errors.witnessName}>
            <Input
              placeholder="Full name"
              value={data.witnessName || ""}
              onChange={set("witnessName")}
              error={errors.witnessName}
            />
          </Field>
          <Field label="Contact Information of Witness" hint="What is the witness's contact information?">
            <Input
              placeholder="e.g. phone number, email"
              value={data.witnessContact || ""}
              onChange={set("witnessContact")}
              error={errors.witnessContact}
            />
          </Field>
          <Field label="Relationship to Witness" hint="How do you know this person?">
            <Input
              placeholder="e.g. classmate, supervisor, partner, unknown"
              value={data.witnessRelationship || ""}
              onChange={set("witnessRelationship")}
            />
          </Field>
        </div>
      )}

      {/* ── Disclosure ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Prior Disclosure</h3>
      <div className={styles.formGrid}>
        <div>
          <Field label="Have you told anyone about the incident?" required error={errors.toldAnyone}>
            <RadioGroup
              name="toldAnyone"
              options={["Yes", "No"]}
              value={data.toldAnyone}
              onChange={setRadio("toldAnyone")}
            />
          </Field>
          {data.toldAnyone === "Yes" && (
            <Field label="Who did you tell?" hint="e.g. family member, friend, school counselor">
              <Input
                placeholder="e.g. mother, friend, guidance counselor"
                value={data.toldAnyoneWho || ""}
                onChange={set("toldAnyoneWho")}
              />
            </Field>
          )}
        </div>

        <div>
          <Field label="Have you told the police?" required error={errors.toldPolice}>
            <RadioGroup
              name="toldPolice"
              options={["Yes", "No"]}
              value={data.toldPolice}
              onChange={setRadio("toldPolice")}
            />
          </Field>
          {data.toldPolice === "Yes" && (
            <Field label="Which police station?" hint="e.g. Quezon City Police District, Station 5">
              <Input
                placeholder="e.g. QCPD Station 5"
                value={data.policeStation || ""}
                onChange={set("policeStation")}
              />
            </Field>
          )}
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

      {/* <div className={styles.anonymousRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={data.anonymous}
            onChange={(e) => onChange({ ...data, anonymous: e.target.checked })}
          />
          I would like to submit Anonymously
        </label>
      </div> */}
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

  // Reconstruct composed address fields for display
  const orgAddress = [complainant.orgCity, "National Capital Region (NCR)"].filter(Boolean).join(", ");
  const userAddress = [complainant.userCity, "National Capital Region (NCR)"].filter(Boolean).join(", ");
  const incidentLocation = [incident.incidentVenue, incident.incidentCity, "NCR"].filter(Boolean).join(", ");

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
        <Row label="Name"                   value={complainant.name} />
        <Row label="Age"                    value={complainant.age} />
        <Row label="Gender Identity"        value={complainant.gender} />
        <Row label="Organization"           value={complainant.organization} />
        {(complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
          complainant.organization === "Girl Scouts of the Philippines (GSP)") && (
          <>
            <Row label="Council"            value={complainant.council} />
            <Row label="Region"             value={complainant.region} />
          </>
        )}
        {complainant.organization === "Others" && (
          <>
            <Row label="Organization Name"  value={complainant.orgName} />
            <Row label="Organization Type"  value={complainant.organizationType} />
            <Row label="Organization Address" value={orgAddress} />
            <Row label="Your Location"      value={userAddress} />
          </>
        )}
        <Row label="Willing to be interviewed" value={complainant.interview} />
        <Row label="Contact Number"         value={complainant.contactNumber} />
        <Row label="Email"                  value={complainant.email} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Incident Details</h3>
        <Row label="Date"                   value={incident.date} />
        <Row label="Time"                   value={incident.time} />
        <Row label="Location"               value={incidentLocation} />
        <Row label="Description"            value={incident.description} />
        <Row label="Outcome sought"         value={incident.outcome} />
        <Row label="Perpetrator known"      value={incident.perpetratorKnown} />
        {incident.perpetratorKnown === "Yes" && (
          <>
            <Row label="Perpetrator name"       value={incident.perpetratorName} />
            <Row label="Perpetrator occupation" value={incident.perpetratorOccupation} />
            <Row label="Relationship to perpetrator" value={incident.perpetratorRelationship} />
            <Row label="Perpetrator gender"     value={incident.perpetratorGender} />
          </>
        )}
        <Row label="Witnesses"              value={incident.witnesses} />
        {incident.witnesses === "Yes" && (
          <>
          <Row label="Witness name"         value={incident.witnessName} />
          <Row label="Witness contact"      value={incident.witnessContact} />
          <Row label="Relationship to witness" value={incident.witnessRelationship} />
          </>
        )}
        <Row label="Told anyone"            value={incident.toldAnyone} />
        {incident.toldAnyone === "Yes" && (
          <Row label="Who was told"         value={incident.toldAnyoneWho} />
        )}
        <Row label="Told police"            value={incident.toldPolice} />
        {incident.toldPolice === "Yes" && (
          <Row label="Police station"       value={incident.policeStation} />
        )}
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Supporting Evidence</h3>
        {/* <Row label="Anonymous submission" value={evidence.anonymous ? "Yes" : "No"} /> */}
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

// ── Status Stepper ────────────────────────────────────────────────────────────
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
  const [stepErrors, setStepErrors] = useState({});

  const [complainant, setComplainant] = useState({
    name: "",
    age: "",
    gender: "",
    organization: "",

    // BSP/GSP
    council: "",
    region: "",

    // Others
    orgName: "",
    organizationType: "",
    orgCity: "",
    userCity: "",

    // Contact
    contactNumber: "",
    email: "",

    // Consent
    interview: "",
  });

  const [incident, setIncident] = useState({
    date: "",
    time: "",
    incidentCity: "",
    incidentVenue: "",
    description: "",
    outcome: "",

    perpetratorKnown: "",
    perpetratorName: "",
    perpetratorOccupation: "",
    perpetratorRelationship: "",
    perpetratorGender: "",

    witnesses: "",
    witnessName: "",
    witnessContact: "",
    witnessRelationship: "",

    toldAnyone: "",
    toldAnyoneWho: "",
    toldPolice: "",
    policeStation: "",
  });

  const [evidence, setEvidence] = useState({ files: [], anonymous: false });

  const totalSteps = STEPS.length;

  const clearError = (key) => {
    setStepErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleNext = () => {
    let errors = {};
    if (step === 0) errors = validateStep0(complainant);
    if (step === 1) errors = validateStep1(incident);

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);

      // Scroll to first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector("[data-error='true']");
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
          firstErrorField.focus();
        }
      }, 50);

      return;
    }

    setStepErrors({});
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStepErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = () => setSubmitted(true);

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
              <div className={styles.formCardHeader}>
                <div className={styles.formCardHeaderLines}>
                  <div className={styles.formCardHeaderLine} />
                </div>
                <h2 className={styles.formCardTitle}>Report Submission Form</h2>
                <div className={styles.formCardHeaderLines}>
                  <div className={styles.formCardHeaderLine} />
                </div>
              </div>

              <WizardStepper current={step} />

              <div className={styles.formBody}>
                {step === 0 && (
                  <StepComplainantInfo
                    data={complainant}
                    onChange={setComplainant}
                    errors={stepErrors}
                    clearError={clearError}
                  />
                )}
                {step === 1 && (
                  <StepIncidentDetails
                    data={incident}
                    onChange={setIncident}
                    errors={stepErrors}
                    clearError={clearError}
                  />
                )}
                {step === 2 && (
                  <StepEvidence data={evidence} onChange={setEvidence} />
                )}
                {step === 3 && (
                  <StepReview
                    complainant={complainant}
                    incident={incident}
                    evidence={evidence}
                  />
                )}
              </div>

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