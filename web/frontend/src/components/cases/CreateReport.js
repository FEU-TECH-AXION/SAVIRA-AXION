"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateReport.module.css";
import { FaCheckCircle } from "react-icons/fa";
import { IoIosDocument } from "react-icons/io";

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

// ── Cookie ───────────────────────────────────────────────────────
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

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
              {done ? <FaCheckCircle /> : i + 1}
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
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
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
    errors.contactNumber = "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
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

  if (!data.date)
    errors.date = "Please let us know when this happened — the date helps us document your case accurately.";

  if (!data.time)
    errors.time = "An approximate time is completely fine — this helps us piece together the full picture.";

  if (!data.locationType)
    errors.locationType = "Please let us know whether this happened in person or online — this helps us understand the nature of the incident.";

  if (data.locationType === "Physical Location") {
    if (!data.incidentCity)
      errors.incidentCity = "Please select the city or municipality where this took place — this helps us connect you with the right local support.";
  }

  if (!data.description) {
    errors.description = "Please share what happened — even a few words can help us understand your situation.";
  } else {
    const wordCount = data.description.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      errors.description = `We want to make sure we fully understand what you went through. Could you share a little more? At least 50 words is recommended`;
    }
  }

  if (!data.perpetratorKnown)
    errors.perpetratorKnown = "Please let us know if you recognise who did this — even partial information can help us take the right steps to support you.";

  if (!data.witnesses)
    errors.witnesses = "Please indicate if anyone else was present — witnesses can play an important role in strengthening your case.";

  if (!data.toldAnyone)
    errors.toldAnyone = "Please let us know if you've spoken to anyone about this — it helps us understand what support you may already have around you.";

  if (!data.toldPolice)
    errors.toldPolice = "Please let us know if the police have been informed — this helps us coordinate the appropriate next steps for your case.";

  if (data.perpetratorKnown === "Yes") {
    if (!data.perpetratorName)
      errors.perpetratorName = "If you know their name, please share it — this helps us properly document who was involved.";
    if (!data.perpetratorGender)
      errors.perpetratorGender = "Please share the perpetrator's gender as you perceive it — this helps us complete the incident record accurately.";
  }

  if (data.witnesses === "Yes") {
    if (!data.witnessName)
      errors.witnessName = "Please provide the witness's name — this helps us reach out if their account is needed to support your case.";
    if (!data.witnessContact)
      errors.witnessContact = "A contact number or email for the witness would be helpful — this allows us to follow up with them directly if needed.";
  }

  return errors;
}

