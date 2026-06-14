"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ApplyApplicationForm.module.css";
import { useRouter } from "next/navigation";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Applicant's Info" },
  { id: 1, label: "Screening Questions" },
  { id: 2, label: "Essay" },
  // { id: 3, label: "Supporting Credentials" },
  { id: 3, label: "Review & Submit" },
];

const APP_STATUS_DISPLAY = {
  pending: {
    middle: "Under Review",
    final: "Pending",
    phase: 1,
  },

  reviewing: {
    middle: "Being Evaluated",
    final: "Pending",
    phase: 1,
  },

  approved: {
    middle: "Being Evaluated",
    final: "Approved",
    phase: 2,
  },

  rejected: {
    middle: "Being Evaluated",
    final: "Rejected",
    phase: 2,
  },

  withdrawn: {
    middle: "Being Evaluated",
    final: "Withdrawn",
    phase: 2,
  },
};

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
        <p className={styles.fieldHint}>{hint}</p>
      )}
      {error && (
        <p className={styles.fieldError}>{error}</p>
      )}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      className={`${styles.input} ${error ? styles.inputError : ""}`}
      data-error={error ? "true" : "false"}
      {...props}
    />
  );
}

function Select({ children, error, ...props }) {
  return (
    <select
      className={`${styles.select} ${error ? styles.inputError : ""}`}
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

// ── NCR Data ──────────────────────────────────────────────────────────────────
const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
  "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
  "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
];

// ── Validation helpers ────────────────────────────────────────────────────────
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalisePhone(raw) {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
}

function calcAgeFromBirthday(birthday) {
  if (!birthday) return null;
  const today = new Date();
  const dob = new Date(birthday);
  if (isNaN(dob)) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function validateStep0(data) {
  const errors = {};

  if (!data.name)   errors.name   = "Name is required.";
  if (!data.birthday) {
    errors.birthday = "Birthday is required.";
  } else {
    const computedAge = calcAgeFromBirthday(data.birthday);
    if (computedAge !== null && computedAge < 13) {
      errors.birthday =
        "Applicants must be at least 13 years old. Those below 13 are not eligible to apply at this time.";
    }
  }

  if (!data.age) {
    errors.age = "Age is required.";
  } else {
    const enteredAge = parseInt(data.age, 10);
    if (isNaN(enteredAge) || enteredAge < 13) {
      errors.age = "The minimum age to apply is 13 years old.";
    } else if (data.birthday) {
      const computedAge = calcAgeFromBirthday(data.birthday);
      if (computedAge !== null && Math.abs(computedAge - enteredAge) > 1) {
        errors.age = `The age you entered (${enteredAge}) does not match your birthday (expected ${computedAge}). Please double-check both fields.`;
      }
    }
  }

  if (!data.gender) errors.gender = "Gender identity is required.";

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

  if (!data.interview) errors.interview = "Consent to interview is required.";
  if (!data.organization) errors.organization = "Organization is required.";

  const isScoutOrg = data.organization === "BSP" || data.organization === "GSP";

  if (isScoutOrg) {
    if (!data.council) errors.council = "Council is required.";
    if (!data.tenureInScouting) errors.tenureInScouting = "Tenure in Scouting is required.";
    if (!data.rank) errors.rank = "Rank is required.";
    if (!data.scoutingMembership) errors.scoutingMembership = "Scouting Membership Category is required.";
  }

  if (data.organization === "Other") {
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


function StepApplicantInfo({ data, onChange, errors, clearError }) {
  const set = (key) => (e) => {
    clearError(key);
    onChange({ ...data, [key]: e.target.value });
  };

  const handleBirthdayChange = (e) => {
    clearError("birthday");
    clearError("age");
    const birthday = e.target.value;
    const computed = calcAgeFromBirthday(birthday);
    onChange({
      ...data,
      birthday,
      age: computed !== null ? String(computed) : data.age,
    });
  };

  const isScoutOrg = data.organization === "BSP" || data.organization === "GSP";

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Applicant's</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      {/* ── Age / membership notice ── */}
      <div className={styles.infoNotice}>
        <span className={styles.infoNoticeIcon}>ℹ</span>
        <p className={styles.infoNoticeText}>
          Applicants below 13 years old cannot apply through the online form. Please contact SASHA directly for guidance regarding provisional membership.
        </p>
      </div>

      <div className={styles.formGrid}>
        <Field label="Name" required error={errors.name}>
          <Input placeholder="Full name" value={data.name} onChange={set("name")} error={errors.name} />
        </Field>
        <Field
          label="Birthday"
          required
          hint="Entering your birthday will automatically fill in your age."
          error={errors.birthday}
        >
          <Input
            type="date"
            value={data.birthday}
            onChange={handleBirthdayChange}
            error={errors.birthday}
            max={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <Field
          label="Age"
          required
          hint="Must be at least 13. Auto-filled from your birthday — update if incorrect."
          error={errors.age}
        >
          <Input
            type="number"
            placeholder="Age"
            min={13}
            value={data.age}
            onChange={(e) => { clearError("age"); onChange({ ...data, age: e.target.value }); }}
            error={errors.age}
          />
        </Field>
        <Field label="Gender Identity" required error={errors.gender}>
          <Select value={data.gender} onChange={set("gender")} error={errors.gender}>
            <option value="">Select gender identity</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Pronouns">
          <Select value={data.pronouns} onChange={set("pronouns")}>
            <option value="">Select pronouns</option>
            <option value="he">He/Him/His</option>
            <option value="she">She/Her/Hers</option>
            <option value="they">They/Them/Theirs</option>
          </Select>
        </Field>
        <Field label="Organization" required error={errors.organization}>
          <Select value={data.organization} onChange={set("organization")} error={errors.organization}>
            <option value="">Select organization</option>
            <option value="BSP">Boy Scouts of the Philippines (BSP)</option>
            <option value="GSP">Girl Scouts of the Philippines (GSP)</option>
            <option value="Other">Other</option>
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
            <Field label="Tenure in Scouting (in years)" required error={errors.tenureInScouting}>
              <Input
                type="number"
                placeholder="e.g. 3"
                min={0}
                value={data.tenureInScouting || ""}
                onChange={set("tenureInScouting")}
                error={errors.tenureInScouting}
              />
            </Field>
            <Field label="Rank" required error={errors.rank}>
              <Input
                placeholder="e.g. Eagle Scout, Gold Awardee"
                value={data.rank || ""}
                onChange={set("rank")}
                error={errors.rank}
              />
            </Field>
            <Field
              label="Scouting Membership Category"
              required
              hint="If you are a Rover Scout but have undergone Basic Training Course already, please choose the Adult in Scouting."
              error={errors.scoutingMembership}
            >
              <Select
                value={data.scoutingMembership || ""}
                onChange={set("scoutingMembership")}
                error={errors.scoutingMembership}
              >
                <option value="">Select scouting membership category</option>
                <option>Senior Scouts</option>
                <option>Senior Girl Scouts</option>
                <option>Cadet Girl Scouts</option>
                <option>Rover Scouts</option>
                <option>Adult in Scouting</option>
              </Select>
            </Field>
          </div>
        </>
      )}

      {/* ── Other organization fields ── */}
      {data.organization === "Other" && (
        <>
          <div className={styles.formDivider} />
          <h3 className={styles.subSectionTitle}>Affiliation Details</h3>
          <p className={styles.stepDesc}>
            Tell us whether you are affiliated with any group, institution, or organization.
            If none, you may select "No Organization / Independent".
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
                <option value="No Organization / Independent">No Organization / Independent</option>
                <option value="School / University">School / University</option>
                <option value="Workplace / Company">Workplace / Company</option>
                <option value="Government Agency">Government Agency</option>
                <option value="Non-Governmental Organization">Non-Governmental Organization (NGO)</option>
                <option value="Community / Youth Organization">Community / Youth Organization</option>
                <option value="Religious Organization">Religious Organization</option>
                <option value="Online Community / Platform">Online Community / Platform</option>
                <option value="Other">Other</option>
              </Select>
            </Field>

            {data.organizationType === "Other" && (
              <Field label="Specify Organization Type" hint="Enter the type of organization or affiliation.">
                <Input
                  placeholder="e.g. Sports Club"
                  value={data.organizationTypeOther || ""}
                  onChange={set("organizationTypeOther")}
                />
              </Field>
            )}
          </div>

          {data.organizationType && data.organizationType !== "No Organization / Independent" && (
            <>
              <div className={styles.formGrid}>
                <Field
                  label="Organization Name"
                  required
                  hint="Enter the full name of your organization, institution, school, company, or group."
                  error={errors.orgName}
                >
                  <Input
                    placeholder="e.g. University of the Philippines"
                    value={data.orgName || ""}
                    onChange={set("orgName")}
                    error={errors.orgName}
                  />
                </Field>
              </div>

              <p className={styles.stepDesc}>Where is the organization primarily located?</p>

              <div className={styles.formGrid}>
                <Field
                  label="City / Municipality"
                  required
                  hint="Select the city or municipality where the organization is based."
                  error={errors.orgCity}
                >
                  <Select value={data.orgCity || ""} onChange={set("orgCity")} error={errors.orgCity}>
                    <option value="">Select city / municipality</option>
                    {NCR_CITIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Region">
                  <Input value="National Capital Region (NCR)" readOnly className={`${styles.input} ${styles.inputReadonly}`} />
                </Field>
              </div>
            </>
          )}

          <div className={styles.formDivider} />
          <h3 className={styles.subSectionTitle}>Your Location</h3>
          <p className={styles.stepDesc}>
            Where are you currently located?
          </p>
          <div className={styles.formGrid}>
            <Field
              label="City / Municipality"
              required
              hint="Select the city or municipality where you currently reside or stay."
              error={errors.userCity}
            >
              <Select value={data.userCity || ""} onChange={set("userCity")} error={errors.userCity}>
                <option value="">Select city / municipality</option>
                {NCR_CITIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Region">
              <Input value="National Capital Region (NCR)" readOnly className={`${styles.input} ${styles.inputReadonly}`} />
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
          hint="We will use this to reach you regarding your application."
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
        label="Willingness to be interviewed by a SASHA Representative"
        required
        error={errors.interview}
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


function CheckboxGroup({ name, options, value = [], onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div className={styles.checkboxGroup}>
      {options.map((opt) => (
        <label key={opt} className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name={name}
            value={opt}
            checked={value.includes(opt)}
            onChange={() => toggle(opt)}
            className={styles.checkboxInput}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

const EXPERTISE_OPTIONS = [
  "News Writing", "Creative Writing", "Photography", "Videography",
  "Graphic Designing", "Layouting", "Video Editing", "Social Media Management", "Content Creation",
];

const HOURS_OPTIONS = ["Less than 5 hours", "6-10 hours", "10-15 hours", "More than 15 hours"];

// ── Page 2 — Screening Questions ───────────────────────────────────────────────
function StepScreeningQuestions({ data, onChange }) {
  const setRadio = (key) => (v) => onChange({ ...data, [key]: v });
  const setCheckbox = (key) => (v) => onChange({ ...data, [key]: v });

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Screening Questions</span>
      </h2>
      <p className={styles.stepDesc}>
        Please answer the following questions truthfully and honestly.
      </p>

      {/* ── Values & Conduct ── */}
      <div className={styles.screeningGroup}>
        <div className={styles.screeningGroupHeader}>
          <h3 className={styles.screeningGroupTitle}>Values &amp; Conduct</h3>
        </div>
        <div className={styles.radioColumn}>
          <Field label="Do you believe survivors of harassment and abuse deserve to be treated with dignity, confidentiality, and respect?" required>
            <RadioGroup name="survivorDignity" options={["Yes", "No"]} value={data.survivorDignity} onChange={setRadio("survivorDignity")} />
          </Field>
          <Field label="Are you willing to follow SASHA's confidentiality and safeguarding policies when handling sensitive concerns?" required>
            <RadioGroup name="confidentialityPolicy" options={["Yes", "No"]} value={data.confidentialityPolicy} onChange={setRadio("confidentialityPolicy")} />
          </Field>
          <Field label="Do you agree that harassment, discrimination, victim-blaming, and hate speech are unacceptable within volunteer spaces?" required>
            <RadioGroup name="noHarassment" options={["Yes", "No"]} value={data.noHarassment} onChange={setRadio("noHarassment")} />
          </Field>
          <Field label="Are you willing to communicate respectfully with individuals regardless of gender identity, sexual orientation, religion, or background?" required>
            <RadioGroup name="respectfulComms" options={["Yes", "No"]} value={data.respectfulComms} onChange={setRadio("respectfulComms")} />
          </Field>
        </div>
      </div>

      <div className={styles.formDivider} />

      {/* ── Advocacy & Participation ── */}
      <div className={styles.screeningGroup}>
        <div className={styles.screeningGroupHeader}>
          <h3 className={styles.screeningGroupTitle}>Advocacy &amp; Participation</h3>
        </div>
        <div className={styles.radioColumn}>
          <Field label="Are you in favor of creating safer environments free from sexual harassment and abuse?" required>
            <RadioGroup name="saferEnvironments" options={["In Favor", "Not in Favor"]} value={data.saferEnvironments} onChange={setRadio("saferEnvironments")} />
          </Field>
          <Field label="Are you willing to support advocacy efforts related to gender equality, consent, and harassment prevention?" required>
            <RadioGroup name="advocacySupport" options={["Yes", "No"]} value={data.advocacySupport} onChange={setRadio("advocacySupport")} />
          </Field>
          <Field label="Are you enthusiastic about contributing your time and skills to SASHA's initiatives and activities?" required>
            <RadioGroup name="enthusiasm" options={["Yes", "No"]} value={data.enthusiasm} onChange={setRadio("enthusiasm")} />
          </Field>
          <Field label="Are you committed to maintaining professionalism and responsible conduct as a SASHA volunteer?" required>
            <RadioGroup name="professionalism" options={["Yes", "No"]} value={data.professionalism} onChange={setRadio("professionalism")} />
          </Field>
        </div>
      </div>

      <div className={styles.formDivider} />

      {/* ── Learning & Awareness ── */}
      <div className={styles.screeningGroup}>
        <div className={styles.screeningGroupHeader}>
          <h3 className={styles.screeningGroupTitle}>Learning &amp; Awareness</h3>
        </div>
        <div className={styles.radioColumn}>
          <Field label="Are you familiar with issues related to gender equality, consent, and harassment prevention?" required>
            <RadioGroup name="genderAwareness" options={["Yes", "No"]} value={data.genderAwareness} onChange={setRadio("genderAwareness")} />
          </Field>
          <Field label="Do you actively stay informed about community, youth, or social issues?" required>
            <RadioGroup name="stayInformed" options={["Yes", "No"]} value={data.stayInformed} onChange={setRadio("stayInformed")} />
          </Field>
          <Field label="Are you open to learning more about survivor-centered approaches and advocacy work?" required>
            <RadioGroup name="openToLearn" options={["Yes", "No"]} value={data.openToLearn} onChange={setRadio("openToLearn")} />
          </Field>
          <Field label="Are you comfortable working with diverse individuals and teams?" required>
            <RadioGroup name="diverseTeams" options={["Yes", "No"]} value={data.diverseTeams} onChange={setRadio("diverseTeams")} />
          </Field>
          <Field label="Are you willing to participate in required orientations, trainings, or volunteer briefings conducted by SASHA?" required>
            <RadioGroup name="orientationWilling" options={["Yes", "No"]} value={data.orientationWilling} onChange={setRadio("orientationWilling")} />
          </Field>
          <Field label="Are you able to dedicate time consistently for volunteer responsibilities and activities?" required>
            <RadioGroup name="timeCommitment" options={["Yes", "No"]} value={data.timeCommitment} onChange={setRadio("timeCommitment")} />
          </Field>
          <Field label="Are you willing to receive constructive feedback and continuously improve as a volunteer?" required>
            <RadioGroup name="feedbackWilling" options={["Yes", "No"]} value={data.feedbackWilling} onChange={setRadio("feedbackWilling")} />
          </Field>
        </div>
      </div>

      <div className={styles.formDivider} />

      {/* ── Expertise and Interest ── */}
      <h3 className={styles.subSectionTitle}>Expertise and Interest</h3>
      <div className={styles.radioColumn}>
        <Field label="With background" required>
          <p className={styles.fieldHint}>These are fields of interest where you have an experience. Please choose as many fields as you need.</p>
          <CheckboxGroup
            name="withBackground"
            options={EXPERTISE_OPTIONS}
            value={data.withBackground}
            onChange={setCheckbox("withBackground")}
          />
        </Field>

        <Field label="If accepted, what field are you interested to be part of?" required>
          <p className={styles.fieldHint}>These are fields of interest where you have an interest to practice, with or without background. Please choose as many fields as you need.</p>
          <CheckboxGroup
            name="interestedFields"
            options={EXPERTISE_OPTIONS}
            value={data.interestedFields}
            onChange={setCheckbox("interestedFields")}
          />
        </Field>
      </div>

      <div className={styles.formDivider} />

      {/* ── Availability ── */}
      <h3 className={styles.subSectionTitle}>Weekly Availability</h3>
      <Field label="How many hours of volunteer work can you commit per week?" required>
          <p className={styles.fieldHint}>Please note that this is per week basis and may impact your application.</p>
          <RadioGroup
            name="hoursPerWeek"
            options={HOURS_OPTIONS}
            value={data.hoursPerWeek}
            onChange={setRadio("hoursPerWeek")}
          />
        </Field>
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
          <Field label="In a two to four paragraph essay, please tell us why do you want to join us and why you should be accepted?" required>
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
        <Row label="Birthday" value={applicant.birthday} />
        <Row label="Age" value={applicant.age} />
        <Row label="Gender Identity" value={applicant.gender} />
        <Row label="Pronouns" value={
          applicant.pronouns === "he" ? "He/Him/His" :
          applicant.pronouns === "she" ? "She/Her/Hers" :
          applicant.pronouns === "they" ? "They/Them/Theirs" :
          applicant.pronouns
        } />
        <Row label="Organization" value={
          applicant.organization === "BSP" ? "Boy Scouts of the Philippines (BSP)" :
          applicant.organization === "GSP" ? "Girl Scouts of the Philippines (GSP)" :
          applicant.organization
        } />
        {(applicant.organization === "BSP" || applicant.organization === "GSP") && (
          <>
            <Row label="Council" value={applicant.council} />
            <Row label="Tenure in Scouting (years)" value={applicant.tenureInScouting} />
            <Row label="Rank" value={applicant.rank} />
            <Row label="Scouting Membership Category" value={applicant.scoutingMembership} />
          </>
        )}
        {applicant.organization === "Other" && (
          <>
            <Row label="Organization Type" value={applicant.organizationType} />
            {applicant.organizationType === "Other" && <Row label="Specified Type" value={applicant.organizationTypeOther} />}
            {applicant.organizationType && applicant.organizationType !== "No Organization / Independent" && (
              <>
                <Row label="Organization Name" value={applicant.orgName} />
                <Row label="Organization City" value={applicant.orgCity} />
              </>
            )}
            <Row label="Your City / Municipality" value={applicant.userCity} />
          </>
        )}
        <Row label="Willing to be interviewed" value={applicant.interview} />
        <Row label="Contact Number" value={applicant.contactNumber} />
        <Row label="Email" value={applicant.email} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Values &amp; Conduct</h3>
        <Row label="Survivors deserve dignity & respect" value={screeningQuestions.survivorDignity} />
        <Row label="Follow confidentiality policies" value={screeningQuestions.confidentialityPolicy} />
        <Row label="Harassment is unacceptable" value={screeningQuestions.noHarassment} />
        <Row label="Communicate respectfully" value={screeningQuestions.respectfulComms} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Advocacy &amp; Participation</h3>
        <Row label="In favor of safer environments" value={screeningQuestions.saferEnvironments} />
        <Row label="Support advocacy efforts" value={screeningQuestions.advocacySupport} />
        <Row label="Enthusiastic to contribute" value={screeningQuestions.enthusiasm} />
        <Row label="Committed to professionalism" value={screeningQuestions.professionalism} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Learning &amp; Awareness</h3>
        <Row label="Familiar with gender equality issues" value={screeningQuestions.genderAwareness} />
        <Row label="Stays informed on social issues" value={screeningQuestions.stayInformed} />
        <Row label="Open to learning" value={screeningQuestions.openToLearn} />
        <Row label="Comfortable with diverse teams" value={screeningQuestions.diverseTeams} />
        <Row label="Willing for orientations/trainings" value={screeningQuestions.orientationWilling} />
        <Row label="Able to dedicate time consistently" value={screeningQuestions.timeCommitment} />
        <Row label="Open to constructive feedback" value={screeningQuestions.feedbackWilling} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Expertise and Interest</h3>
        <Row label="Fields with background" value={screeningQuestions.withBackground?.join(", ")} />
        <Row label="Fields of interest" value={screeningQuestions.interestedFields?.join(", ")} />
        <Row label="Hours per week" value={screeningQuestions.hoursPerWeek} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Essay Details</h3>
        <Row label="Description" value={essay.description} />
      </div>

      {/* <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Supporting Credentials</h3>
        <Row
          label="Files attached"
          value={
            credentials.files && credentials.files.length > 0
              ? credentials.files.map((f) => f.name).join(", ")
              : "None"
          }
        />
      </div> */}
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

function ApplicationStepper({ statusRaw }) {
  const key = (statusRaw || "pending").toLowerCase();

  const {
    middle,
    final,
    phase,
  } = APP_STATUS_DISPLAY[key] ?? {
    middle: "In Progress",
    final: "Pending",
    phase: 1,
  };

  const steps = ["Submitted", middle, final];

  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done = i < phase;
        const active = i === phase;

        return (
          <div key={i} className={styles.stepItem}>
            {i > 0 && (
              <div
                className={`${styles.stepLine} ${
                  done || active ? styles.stepLineDone : ""
                }`}
              />
            )}

            <div
              className={`${styles.stepDot} ${
                active ? styles.stepDotActive : ""
              } ${done ? styles.stepDotDone : ""}`}
            />

            <span
              className={`${styles.stepLabel} ${
                active ? styles.stepLabelActive : ""
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(dateString) {
  if (!dateString) return null;

  const now = new Date();
  const past = new Date(dateString);

  const seconds = Math.floor((now - past) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);

    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}

// ── Application Status Card ────────────────────────────────────────────────────────
function ApplicationStatusCard({ applicationData, applicationNumber }) {
  const router = useRouter();
  const {
    id                  = "—",
    applicationId       = null,
    applicationStatus   = "pending",
    dateApplied         = "—",
    assignedEvaluator   = null,
    lastUpdated         = null,
  } = applicationData ?? {};

  const displayId       = `APP-${String(id).padStart(5, "0")}`;
  const evaluatorLabel  = assignedEvaluator ?? "Unassigned";
  const updatedAgo      = timeAgo(lastUpdated);

  // Status badge colors
  const STATUS_COLORS_APP = {
    pending:   { bg: "#fef9c3", color: "#854d0e" },
    reviewing: { bg: "#dbeafe", color: "#1e40af" },
    approved:  { bg: "#d1fae5", color: "#065f46" },
    rejected:  { bg: "#fee2e2", color: "#991b1b" },
    withdrawn: { bg: "#f3f4f6", color: "#374151" },
  };
  const statusKey = (applicationStatus || "pending").toLowerCase();
  const badgeStyle = STATUS_COLORS_APP[statusKey] || { bg: "#f3f4f6", color: "#374151" };

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        <span>Application {applicationNumber}</span>
        <button
          className={styles.headerViewBtn}
          onClick={() => router.push(`/volunteer/view?id=${id}`)}
        >
          View →
        </button>
      </div>
      <div className={styles.statusCardBody}>

        {/* ── Top row: Application ID + last updated ── */}
        <div className={styles.cardTopRow}>
          <span className={styles.cardCaseId}>{displayId}</span>
          {updatedAgo && (
            <span className={styles.cardUpdated}>Updated {updatedAgo}</span>
          )}
        </div>

        {/* ── Meta grid ── */}
        <div className={styles.cardMetaGrid}>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Date Applied</span>
            <span className={styles.cardMetaValue}>{dateApplied}</span>
          </div>
          <div className={styles.cardMetaItem}>
            <span className={styles.cardMetaLabel}>Assigned Evaluator</span>
            <span className={`${styles.cardMetaValue} ${!assignedEvaluator ? styles.cardMetaUnassigned : ""}`}>
              {evaluatorLabel}
            </span>
          </div>
        </div>

        <ApplicationStepper statusRaw={applicationStatus} />
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
  const [stepErrors, setStepErrors] = useState({});
  const [draftNotice, setDraftNotice] = useState("");

  const [myApplications, setMyApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(true)

  useEffect(() => {
      const fetchMyApplications = async () => {
          try {
              const res = await fetch('http://localhost:5000/api/volunteer_applications/my_applications', {
                  credentials: 'include',
              })
              if (res.ok) {
                  const data = await res.json()
                  setMyApplications(data)
              }
          } catch (err) {
              console.error('Failed to fetch applications:', err)
          } finally {
              setAppsLoading(false)
          }
      }
      fetchMyApplications()
  }, [submitted]) // ← refetches after a new submission

  const [applicant, setApplicant] = useState({
    name: "", birthday: "", age: "", gender: "", pronouns: "", organization: "",
    interview: "", contactNumber: "", email: "",
    // BSP/GSP
    council: "", tenureInScouting: "", rank: "", scoutingMembership: "",
    // Other
    organizationType: "", organizationTypeOther: "", orgName: "", orgCity: "", userCity: "",
  });
  const [screeningQuestions, setScreeningQuestions] = useState({
    // Values & Conduct
    survivorDignity: "", confidentialityPolicy: "", noHarassment: "", respectfulComms: "",
    // Advocacy & Participation
    saferEnvironments: "", advocacySupport: "", enthusiasm: "", professionalism: "",
    // Learning & Awareness
    genderAwareness: "", stayInformed: "", openToLearn: "", diverseTeams: "",
    orientationWilling: "", timeCommitment: "", feedbackWilling: "",
    // Expertise & Interest (unchanged)
    withBackground: [], interestedFields: [], hoursPerWeek: "",
  });
  const [essay, setEssay] = useState({
    description: "",
  });
  // const [credentials, setCredentials] = useState({ files: []});

  const totalSteps = STEPS.length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savira_volunteer_application_draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.applicant) setApplicant(draft.applicant);
      if (draft.screeningQuestions) setScreeningQuestions(draft.screeningQuestions);
      if (draft.essay) setEssay(draft.essay);
      setDraftNotice("You have an unfinished volunteer application draft. It has been loaded so you can continue.");
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (submitted) return;
    const hasDraft =
      Object.values(applicant).some(Boolean) ||
      Object.values(screeningQuestions).some((v) => Array.isArray(v) ? v.length > 0 : Boolean(v)) ||
      Boolean(essay.description);
    if (!hasDraft) return;
    localStorage.setItem(
      "savira_volunteer_application_draft",
      JSON.stringify({ applicant, screeningQuestions, essay, updatedAt: new Date().toISOString() })
    );
  }, [applicant, screeningQuestions, essay, submitted]);

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
    if (step === 0) errors = validateStep0(applicant);

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

  const [submitError, setSubmitError] = useState(null)

  const handleSubmit = async () => {
      try {
          setSubmitError(null)

          const res = await fetch('http://localhost:5000/api/volunteer_applications/submit', {
              method:      'POST',
              headers:     { 'Content-Type': 'application/json' },
              credentials: 'include',
              body:        JSON.stringify({ applicant, screeningQuestions, essay }),
          })

          const result = await res.json()

          if (res.status === 409) {
              setSubmitError(result.error)
              return
          }

          if (!res.ok) throw new Error(result.error || 'Submission failed.')

          setSubmitted(true)
          localStorage.removeItem("savira_volunteer_application_draft")

      } catch (error) {
          setSubmitError('Something went wrong: ' + error.message)
      }
  }

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
        {draftNotice && !submitted && (
          <div className={styles.submitError}>
            <span>⚠</span> {draftNotice}
            <button
              type="button"
              className={styles.backBtn}
              style={{ marginLeft: 12 }}
              onClick={() => {
                localStorage.removeItem("savira_volunteer_application_draft");
                setDraftNotice("");
              }}
            >
              Discard Draft
            </button>
          </div>
        )}
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
              {step === 0 && <StepApplicantInfo data={applicant} onChange={setApplicant} errors={stepErrors} clearError={clearError} />}
              {step === 1 && <StepScreeningQuestions data={screeningQuestions} onChange={setScreeningQuestions} />}
              {step === 2 && <StepEssay data={essay} onChange={setEssay} />}
              {/* {step === 3 && <StepCredentials        data={credentials}    onChange={setCredentials}    />} */}
              {step === 3 && <StepReview applicant={applicant} screeningQuestions={screeningQuestions} essay={essay} />}
            </div>

            {/* Navigation buttons */}
            <div className={styles.formNav}>
              {step > 0 ? (
                <button type="button" className={styles.backBtn} onClick={handleBack}>
                  ← Back
                </button>
              ) : <div />}

                  {/* ── Active application warning ── */}
                  {submitError && (
                      <div className={styles.submitError}>
                          <span>⚠</span> {submitError}
                      </div>
                  )}

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
        {false && (
        <div className={`${styles.sectionHeading} mt-5`}>
          <h2 className={styles.sectionTitle}>Your Application Status</h2>
          <div className={styles.headingLine} />
        </div>
        )}
        {false && (
        <div className="row g-3">
          {appsLoading ? (
            <p>Loading applications...</p>
          ) : myApplications.length === 0 ? (
            <p>No applications submitted yet.</p>
          ) : (
            myApplications.map((app, i) => (
              <div className="col-12" key={app.volunteer_application_id}>
                <ApplicationStatusCard
                  applicationNumber={i + 1}
                  applicationData={{
                    id: app.volunteer_application_id,
                    applicationStatus: app.application_status || "pending",
                    dateApplied: app.created_at
                      ? new Date(app.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—",
                    assignedEvaluator: app.assigned_evaluator ?? null,
                    lastUpdated: app.updated_at ?? app.created_at ?? null,
                  }}
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
