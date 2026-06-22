"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./CreateReport.module.css";
import { FaCheck } from "react-icons/fa";
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
  { id: 0, label: "Consent" },
  { id: 1, label: "Complainant's Info" },
  { id: 2, label: "Incident Details" },
  { id: 3, label: "Supporting Evidence" },
  { id: 4, label: "Review & Submit" },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const OUTCOME_OPTIONS = [
  "Safety planning and support",
  "Counseling or psychosocial support",
  "Legal advice or legal action",
  "Mediation or restorative process",
  "Referral to police or another agency",
  "Financial support",
  "Medical support",
  "Documentation only",
  "I am not sure yet",
];

function normalizeOutcomeSelection(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((item) => OUTCOME_OPTIONS.includes(item)))];
  }
  if (typeof value !== "string" || !value.trim()) return [];

  if (OUTCOME_OPTIONS.includes(value.trim())) return [value.trim()];

  const savedValues = value.split(",").map((item) => item.trim());
  return OUTCOME_OPTIONS.filter((option) => savedValues.includes(option));
}

function formatOutcomeSelection(value) {
  return normalizeOutcomeSelection(value).join(", ");
}

const LOCAL_POLICE_STATIONS = [
  "Caloocan City Police Station",
  "Las Pinas City Police Station",
  "Makati City Police Station",
  "Malabon City Police Station",
  "Mandaluyong City Police Station",
  "Manila Police District",
  "Marikina City Police Station",
  "Muntinlupa City Police Station",
  "Navotas City Police Station",
  "Paranaque City Police Station",
  "Pasay City Police Station",
  "Pasig City Police Station",
  "Pateros Municipal Police Station",
  "Quezon City Police District",
  "QCPD Station 1 La Loma",
  "QCPD Station 2 Masambong",
  "QCPD Station 3 Talipapa",
  "QCPD Station 4 Novaliches",
  "QCPD Station 5 Fairview",
  "QCPD Station 6 Batasan",
  "QCPD Station 7 Cubao",
  "QCPD Station 8 Project 4",
  "QCPD Station 9 Anonas",
  "QCPD Station 10 Kamuning",
  "QCPD Station 11 Galas",
  "QCPD Station 12 Eastwood",
  "San Juan City Police Station",
  "Taguig City Police Station",
  "Valenzuela City Police Station",
  "Women and Children Protection Desk",
];

function getLocalPoliceStationSuggestions(query) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  return LOCAL_POLICE_STATIONS
    .filter((station) => station.toLowerCase().includes(normalized))
    .slice(0, 6)
    .map((station, index) => ({
      id: `local-${index}-${station}`,
      text: station,
      place_name: "Suggested from local NCR station list",
      source: "local",
    }));
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isFutureIncident(date, time) {
  if (!date) return false;
  const incidentDateTime = new Date(`${date}T${time || "23:59"}`);
  if (Number.isNaN(incidentDateTime.getTime())) return false;
  return incidentDateTime > new Date();
}

async function searchPoliceStations(query) {
  if (!MAPBOX_TOKEN) return { features: [] };
  const search = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    country: "PH",
    limit: "6",
    proximity: "121.0244,14.5547",
    language: "en",
    types: "poi",
    poi_category: "police_station",
    auto_complete: "true",
  });
  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/forward?${search}`
  );
  if (!res.ok) throw new Error("Police station search failed.");
  return res.json();
}

async function searchLocations(query, sessionToken) {
  if (!MAPBOX_TOKEN) return { features: [] };
  const search = new URLSearchParams({
    q: query,
    session_token: sessionToken,
    access_token: MAPBOX_TOKEN,
    country: "PH",
    limit: "10",
    proximity: "121.0244,14.5547",
    language: "en",
  });
  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/suggest?${search}`
  );
  if (!res.ok) throw new Error("Location search failed.");
  return res.json();
}