// ── Page 1 — Complainant's Information ───────────────────────────────────────
function StepComplainantInfo({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    onChange({ ...data, [key]: e.target.value });
  };

  const setRadio = (key) => (v) => {
    clearError(key);
    onChange({ ...data, [key]: v });
  };

  const isScoutOrg =
    data.organization === "Boy Scouts of the Philippines (BSP)" ||
    data.organization === "Girl Scouts of the Philippines (GSP)";

  // ── Autofill from logged-in user ──────────────────────────
  const [selfReport, setSelfReport] = useState(false);

  const loggedInName = (() => {
    try {
      const userCookie = getCookie('user');
      if (!userCookie) return null;
      const u = JSON.parse(userCookie);
      return [u.first_name, u.last_name].filter(Boolean).join(' ') || null;
    } catch {
      return null;
    }
  })();

  const handleSelfReport = (checked) => {
    setSelfReport(checked);
    clearError('name');
    onChange({
      ...data,
      name: checked ? (loggedInName ?? '') : '',
    });
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Complainant's</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      <div className={styles.formGrid}>
        <Field label="Who is this report about?" required hint="Is this report about you, or someone else?" error={errors.reporteeType}>
          <RadioGroup
            name="reporteeType"
            options={["Me (Myself)", "Someone else"]}
            value={data.reporteeType || ""}
            onChange={(v) => {
              clearError("reporteeType");
              const isMe = v === "Me (Myself)";
              setSelfReport(isMe);
              onChange({
                ...data,
                reporteeType: v,
                name: isMe ? (loggedInName ?? '') : '',
              });
            }}
          />
        </Field>

        <Field label="Name" hint="Optional — you may leave this blank if you prefer to remain anonymous.">
          <Input
            placeholder="Full name"
            value={data.name}
            onChange={(e) => {
              set('name')(e);
            }}
          />
        </Field>

        {/* rest of the grid fields unchanged */}
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
      
      <Field label="Incident Location Type" required error={errors.locationType}>
        <RadioGroup
          name="locationType"
          options={["Physical Location", "Online"]}
          value={data.locationType || ""}
          onChange={setRadio("locationType")}
        />
      </Field>

      <div className={styles.formGrid}>
        {data.locationType === "Physical Location" && (
          <>
            <Field label="City / Municipality" required hint="Select the city or municipality where the incident occurred." error={errors.incidentCity}>
              <Select value={data.incidentCity || ""} onChange={set("incidentCity")} error={errors.incidentCity}>
                <option value="">Select city / municipality</option>
                {NCR_CITIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Specific Place / Venue" hint="e.g. school campus, community center — do not include your home address.">
              <Input
                placeholder="e.g. Barangay hall, school gymnasium, park"
                value={data.incidentVenue || ""}
                onChange={set("incidentVenue")}
              />
            </Field>
          </>
        )}

        {data.locationType === "Online" && (
          <Field label="Online Platform / Service" hint="Where did this incident occur online?">
            <Input
              placeholder="e.g. Facebook, Instagram, WhatsApp, email, gaming platform, website"
              value={data.incidentVenue || ""}
              onChange={set("incidentVenue")}
            />
          </Field>
        )}
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
        {data.description.trim() && (() => {
          const wordCount = data.description.trim().split(/\s+/).filter(Boolean).length;
          const charCount = data.description.length;

          const message =
            wordCount < 20
              ? { text: `You're not alone in this. Share only what feels right for you.`, style: styles.textareaFooterNeutral }
              : wordCount < 50
              ? { text: `You're doing great. If you're able to, a few more details can help us support you better. (${wordCount}/50 words)`, style: styles.textareaFooterWarn }
              : { text: `Thank you for trusting us with this. Your account will be noted.`, style: styles.textareaFooterOk };

          return (
            <div className={styles.textareaFooter}>
              <span className={message.style}>
                {message.text}
              </span>
              <span className={styles.textareaFooterCounts}>
                {wordCount} {wordCount === 1 ? "word (Min 50 recommended)" : "words (Min 50 recommended)"} . {charCount} characters
              </span>
            </div>
          );
        })()}
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
                <span className={styles.fileIcon}><IoIosDocument /></span>
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
function StepReview({ complainant, incident, evidence, consents, onConsentChange, consentErrors = {} }) {
  const Row = ({ label, value }) => (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value || <em className={styles.reviewEmpty}>Not provided</em>}</span>
    </div>
  );

  // Reconstruct composed address fields for display
  const orgAddress = [complainant.orgCity, "National Capital Region (NCR)"].filter(Boolean).join(", ");
  const userAddress = [complainant.userCity, "National Capital Region (NCR)"].filter(Boolean).join(", ");
  const incidentLocation = incident.locationType === "Online" 
    ? incident.incidentVenue || "Online"
    : [incident.incidentVenue, incident.incidentCity, "NCR"].filter(Boolean).join(", ");

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
        <Row label="Report Type"               value={complainant.reporteeType} />
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
        <Row label="Location Type"          value={incident.locationType} />
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

      {/* ── Consent & Acknowledgement ── */}
      <div className={styles.formDivider} />
      <h3 className={styles.subSectionTitle}>Consent & Acknowledgement</h3>
      <p className={styles.stepDesc}>
        Before submitting, please read and confirm the following statements.
      </p>

      <div className={styles.consentBlock}>
        {/* Checkbox 1 — Data Privacy */}
        <label className={`${styles.consentLabel} ${consentErrors?.dataPrivacy ? styles.consentLabelError : ""}`}>
          <input
            type="checkbox"
            className={styles.consentCheckbox}
            checked={consents.dataPrivacy}
            onChange={(e) => onConsentChange("dataPrivacy", e.target.checked)}
          />
          <span>
            I understand and agree that the information I have provided in this report will be collected,
            stored, and processed by the institution solely for the purpose of case management and resolution.
            All data will be handled in accordance with the{" "}
            <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and the institution's
            privacy policy. My information will not be shared with unauthorized third parties without my consent.
          </span>
        </label>
        {consentErrors?.dataPrivacy && (
          <p className={styles.fieldError}>You must agree to the data privacy terms to proceed.</p>
        )}

        {/* Checkbox 2 — Case Analysis (NLP, softened) */}
        <label className={`${styles.consentLabel} ${consentErrors?.caseAnalysis ? styles.consentLabelError : ""}`}>
          <input
            type="checkbox"
            className={styles.consentCheckbox}
            checked={consents.caseAnalysis}
            onChange={(e) => onConsentChange("caseAnalysis", e.target.checked)}
          />
          <span>
            I agree that the narrative details of my report may be used to support ongoing efforts to
            improve case handling and outcomes. Any such use will be conducted on{" "}
            <strong>anonymized, de-identified data only</strong> — personally identifiable information
            such as names, contact details, and age will be excluded and will not be retained or
            linked to any analysis.
          </span>
        </label>
        {consentErrors?.caseAnalysis && (
          <p className={styles.fieldError}>You must acknowledge the case analysis terms to proceed.</p>
        )}
      </div>
    </div>

  );
}

// ── Case status → 3-step display ─────────────────────────────────────────────
// The stepper always shows [Submitted] → [<middle>] → [Resolved].
// The middle label reflects the actual case status; the phase (0/1/2) drives
// which dot is active so the user always knows where they stand.
const STATUS_DISPLAY = {
  "For Verification":      { middle: "For Verification",      phase: 1 },
  "Undergoing Review":     { middle: "Undergoing Review",     phase: 1 },
  "Verified - True":       { middle: "Verified",              phase: 1 },
  "Verified - False":      { middle: "Verified",              phase: 1 },
  "Under Case Evaluation": { middle: "Under Case Evaluation", phase: 1 },
  "Case Filed":            { middle: "Case Filed",            phase: 1 },
  "Investigation Ongoing": { middle: "Investigation Ongoing", phase: 1 },
  "Hearing Ongoing":       { middle: "Hearing Ongoing",       phase: 1 },
  "Dismissed":             { middle: "Dismissed",             phase: 2 },
  "Perpetrator Convicted": { middle: "Perpetrator Convicted", phase: 2 },
};

// ── Status Stepper ────────────────────────────────────────────────────────────
// `statusName` — raw status string from the API (one of the 10 statuses above)
function StatusStepper({ statusName }) {
  const { middle, phase } = STATUS_DISPLAY[statusName] ?? { middle: "In Progress", phase: 1 };
  const steps = ["Submitted", middle, "Resolved"];

  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done   = i < phase;
        const active = i === phase;
        return (
          <div key={i} className={styles.stepItem}>
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

// ── Relative time helper ────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return null;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  < 30)  return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ── Report Status Card ────────────────────────────────────────────────────────────────────────────
function ReportStatusCard({ reportData, reportNumber, onView }) {
  const router = useRouter();
  const {
    id                = "—",
    caseId            = null,
    dateSubmitted     = "—",
    assignedPersonnel = null,
    lastUpdated       = null,
    statusName        = "For Verification",
  } = reportData ?? {};

  const displayId      = caseId ?? `CASE-${String(id).padStart(5, "0")}`;
  const personnelLabel = assignedPersonnel ?? "Unassigned";
  const updatedAgo     = timeAgo(lastUpdated);

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Report {reportNumber}</span>
        <button
          className={styles.headerViewBtn}
          onClick={() => router.push(`/cases/view?caseId=${id}&from=cases`)}
        >
          View →
        </button>
      </div>
      <div className={styles.statusCardBody}>

        {/* ── Top row: Case ID + last updated ── */}
        <div className={styles.cardTopRow}>
          <span className={styles.cardCaseId}>{displayId}</span>
          {updatedAgo && (
            <span className={styles.cardUpdated}>Updated {updatedAgo}</span>
          )}
        </div>

        {/* ── Meta grid ── */}
        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Submitted</span>
            <span className={styles.cardMetaValue}>{dateSubmitted}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Personnel</span>
            <span className={`${styles.cardMetaValue} ${!assignedPersonnel ? styles.cardMetaUnassigned : ""}`}>
              {personnelLabel}
            </span>
          </div>
        </div>

        <StatusStepper statusName={statusName} />
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
  const [step, setStep]                   = useState(0);
  const [submitted, setSubmitted]         = useState(false);
  const [stepErrors, setStepErrors]       = useState({});
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  const [consents, setConsents] = useState({
    dataPrivacy: false,
    caseAnalysis: false,
  });

  const [complainant, setComplainant] = useState({
    name: "", age: "", gender: "", organization: "", reporteeType: "",
    council: "", region: "",
    orgName: "", organizationType: "", orgCity: "", userCity: "",
    contactNumber: "", email: "", interview: "",
  });

  const [incident, setIncident] = useState({
    date: "", time: "", locationType: "", incidentCity: "", incidentVenue: "",
    description: "", outcome: "",
    perpetratorKnown: "", perpetratorName: "", perpetratorOccupation: "",
    perpetratorRelationship: "", perpetratorGender: "",
    witnesses: "", witnessName: "", witnessContact: "", witnessRelationship: "",
    toldAnyone: "", toldAnyoneWho: "", toldPolice: "", policeStation: "",
  });

  const [evidence, setEvidence] = useState({ files: [], anonymous: false });
  const [draftNotice, setDraftNotice] = useState("");

  const totalSteps = STEPS.length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savira_case_report_draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.complainant) setComplainant(draft.complainant);
      if (draft.incident) setIncident(draft.incident);
      if (draft.evidence) setEvidence(draft.evidence);
      if (draft.consents) setConsents(draft.consents);
      setDraftNotice("You have an unfinished report draft. It has been loaded so you can continue.");
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (submitted) return;
    const hasDraft =
      Object.values(complainant).some(Boolean) ||
      Object.values(incident).some(Boolean) ||
      evidence.files.length > 0 ||
      evidence.anonymous ||
      consents.dataPrivacy ||
      consents.caseAnalysis;
    if (!hasDraft) return;
    localStorage.setItem(
      "savira_case_report_draft",
      JSON.stringify({ complainant, incident, evidence, consents, updatedAt: new Date().toISOString() })
    );
  }, [complainant, incident, evidence, consents, submitted]);

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

    const handleSubmit = async () => {
    // Validate consents first
    const consentErrs = {};
    if (!consents.dataPrivacy)  consentErrs.dataPrivacy  = true;
    if (!consents.caseAnalysis) consentErrs.caseAnalysis = true;
    if (Object.keys(consentErrs).length > 0) {
    setStepErrors(consentErrs);
    return;
  }
    setSubmissionError(null);
    setIsSubmitting(true);
    fetchUserReports();

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/case_reports/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends the token cookie
        body: JSON.stringify({ complainant, incident, evidence }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg = errorBody?.error || `Server error (${response.status})`;
        console.error('[CreateReport Submit Error]', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          body: errorBody,
        });
        throw new Error(errorMsg);
      }

      setSubmitted(true);
      localStorage.removeItem("savira_case_report_draft");
    } catch (err) {
      console.error('[CreateReport Submit Exception]', err);
      setSubmissionError(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [userReports, setUserReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const STATUS_NAME_MAP = {
  'Submitted':             'Submitted',
  'For Verification':      'For Verification',
  'Undergoing Review':     'Undergoing Review',
  'Verified - True':       'Verified - True',
  'Verified - False':      'Verified - False',
  'Under Case Evaluation': 'Under Case Evaluation',
  'Case Filed':            'Case Filed',
  'Investigation Ongoing': 'Investigation Ongoing',
  'Hearing Ongoing':       'Hearing Ongoing',
  'Dismissed':             'Dismissed',
  'Perpetrator Convicted': 'Perpetrator Convicted',
  'Resolved':              'Resolved',
  'Withdrawn':             'Withdrawn',
};

  const fetchUserReports = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/case_reports/my-reports`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const { data } = await res.json();
      setUserReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
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
          {draftNotice && !submitted && (
            <div className={styles.errorAlert}>
              <strong>Draft found:</strong> {draftNotice}
              <button
                type="button"
                className={styles.backBtn}
                style={{ marginLeft: 12 }}
                onClick={() => {
                  localStorage.removeItem("savira_case_report_draft");
                  setDraftNotice("");
                }}
              >
                Discard Draft
              </button>
            </div>
          )}
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
                    consents={consents}
                    onConsentChange={(key, val) => setConsents((prev) => ({ ...prev, [key]: val }))}
                    consentErrors={stepErrors}
                  />
                )}
              </div>

              {submissionError && (
                <div className={styles.errorAlert}>
                  <strong>Error:</strong> {submissionError}
                </div>
              )}

              <div className={styles.formNav}>
                {step > 0 ? (
                  <button type="button" className={styles.backBtn} onClick={handleBack}>
                    ← Back
                  </button>
                ) : <div />}

                {step < totalSteps - 1 ? (
                  <button type="button" className={styles.nextBtn} onClick={handleNext} disabled={isSubmitting}>
                    Next →
                  </button>
                ) : (
                  <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.successCard}>
              <div className={styles.successIcon}><FaCheckCircle /></div>
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
          {false && (
          <div className={`${styles.sectionHeading} mt-5`}>
            <h2 className={styles.sectionTitle}>Your Report Status</h2>
            <div className={styles.headingLine} />
          </div>
          )}

          {false && (
          <div className="row g-3">
              {reportsLoading ? (
                <p>Loading reports...</p>
              ) : userReports.length === 0 ? (
                <p>No reports submitted yet.</p>
              ) : (
                userReports.map((report, i) => (
                  <div className="col-12" key={report.case_report_id}>
                    <ReportStatusCard
                      reportNumber={i + 1}
                      reportData={{
                        id:                report.case_report_id,
                        dateSubmitted:     report.created_at
                          ? new Date(report.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '—',
                        assignedPersonnel: report.assigned_officer ?? null,
                        lastUpdated:       report.updated_at ?? report.created_at ?? null,
                        statusName:        STATUS_NAME_MAP[report.case_status?.status_name] ?? 'For Verification',
                      }}
                      onView={() => router.push(`/cases/view?caseId=${report.case_report_id}&from=cases`)}
                    />
                  </div>
                ))
              )}
          </div>
          )}
        </div>
      </div>
    </main>
  );
}
