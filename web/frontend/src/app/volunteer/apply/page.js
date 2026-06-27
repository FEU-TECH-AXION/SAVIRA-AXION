"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ApplyApplicationForm.module.css";
import { useRouter } from "next/navigation";
import { FaCheck } from "react-icons/fa6";
import { IoIosInformationCircle, IoIosWarning, } from "react-icons/io";
import { useAuth, authFetch } from "@/lib/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ── Data Privacy Modal ────────────────────────────────────────────────────────
function DataPrivacyModal({ onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h4 className={styles.modalTitle}>Data Privacy Notice</h4>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>
          <h5>1. What Information We Collect</h5>
          <p>
            When you submit a volunteer application, we collect personal information you provide, including but not limited to: your full name, birthday, contact number, email address, city or municipality of residence, and any other details entered in the application form. Some fields may be pre-filled from your existing SASHA account profile.
          </p>
          <h5>2. Purpose of Collection</h5>
          <p>
            The personal data you provide through this form is used exclusively for the purpose of processing your volunteer application with SASHA. Specifically, it allows us to: evaluate your eligibility and suitability as a volunteer; communicate with you regarding the status of your application; coordinate onboarding, training, and scheduling if your application is accepted; and maintain accurate volunteer records in compliance with institutional requirements.
          </p>
          <h5>3. Legal Basis</h5>
          <p>
            All personal information is collected and processed in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines and its Implementing Rules and Regulations (IRR). SASHA acts as a Personal Information Controller (PIC) and is committed to upholding the rights of data subjects under this law.
          </p>
          <h5>4. Confidentiality and Access</h5>
          <p>
            Your personal data is kept <strong>strictly confidential</strong>. Access to your application information is limited exclusively to authorized SASHA staff members directly involved in the volunteer recruitment and management process, such as human resources personnel, program coordinators, and organizational supervisors. No unauthorized personnel will have access to your data.
          </p>
          <h5>5. No Sharing with Third Parties</h5>
          <p>
            Your personal data will not be sold, rented, disclosed, or transferred to any third party without your explicit prior consent, except as required by applicable law or a valid court order.
          </p>
          <h5>6. Pre-filled Information</h5>
          <p>
            To streamline the application process, certain fields — such as your name, birthday, contact number, and email address — may be automatically populated from information already saved in your SASHA account profile settings. No additional data beyond what you have previously provided is collected through this mechanism. You may update your profile details at any time through your account settings.
          </p>
          <h5>7. Data Retention</h5>
          <p>
            Your application data will be retained for as long as necessary to fulfill the purposes outlined above, or as required by applicable law. If your application is unsuccessful, your data will be retained for a reasonable period in accordance with SASHA&apos;s data retention policy, after which it will be securely deleted or anonymized.
          </p>
          <h5>8. Data Security</h5>
          <p>
            SASHA implements appropriate technical, administrative, and organizational security measures to protect your personal data from unauthorized access, loss, misuse, alteration, or destruction. These measures are regularly reviewed and updated in line with best practices and legal requirements.
          </p>
          <h5>9. Your Rights as a Data Subject</h5>
          <p>
            Under the Data Privacy Act of 2012, you have the following rights: the right to be informed about how your data is being used; the right to access your personal data; the right to correct inaccurate or incomplete data; the right to erasure or blocking of data where processing is unlawful; the right to object to the processing of your data; and the right to lodge a complaint with the National Privacy Commission (NPC) if you believe your rights have been violated.
          </p>
          <h5>10. Contact</h5>
          <p>
            If you have questions or concerns about how your personal data is handled, or if you wish to exercise any of your rights as a data subject, please contact SASHA&apos;s Data Protection Officer through the official SASHA communication channels.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalCloseBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function humanizeCategory(value) {
  return String(value || "Screening Questions")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
              {done ? <FaCheck /> : i + 1}
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
  const dob = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getApplicantFieldsFromUser(user) {
  if (!user) {
    return {
      name: "",
      birthday: "",
      age: "",
      gender: "",
      contactNumber: "",
      email: "",
      userCity: "",
    };
  }

  const birthday = user.birthday ? String(user.birthday).slice(0, 10) : "";

  return {
    name: [user.first_name, user.middle_name, user.last_name, user.extension_name]
      .filter(Boolean)
      .join(" "),
    birthday,
    age: birthday ? String(calcAgeFromBirthday(birthday) ?? "") : "",
    gender: user.gender_identity || "",
    contactNumber: user.contact_number ? normalisePhone(user.contact_number) : "",
    email: user.email || "",
    userCity: user.city || user.user_city || "",
  };
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function birthdayForAge(age) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return formatDateInput(date);
}

function validateStep0(data) {
  const errors = {};

  if (!data.name)   errors.name   = "Name is required.";
  if (!data.birthday) {
    errors.birthday = "Birthday is required.";
  } else {
    const computedAge = calcAgeFromBirthday(data.birthday);
    if (computedAge === null) {
      errors.birthday = "Enter a valid birthday.";
    } else if (computedAge < 0) {
      errors.birthday = "Birthday cannot be in the future.";
    } else if (computedAge < 13) {
      errors.birthday =
        "Applicants must be at least 13 years old. Those below 13 are not eligible to apply at this time.";
    } else if (computedAge > 120) {
      errors.birthday = "Enter a valid birthday within the last 120 years.";
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
        <span className={styles.stepTitleAccent}>Applicant&apos;s</span> Information
      </h2>
      <p className={styles.stepDesc}>
        Please provide your personal details. All information is kept strictly confidential.
      </p>

      {/* ── Age / membership notice ── */}
      <div className={styles.infoNotice}>
        <span className={styles.infoNoticeIcon}><IoIosInformationCircle /></span>
        <p className={styles.infoNoticeText}>
          Applicants below 13 years old cannot apply through the online form. Please contact SASHA directly for guidance regarding provisional membership.
          <br /><br />
          <strong>Why are some fields already filled in?</strong><br />
          To make this application easier to complete, certain personal details — such as your name, birthday, contact number, and email address — are automatically pulled from your <strong>account profile settings</strong>. No extra data is being collected; the form only reads what you have already saved in your account.<br /><br />
          <strong>Data Privacy Notice:</strong> The information you provide here is used solely for processing your volunteer application with SASHA. Your personal data is kept <strong>strictly confidential</strong> and is only accessible to authorized SASHA staff involved in the volunteer recruitment process.{" "}
          <button
            type="button"
            className={styles.readMoreBtn}
            onClick={() => setShowPrivacyModal(true)}
          >
            Read more…
          </button>
        </p>
      </div>

      {showPrivacyModal && <DataPrivacyModal onClose={() => setShowPrivacyModal(false)} />}


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
            min={birthdayForAge(120)}
            max={birthdayForAge(13)}
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
            If none, you may select &quot;No Organization / Independent&quot;.
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
function StepScreeningQuestions({
  data,
  onChange,
  questions,
  answers,
  onAnswer,
  loading,
  loadError,
  errors,
}) {
  const setRadio = (key) => (v) => onChange({ ...data, [key]: v });
  const setCheckbox = (key) => (v) => onChange({ ...data, [key]: v });
  const categories = [...new Set(questions.map((question) => question.category))];

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Screening Questions</span>
      </h2>
      <p className={styles.stepDesc}>
        Please answer the following questions truthfully and honestly.
      </p>

      {loading && <p className={styles.stepDesc}>Loading screening questions...</p>}
      {loadError && (
        <div className={styles.submitError}>
          <span><IoIosWarning /></span> {loadError}
        </div>
      )}

      {!loading && !loadError && categories.map((category, categoryIndex) => (
        <div key={category}>
          {categoryIndex > 0 && <div className={styles.formDivider} />}
          <div className={styles.screeningGroup}>
            <div className={styles.screeningGroupHeader}>
              <h3 className={styles.screeningGroupTitle}>
                {humanizeCategory(category)}
              </h3>
            </div>
            <div className={styles.radioColumn}>
              {questions
                .filter((question) => question.category === category)
                .map((question) => (
                  <Field
                    key={question.screening_question_id}
                    label={question.question_text}
                    required
                    error={errors?.[question.question_key]}
                  >
                    <RadioGroup
                      name={`screening-${question.screening_question_id}`}
                      options={question.options || []}
                      value={answers[question.question_key] || ""}
                      onChange={(value) => onAnswer(question.question_key, value)}
                      error={errors?.[question.question_key]}
                    />
                  </Field>
                ))}
            </div>
          </div>
        </div>
      ))}

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
          <Field
            label="In a two to four paragraph essay, please tell us why do you want to join us and why you should be accepted?"
            required
            error={errors.description}
          >
            <textarea
              className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
              data-error={errors.description ? "true" : "false"}
              placeholder="Answer here..."
              value={data.description}
              onChange={set("description")}
              rows={5}
              required
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
//                 <span className={styles.fileIcon}><IoIosDocument /></span>
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
function ReviewRow({ label, value }) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>
        {value || <em className={styles.reviewEmpty}>Not provided</em>}
      </span>
    </div>
  );
}

function StepReview({
  applicant,
  screeningQuestions,
  screeningQuestionList,
  screeningAnswers,
  essay,
}) {
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Review</span> & Submit
      </h2>
      <p className={styles.stepDesc}>
        Please review all information before submitting. Once submitted, your application will be handled with strict confidentiality.
      </p>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Applicant&apos;s Information</h3>
        <ReviewRow label="Name" value={applicant.name} />
        <ReviewRow label="Birthday" value={applicant.birthday} />
        <ReviewRow label="Age" value={applicant.age} />
        <ReviewRow label="Gender Identity" value={applicant.gender} />
        <ReviewRow label="Pronouns" value={
          applicant.pronouns === "he" ? "He/Him/His" :
          applicant.pronouns === "she" ? "She/Her/Hers" :
          applicant.pronouns === "they" ? "They/Them/Theirs" :
          applicant.pronouns
        } />
        <ReviewRow label="Organization" value={
          applicant.organization === "BSP" ? "Boy Scouts of the Philippines (BSP)" :
          applicant.organization === "GSP" ? "Girl Scouts of the Philippines (GSP)" :
          applicant.organization
        } />
        {(applicant.organization === "BSP" || applicant.organization === "GSP") && (
          <>
            <ReviewRow label="Council" value={applicant.council} />
            <ReviewRow label="Tenure in Scouting (years)" value={applicant.tenureInScouting} />
            <ReviewRow label="Rank" value={applicant.rank} />
            <ReviewRow label="Scouting Membership Category" value={applicant.scoutingMembership} />
          </>
        )}
        {applicant.organization === "Other" && (
          <>
            <ReviewRow label="Organization Type" value={applicant.organizationType} />
            {applicant.organizationType === "Other" && <ReviewRow label="Specified Type" value={applicant.organizationTypeOther} />}
            {applicant.organizationType && applicant.organizationType !== "No Organization / Independent" && (
              <>
                <ReviewRow label="Organization Name" value={applicant.orgName} />
                <ReviewRow label="Organization City" value={applicant.orgCity} />
              </>
            )}
            <ReviewRow label="Your City / Municipality" value={applicant.userCity} />
          </>
        )}
        <ReviewRow label="Willing to be interviewed" value={applicant.interview} />
        <ReviewRow label="Contact Number" value={applicant.contactNumber} />
        <ReviewRow label="Email" value={applicant.email} />
      </div>

      {[...new Set(screeningQuestionList.map((question) => question.category))].map(
        (category) => (
          <div className={styles.reviewSection} key={category}>
            <h3 className={styles.reviewSectionTitle}>
              {humanizeCategory(category)}
            </h3>
            {screeningQuestionList
              .filter((question) => question.category === category)
              .map((question) => (
                <ReviewRow
                  key={question.question_key}
                  label={question.question_text}
                  value={screeningAnswers[question.question_key]}
                />
              ))}
          </div>
        )
      )}

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Expertise and Interest</h3>
        <ReviewRow label="Fields with background" value={screeningQuestions.withBackground?.join(", ")} />
        <ReviewRow label="Fields of interest" value={screeningQuestions.interestedFields?.join(", ")} />
        <ReviewRow label="Hours per week" value={screeningQuestions.hoursPerWeek} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Essay Details</h3>
        <ReviewRow label="Description" value={essay.description} />
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
  const { user: authUser, loading: authLoading } = useAuth();
  const [step, setStep]   = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [draftNotice, setDraftNotice] = useState("");
  const [draftChecked, setDraftChecked] = useState(false);

  const [myApplications, setMyApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [screeningQuestionList, setScreeningQuestionList] = useState([]);
  const [screeningQuestionSetId, setScreeningQuestionSetId] = useState(null);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningLoading, setScreeningLoading] = useState(true);
  const [screeningLoadError, setScreeningLoadError] = useState("");

  useEffect(() => {
      const fetchMyApplications = async () => {
          try {
              const res = await authFetch(`${API}/api/volunteer_applications/my_applications`)
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

  useEffect(() => {
    const fetchScreeningQuestions = async () => {
      setScreeningLoading(true);
      setScreeningLoadError("");
      try {
        const res = await authFetch(`${API}/api/screening_questions`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || "Screening questions could not be loaded.");
        }
        const activeQuestions = (body.questions || []).filter(
          (question) => question.is_active
        );
        setScreeningQuestionList(activeQuestions);
        setScreeningQuestionSetId(
          body.questionSet?.screening_question_set_id || null
        );
        setScreeningAnswers((current) =>
          Object.fromEntries(
            activeQuestions
              .filter((question) => current[question.question_key])
              .map((question) => [
                question.question_key,
                current[question.question_key],
              ])
          )
        );
      } catch (error) {
        setScreeningLoadError(error.message);
      } finally {
        setScreeningLoading(false);
      }
    };
    fetchScreeningQuestions();
  }, []);

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

  const isDirty = useRef(false);
  const hasLoadedDraft = useRef(false);
  const hasHydratedProfile = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem("savira_volunteer_application_draft");
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (draft.applicant) setApplicant(draft.applicant);
        if (draft.screeningQuestions) setScreeningQuestions(draft.screeningQuestions);
        if (draft.screeningAnswers) setScreeningAnswers(draft.screeningAnswers);
        if (draft.essay) setEssay(draft.essay);
        setDraftNotice("You have an unfinished volunteer application draft. It has been loaded so you can continue.");
        isDirty.current = true;
        hasLoadedDraft.current = true;
      } catch (_) {
      } finally {
        setDraftChecked(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !draftChecked || hasLoadedDraft.current || hasHydratedProfile.current) return;
    if (!authUser) return;

    const profileFields = getApplicantFieldsFromUser(authUser);
    const hasProfileDetails = Object.values(profileFields).some(Boolean);
    if (!hasProfileDetails) return;

    setApplicant((current) => {
      const hasStartedApplication = Object.values(current).some(Boolean);
      if (hasStartedApplication) return current;
      hasHydratedProfile.current = true;
      return {
        ...current,
        ...profileFields,
      };
    });
  }, [authLoading, authUser, draftChecked]);

  useEffect(() => {
    if (submitted) return;
    if (!isDirty.current) {
      const hasDraft =
        Object.values(applicant).some(Boolean) ||
        Object.values(screeningQuestions).some((v) => Array.isArray(v) ? v.length > 0 : Boolean(v)) ||
        Object.values(screeningAnswers).some(Boolean) ||
        Boolean(essay.description);
      if (!hasDraft) return;
      isDirty.current = true;
    }
    localStorage.setItem(
      "savira_volunteer_application_draft",
      JSON.stringify({
        applicant,
        screeningQuestions,
        screeningAnswers,
        screeningQuestionSetId,
        essay,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [
    applicant,
    screeningQuestions,
    screeningAnswers,
    screeningQuestionSetId,
    essay,
    submitted,
  ]);

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
    if (step === 1) {
      if (screeningLoading || screeningLoadError) {
        errors.screening = screeningLoadError || "Please wait for the questions to load.";
      } else {
        screeningQuestionList.forEach((question) => {
          if (!screeningAnswers[question.question_key]) {
            errors[question.question_key] = "Please select an answer.";
          }
        });
      }
    }
    if (step === 2 && !essay.description.trim()) {
      errors.description = "Essay response is required.";
    }

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

          const res = await authFetch(`${API}/api/volunteer_applications/submit`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                  applicant,
                  screeningQuestions,
                  screeningAnswers,
                  screening_question_set_id: screeningQuestionSetId,
                  essay,
              }),
          })

          const result = await res.json()

          if (res.status === 409) {
              setSubmitError(result.error)
              return
          }

          if (!res.ok) throw new Error(result.error || 'Submission failed.')

          localStorage.removeItem("savira_volunteer_application_draft");
          isDirty.current = false;
          setSubmitted(true)

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
                Submit an Application
              </p>
              <h1 className={styles.heroTitle}>
                Volunteer
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
          <div className={`${styles.alertCard} ${styles.alertCardInfo}`}>
            <div className={styles.alertContent}>
              <span className={styles.alertLabel}>Draft found</span>
              <p className={styles.alertText}>{draftNotice}</p>
            </div>
            <button
              type="button"
              className={styles.alertAction}
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
              {step === 1 && (
                <StepScreeningQuestions
                  data={screeningQuestions}
                  onChange={setScreeningQuestions}
                  questions={screeningQuestionList}
                  answers={screeningAnswers}
                  onAnswer={(questionKey, value) => {
                    clearError(questionKey);
                    setScreeningAnswers((current) => ({
                      ...current,
                      [questionKey]: value,
                    }));
                  }}
                  loading={screeningLoading}
                  loadError={screeningLoadError || stepErrors.screening}
                  errors={stepErrors}
                />
              )}
              {step === 2 && (
                <StepEssay
                  data={essay}
                  onChange={setEssay}
                  errors={stepErrors}
                  clearError={clearError}
                />
              )}
              {/* {step === 3 && <StepCredentials        data={credentials}    onChange={setCredentials}    />} */}
              {step === 3 && (
                <StepReview
                  applicant={applicant}
                  screeningQuestions={screeningQuestions}
                  screeningQuestionList={screeningQuestionList}
                  screeningAnswers={screeningAnswers}
                  essay={essay}
                />
              )}
            </div>

            {submitError && (
              <div className={`${styles.alertCard} ${styles.alertCardWarning}`} role="alert">
                <div className={styles.alertContent}>
                  <span className={styles.alertLabel}>
                    Unable to submit application
                  </span>
                  <p className={styles.alertText}>{submitError}</p>
                </div>
              </div>
            )}

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
            <div className={styles.successIcon}><FaCheck /></div>
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