function normalizeLocationSuggestion(feature) {
  const properties = feature.properties || feature;
  const name = properties.name_preferred || properties.name || feature.text;
  if (!name) return null;

  const address =
    properties.full_address ||
    properties.place_formatted ||
    properties.address ||
    feature.place_name ||
    "";
  const addressIncludesName = address.toLowerCase().includes(name.toLowerCase());

  return {
    id: properties.mapbox_id || feature.id || `${name}-${address}`,
    text: name,
    place_name: address,
    value: address && !addressIncludesName ? `${name}, ${address}` : address || name,
  };
}

// ── Cookie ───────────────────────────────────────────────────────
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
export function Field({
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

export function Input({ error, ...props }) {
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

export function Select({ children, error, ...props }) {
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

export function RadioGroup({ name, options, value, onChange, error }) {
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
export function normalisePhone(raw) {
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

function calculateAge(birthday) {
  if (!birthday) return "";
  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function getSelfReportFields(user) {
  if (!user) {
    return {
      name: "",
      age: "",
      gender: "",
      contactNumber: "",
      email: "",
    };
  }
  return {
    name: [user.first_name, user.middle_name, user.last_name, user.extension_name]
      .filter(Boolean)
      .join(" "),
    age: calculateAge(user.birthday),
    gender: user.gender_identity || "",
    contactNumber: user.contact_number || "",
    email: user.email || "",
  };
}

function validateConsentStep(data, consents) {
  const errors = {};

  if (!data.interview)
    errors.interview = "Please let us know whether you are willing to be interviewed. You can choose what feels safest for you.";
  if (!consents.dataPrivacy)
    errors.dataPrivacy = "Please confirm this so we can handle your report for case management.";
  if (!consents.caseAnalysis)
    errors.caseAnalysis = "Please confirm this so anonymized details may help improve case handling.";

  return errors;
}

export function validateStep0(data) {
  const errors = {};

  if (!data.reporteeType) errors.reporteeType = "Please select who this report is about.";
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
    errors.email = "Enter a valid email address such as sample@gmail.com.";
  }

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

export function validateStep1(data) {
  const errors = {};

  if (!data.date)
    errors.date = "Please let us know when this happened — the date helps us document your case accurately.";

  if (!data.time)
    errors.time = "An approximate time is completely fine — this helps us piece together the full picture.";

  if (data.date && isFutureIncident(data.date, data.time)) {
    errors.date = "The incident date and time cannot be in the future. Please choose the date and time when it already happened.";
    if (data.time) errors.time = "The incident time cannot be in the future for the selected date.";
  }

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
function StepConsent({ complainant, onComplainantChange, consents, onConsentChange, errors, clearError }) {
  const setConsent = (key, checked) => {
    clearError(key);
    onConsentChange(key, checked);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Consent, Authorization</span> & Disclaimers
      </h2>
      <p className={styles.stepDesc}>
        Before continuing, please read and confirm the statements below. These steps are here to ensure your rights are protected, your privacy is safeguarded, and your report is handled with the utmost care and responsibility.
      </p>

      <div className={styles.consentStack}>
        <section className={`${styles.consentSection} ${styles.noticePanel}`}>
          <div className={styles.consentSectionHeader}>
            <h3 className={styles.noticeTitle}>Important Notices</h3>
          </div>
          <ul className={styles.noticeList}>
            <li className={styles.noticeItem}>
              <span className={styles.noticeItemTitle}>Response Time</span>
              <span>
                To give every report careful attention, the review and verification process may take up to <strong>72 hours</strong>.
              </span>
            </li>
            <li className={`${styles.noticeItem} ${styles.highlightEmergency}`}>
              <span className={styles.noticeItemTitle}>If You Need Immediate Help</span>
              <span>
                This platform is for case management and is not monitored for immediate crisis intervention.
                Your safety and well-being matter deeply to us. If you are in immediate danger, need urgent medical care,
                or need crisis safety assistance, please visit our <a href="/helplines" className={styles.emergencyLink}>Helplines page</a> for trusted emergency contacts who can help you right now.
              </span>
            </li>
          </ul>
        </section>

        <section className={styles.consentSection}>
          <div className={styles.consentSectionHeader}>
            <span className={styles.sectionKicker}>Consent & acknowledgement</span>
            <h3 className={styles.subSectionTitle}>How Your Report Will Be Handled</h3>
            <p className={styles.sectionIntro}>
              These confirmations help us protect your information and use only anonymized details when improving case handling.
            </p>
          </div>
          <div className={styles.consentBlock}>
            <label className={`${styles.consentLabel} ${errors?.dataPrivacy ? styles.consentLabelError : ""}`}>
              <input
                type="checkbox"
                className={styles.consentCheckbox}
                checked={consents.dataPrivacy}
                onChange={(e) => setConsent("dataPrivacy", e.target.checked)}
                data-error={errors?.dataPrivacy ? "true" : "false"}
              />
              <span>
                I understand and agree that the information I have provided in this report will be collected,
                stored, and processed by the institution solely for the purpose of case management and resolution.
                All data will be handled in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and the institution&apos;s
                privacy policy. My information will not be shared with unauthorized third parties without my consent.
              </span>
            </label>
            {errors?.dataPrivacy && <p className={styles.fieldError}>{errors.dataPrivacy}</p>}

            <label className={`${styles.consentLabel} ${errors?.caseAnalysis ? styles.consentLabelError : ""}`}>
              <input
                type="checkbox"
                className={styles.consentCheckbox}
                checked={consents.caseAnalysis}
                onChange={(e) => setConsent("caseAnalysis", e.target.checked)}
                data-error={errors?.caseAnalysis ? "true" : "false"}
              />
              <span>
                I agree that the narrative details of my report may be used to support ongoing efforts to improve case handling and outcomes.
                Any such use will be conducted on <strong>anonymized, de-identified data only</strong>. Personally identifiable information such as names,
                contact details, and age will be excluded and will not be retained or linked to any analysis.
              </span>
            </label>
            {errors?.caseAnalysis && <p className={styles.fieldError}>{errors.caseAnalysis}</p>}
          </div>
        </section>

      <section className={`${styles.consentSection} ${styles.communicationPanel}`}>
        <div className={styles.consentSectionHeader}>
        <h3 className={styles.subSectionTitle}>Your Communication Preferences</h3>
        <p className={styles.stepDesc}>
          Your comfort and safety are our priorities. Please let us know how you would like to proceed with your report.
        </p>
        </div>
      <Field
        label="Willingness to be interviewed"
        required
        hint="Would you be comfortable speaking with a SASHA Representative, together with a SASHA paralegal and/or lawyer, so your case can be reviewed with more care?"
        error={errors.interview}
      >
        <RadioGroup
          name="interview"
          options={["Yes, I am open to an interview.", "No, I prefer not to be interviewed at this time."]}
          value={
            complainant.interview === "Yes"
              ? "Yes, I am open to an interview."
              : complainant.interview === "No"
              ? "No, I prefer not to be interviewed at this time."
              : ""
          }
          onChange={(v) => {
            clearError("interview");
            onComplainantChange({ ...complainant, interview: v.startsWith("Yes") ? "Yes" : "No" });
          }}
          error={errors.interview}
        />
      </Field>
        <p className={styles.communicationNote}>
          You are in control of what happens next. Choose the option that feels safest and most supportive for you right now; whatever you choose, SASHA will still review your report with care.
        </p>
      </section>
      </div>
    </div>
  );
}

function StepComplainantInfo({ data, onChange, errors, clearError, getCurrentUser }) {
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
  return (
    <div>
      <h2 className={styles.stepTitle}>
        <span className={styles.stepTitleAccent}>Complainant&apos;s</span> Information
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
            onChange={async (v) => {
              clearError("reporteeType");
              const isMe = v === "Me (Myself)";
              const currentUser = isMe ? await getCurrentUser() : null;
              onChange({
                ...data,
                reporteeType: v,
                ...(isMe
                  ? getSelfReportFields(currentUser)
                  : {
                      name: "",
                      age: "",
                      gender: "",
                      contactNumber: "",
                      email: "",
                    }),
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
            <Field label="Council" required hint="Share your council name if you are part of BSP or GSP." error={errors.council}>
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
            placeholder="Sports club"
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

    </div>
  );
}

// ── Page 2 — Incident Details ─────────────────────────────────────────────────
export function PoliceStationTypeahead({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!isTyping) {
      const timer = setTimeout(() => {
        setSuggestions([]);
        setStatus("idle");
      }, 0);
      return () => clearTimeout(timer);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      const timer = setTimeout(() => {
        setSuggestions([]);
        setStatus("idle");
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;

      const localSuggestions = getLocalPoliceStationSuggestions(trimmed);
      if (!MAPBOX_TOKEN) {
        setSuggestions(localSuggestions);
        setActiveIndex(-1);
        setStatus(localSuggestions.length ? "local" : "empty");
        return;
      }

      setStatus("loading");
      try {
        const data = await searchPoliceStations(trimmed);
        if (cancelled) return;
        const next = (data.features || [])
          .map((feature) => {
            const properties = feature.properties || {};
            const name = properties.name_preferred || properties.name;
            if (!name) return null;
            const address =
              properties.full_address ||
              properties.place_formatted ||
              properties.address ||
              "";
            return {
              id: properties.mapbox_id || feature.id || name,
              text: name,
              place_name: address,
              value: address ? `${name}, ${address}` : name,
              source: "mapbox",
            };
          })
          .filter(Boolean)
          .slice(0, 5);
        const merged = [...next, ...localSuggestions].filter(
          (item, index, list) =>
            index ===
            list.findIndex(
              (candidate) =>
                candidate.text.trim().toLowerCase() === item.text.trim().toLowerCase()
            )
        );
        setSuggestions(merged.slice(0, 6));
        setActiveIndex(-1);
        setStatus(next.length ? "idle" : localSuggestions.length ? "local" : "empty");
      } catch (_) {
        if (!cancelled) {
          setSuggestions(localSuggestions);
          setStatus(localSuggestions.length ? "local" : "error");
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, isTyping]);

  const selectSuggestion = (feature) => {
    onChange(feature.value || feature.text || "");
    setSuggestions([]);
    setStatus("idle");
    setIsTyping(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!isTyping || suggestions.length === 0) {
      if (event.key === "Escape") setIsTyping(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.typeahead}>
      <Input
        placeholder="Search for the police station or precinct"
        value={value}
        onChange={(e) => {
          setIsTyping(true);
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsTyping(false)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isTyping && suggestions.length > 0}
        aria-controls="police-station-suggestions"
        aria-activedescendant={
          activeIndex >= 0 ? `police-station-suggestion-${activeIndex}` : undefined
        }
        autoComplete="off"
      />
      {isTyping && suggestions.length > 0 && (
        <div id="police-station-suggestions" className={styles.suggestionsList} role="listbox">
          {suggestions.map((feature, index) => (
            <button
              id={`police-station-suggestion-${index}`}
              type="button"
              className={`${styles.suggestionItem} ${
                activeIndex === index ? styles.suggestionItemActive : ""
              }`}
              key={feature.id}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(feature)}
            >
              <span className={styles.suggestionName}>{feature.text}</span>
              <span className={styles.suggestionAddress}>{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
      {isTyping && status === "loading" && <p className={styles.fieldHint}>Looking for nearby police station matches...</p>}
      {isTyping && status === "local" && <p className={styles.fieldHint}>Showing local suggestions. You can still type the exact station name if it is not listed.</p>}
      {isTyping && status === "empty" && <p className={styles.fieldHint}>No suggestions found yet. You can still type the station name you know.</p>}
      {isTyping && status === "error" && <p className={styles.fieldHint}>Suggestions are unavailable right now. You can still type the station name.</p>}
    </div>
  );
}

export function IncidentLocationTypeahead({ value, onChange, city }) {
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionTokenRef = useRef(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (!isTyping || trimmed.length < 2) {
      const timer = setTimeout(() => {
        setSuggestions([]);
        setStatus("idle");
        setActiveIndex(-1);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current =
            globalThis.crypto?.randomUUID?.() ||
            `location-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        const data = await searchLocations(
          [trimmed, city, "Metro Manila"].filter(Boolean).join(", "),
          sessionTokenRef.current
        );
        if (cancelled) return;
        const nextSuggestions = (data.suggestions || data.features || [])
          .map(normalizeLocationSuggestion)
          .filter(Boolean)
          .filter(
            (item, index, list) =>
              index === list.findIndex((candidate) => candidate.value === item.value)
          )
          .slice(0, 8);
        setSuggestions(nextSuggestions);
        setActiveIndex(-1);
        setStatus(nextSuggestions.length ? "idle" : "empty");
      } catch (_) {
        if (!cancelled) {
          setSuggestions([]);
          setStatus(MAPBOX_TOKEN ? "error" : "missingToken");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, isTyping, value]);

  const selectSuggestion = (feature) => {
    onChange(feature.value || feature.place_name || feature.text || "");
    setSuggestions([]);
    setStatus("idle");
    setIsTyping(false);
    setActiveIndex(-1);
    sessionTokenRef.current = null;
  };

  const handleKeyDown = (event) => {
    if (!isTyping || suggestions.length === 0) {
      if (event.key === "Escape") setIsTyping(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.typeahead}>
      <Input
        placeholder="Barangay hall, school, park, landmark, or address"
        value={value}
        onChange={(event) => {
          setIsTyping(true);
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setIsTyping(false);
          sessionTokenRef.current = null;
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isTyping && suggestions.length > 0}
        aria-controls="incident-location-suggestions"
        aria-activedescendant={
          activeIndex >= 0 ? `incident-location-suggestion-${activeIndex}` : undefined
        }
        autoComplete="off"
      />
      {isTyping && suggestions.length > 0 && (
        <div id="incident-location-suggestions" className={styles.suggestionsList} role="listbox">
          {suggestions.map((feature, index) => (
            <button
              id={`incident-location-suggestion-${index}`}
              type="button"
              className={`${styles.suggestionItem} ${
                activeIndex === index ? styles.suggestionItemActive : ""
              }`}
              key={feature.id}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(feature)}
            >
              <span className={styles.suggestionName}>{feature.text}</span>
              <span className={styles.suggestionAddress}>{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
      {isTyping && status === "loading" && (
        <p className={styles.fieldHint}>Finding location suggestions...</p>
      )}
      {isTyping && status === "empty" && (
        <p className={styles.fieldHint}>No suggestions found. You can still enter the location manually.</p>
      )}
      {isTyping && (status === "error" || status === "missingToken") && (
        <p className={styles.fieldHint}>Suggestions are unavailable. You can still enter the location manually.</p>
      )}
    </div>
  );
}

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
          <Input type="date" value={data.date} onChange={set("date")} max={getTodayInputValue()} error={errors.date} />
        </Field>
        <Field label="Time" hint="Approximate time is fine if exact time is unknown." error={errors.time}>
          <Input
            type="time"
            value={data.time}
            onChange={set("time")}
            max={data.date === getTodayInputValue() ? getCurrentTimeInputValue() : undefined}
            error={errors.time}
          />
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
            <Field label="Where did this happen?" hint="Tell us a little about where this occurred.">
              <IncidentLocationTypeahead
                value={data.incidentVenue || ""}
                city={data.incidentCity || ""}
                onChange={(value) => {
                  clearError("incidentVenue");
                  onChange({ ...data, incidentVenue: value });
                }}
              />
            </Field>
          </>
        )}

        {data.locationType === "Online" && (
          <Field label="Online Platform / Service" hint="Where did this incident occur online?">
            <Input
              placeholder="Facebook, Instagram, WhatsApp, email, gaming platform, website"
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
        <div className={styles.checkboxGrid}>
          {OUTCOME_OPTIONS.map((option) => (
            <label key={option} className={styles.checkboxOption}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={normalizeOutcomeSelection(data.outcome).includes(option)}
                onChange={(event) => {
                  const selected = normalizeOutcomeSelection(data.outcome);
                  onChange({
                    ...data,
                    outcome: event.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option),
                  });
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
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
              placeholder="Teacher, coach, relative, stranger"
              value={data.perpetratorOccupation || ""}
              onChange={set("perpetratorOccupation")}
            />
          </Field>
          <Field label="Relationship to Perpetrator" hint="How do you know this person?">
            <Input
              placeholder="Classmate, supervisor, partner, unknown"
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
      {data.perpetratorKnown === "No" && (
        <div className={styles.formGrid}>
          <Field label="Gender of Perpetrator (as you perceive it)" hint="Optional. Share only what you remember or feel comfortable noting.">
            <Select value={data.perpetratorUnknownGender || ""} onChange={set("perpetratorUnknownGender")}>
              <option value="">Select if remembered</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
              <option>Unable to tell</option>
              <option>Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Appearance or identifying details" hint="Optional. Any detail you remember may help, but it is okay to leave this blank.">
            <textarea
              className={styles.textarea}
              placeholder="Clothing, approximate age, build, height, voice, marks, or other details you remember"
              value={data.perpetratorUnknownAppearance || ""}
              onChange={set("perpetratorUnknownAppearance")}
              rows={3}
            />
          </Field>
        </div>
      )}

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
              placeholder="Phone number or email"
              value={data.witnessContact || ""}
              onChange={set("witnessContact")}
              error={errors.witnessContact}
            />
          </Field>
          <Field label="Relationship to Witness" hint="How do you know this person?">
            <Input
              placeholder="Classmate, supervisor, partner, unknown"
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
            <Field label="Who did you tell?" hint="Share the person or role if you feel comfortable.">
              <Input
                placeholder="Mother, friend, guidance counselor"
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
            <Field label="Which police station?" hint="Start typing the station, precinct, or district name. Suggestions may appear as you type.">
              <PoliceStationTypeahead
                value={data.policeStation || ""}
                onChange={(value) => {
                  clearError("policeStation");
                  onChange({ ...data, policeStation: value });
                }}
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
function ReviewRow({ label, value }) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value || <em className={styles.reviewEmpty}>Not provided</em>}</span>
    </div>
  );
}

function StepReview({ complainant, incident, evidence }) {

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
        <h3 className={styles.reviewSectionTitle}>Complainant&apos;s Information</h3>
        <ReviewRow label="Report Type"               value={complainant.reporteeType} />
        <ReviewRow label="Name"                   value={complainant.name} />
        <ReviewRow label="Age"                    value={complainant.age} />
        <ReviewRow label="Gender Identity"        value={complainant.gender} />
        <ReviewRow label="Organization"           value={complainant.organization} />
        {(complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
          complainant.organization === "Girl Scouts of the Philippines (GSP)") && (
          <>
            <ReviewRow label="Council"            value={complainant.council} />
            <ReviewRow label="Region"             value={complainant.region} />
          </>
        )}
        {complainant.organization === "Others" && (
          <>
            <ReviewRow label="Organization Name"  value={complainant.orgName} />
            <ReviewRow label="Organization Type"  value={complainant.organizationType} />
            <ReviewRow label="Organization Address" value={orgAddress} />
            <ReviewRow label="Your Location"      value={userAddress} />
          </>
        )}
        <ReviewRow label="Willing to be interviewed" value={complainant.interview} />
        <ReviewRow label="Contact Number"         value={complainant.contactNumber} />
        <ReviewRow label="Email"                  value={complainant.email} />
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Incident Details</h3>
        <ReviewRow label="Date"                   value={incident.date} />
        <ReviewRow label="Time"                   value={incident.time} />
        <ReviewRow label="Location Type"          value={incident.locationType} />
        <ReviewRow label="Location"               value={incidentLocation} />
        <ReviewRow label="Description"            value={incident.description} />
        <ReviewRow
          label="Outcome sought"
          value={formatOutcomeSelection(incident.outcome)}
        />
        <ReviewRow label="Perpetrator known"      value={incident.perpetratorKnown} />
        {incident.perpetratorKnown === "Yes" && (
          <>
            <ReviewRow label="Perpetrator name"       value={incident.perpetratorName} />
            <ReviewRow label="Perpetrator occupation" value={incident.perpetratorOccupation} />
            <ReviewRow label="Relationship to perpetrator" value={incident.perpetratorRelationship} />
            <ReviewRow label="Perpetrator gender"     value={incident.perpetratorGender} />
          </>
        )}
        {incident.perpetratorKnown === "No" && (
          <>
            <ReviewRow label="Perceived gender" value={incident.perpetratorUnknownGender} />
            <ReviewRow label="Appearance or identifying details" value={incident.perpetratorUnknownAppearance} />
          </>
        )}
        <ReviewRow label="Witnesses"              value={incident.witnesses} />
        {incident.witnesses === "Yes" && (
          <>
          <ReviewRow label="Witness name"         value={incident.witnessName} />
          <ReviewRow label="Witness contact"      value={incident.witnessContact} />
          <ReviewRow label="Relationship to witness" value={incident.witnessRelationship} />
          </>
        )}
        <ReviewRow label="Told anyone"            value={incident.toldAnyone} />
        {incident.toldAnyone === "Yes" && (
          <ReviewRow label="Who was told"         value={incident.toldAnyoneWho} />
        )}
        <ReviewRow label="Told police"            value={incident.toldPolice} />
        {incident.toldPolice === "Yes" && (
          <ReviewRow label="Police station"       value={incident.policeStation} />
        )}
      </div>

      <div className={styles.reviewSection}>
        <h3 className={styles.reviewSectionTitle}>Supporting Evidence</h3>
        {/* <ReviewRow label="Anonymous submission" value={evidence.anonymous ? "Yes" : "No"} /> */}
        <ReviewRow
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
    description: "", outcome: [],
    perpetratorKnown: "", perpetratorName: "", perpetratorOccupation: "",
    perpetratorRelationship: "", perpetratorGender: "",
    perpetratorUnknownGender: "", perpetratorUnknownAppearance: "",
    witnesses: "", witnessName: "", witnessContact: "", witnessRelationship: "",
    toldAnyone: "", toldAnyoneWho: "", toldPolice: "", policeStation: "",
  });

  const [evidence, setEvidence] = useState({ files: [], anonymous: false });
  const [draftNotice, setDraftNotice] = useState("");

  const totalSteps = STEPS.length;

  const getCurrentUser = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return null;
      const body = await response.json();
      return body.user || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savira_case_report_draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      const timer = setTimeout(() => {
        if (draft.complainant) setComplainant(draft.complainant);
        if (draft.incident) {
          setIncident((current) => ({
            ...current,
            ...draft.incident,
            outcome: normalizeOutcomeSelection(draft.incident.outcome),
          }));
        }
        if (draft.evidence) setEvidence(draft.evidence);
        if (draft.consents) setConsents(draft.consents);
        setDraftNotice("You have an unfinished report draft. It has been loaded so you can continue.");
      }, 0);
      return () => clearTimeout(timer);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (submitted) return;
    const hasDraft =
      Object.values(complainant).some(Boolean) ||
      Object.values(incident).some((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value)
      ) ||
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
    if (step === 0) errors = validateConsentStep(complainant, consents);
    if (step === 1) errors = validateStep0(complainant);
    if (step === 2) errors = validateStep1(incident);

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

        const formData = new FormData();
        formData.append('complainant', JSON.stringify(complainant));
        formData.append(
          'incident',
          JSON.stringify({
            ...incident,
            outcome: formatOutcomeSelection(incident.outcome),
          })
        );
        formData.append('evidence', JSON.stringify({ anonymous: evidence.anonymous }));
        (evidence.files || []).forEach((file) => formData.append('files', file));

        const response = await fetch(`${API_URL}/api/case_reports/submit`, {
          method: 'POST',
          credentials: 'include', // sends the token cookie
          body: formData, // do NOT set Content-Type — browser sets the multipart boundary
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
                  We&apos;re Here
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
            <div className={`${styles.alertCard} ${styles.alertCardInfo}`}>
              <div className={styles.alertContent}>
                <span className={styles.alertLabel}>Draft found</span>
                <p className={styles.alertText}>{draftNotice}</p>
              </div>
              <button
                type="button"
                className={styles.alertAction}
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
                  <StepConsent
                    complainant={complainant}
                    onComplainantChange={setComplainant}
                    consents={consents}
                    onConsentChange={(key, val) => setConsents((prev) => ({ ...prev, [key]: val }))}
                    errors={stepErrors}
                    clearError={clearError}
                  />
                )}
                {step === 1 && (
                  <StepComplainantInfo
                    data={complainant}
                    onChange={setComplainant}
                    errors={stepErrors}
                    clearError={clearError}
                    getCurrentUser={getCurrentUser}
                  />
                )}
                {step === 2 && (
                  <StepIncidentDetails
                    data={incident}
                    onChange={setIncident}
                    errors={stepErrors}
                    clearError={clearError}
                  />
                )}
                {step === 3 && (
                  <StepEvidence data={evidence} onChange={setEvidence} />
                )}
                {step === 4 && (
                  <StepReview
                    complainant={complainant}
                    incident={incident}
                    evidence={evidence}
                  />
                )}
              </div>

              {submissionError && (
                <div className={`${styles.alertCard} ${styles.alertCardWarning}`}>
                  <div className={styles.alertContent}>
                    <span className={styles.alertLabel}>Unable to submit report</span>
                    <p className={styles.alertText}>{submissionError}</p>
                  </div>
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
              <div className={styles.successIcon}><FaCheck /></div>
              <h2 className={styles.successTitle}>Thank you for sharing your story.</h2>
              <p className={styles.successDesc}>
                It takes courage to come forward, and we&apos;re glad you did. Your report has been
                received and will be kept private and handled with care.
              </p>

              <div className={styles.successNextSteps}>
                <h3>What happens next?</h3>
                <ul className={styles.successStepsList}>
                  <li>Our team will carefully review your report.</li>
                  <li>
                    You can check its status anytime on your{" "}
                    <Link href="/cases/history">Report History page</Link>.
                  </li>
                  <li>
                    We&apos;ll reach out using the contact details you provided to talk through next
                    steps and the support available to you.
                  </li>
                </ul>
              </div>

              <div className={styles.successSupportCallout}>
                <p className={styles.successSupportText}>
                  Need help right now? If you're in immediate danger, contact emergency services.
                </p>
                <Link className={styles.supportResourcesButton} href="/helplines">
                  Find Support &amp; Resources
                </Link>
              </div>

              <p className={styles.successAnotherReport}>
                Need to file for a different incident?{" "}
                <button type="button" onClick={() => window.location.reload()}>
                  Submit another report
                </button>
              </p>
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
