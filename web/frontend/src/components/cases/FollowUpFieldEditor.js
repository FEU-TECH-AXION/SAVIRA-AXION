"use client";

import { useMemo, useState } from "react";
import {
  Field,
  Input,
  IncidentLocationTypeahead,
  normalisePhone,
  PoliceStationTypeahead,
  RadioGroup,
  Select,
  validateStep0,
  validateStep1,
} from "./CreateReport";
import styles from "./FollowUpFieldEditor.module.css";

export const AMENDMENT_GROUPS = [
  {
    id: "complainant_contact",
    label: "Complainant contact info",
    fields: ["complainant.contactNumber", "complainant.email"],
  },
  {
    id: "incident_datetime",
    label: "Incident date/time",
    fields: ["incident.date", "incident.time"],
  },
  {
    id: "incident_location",
    label: "Incident location",
    fields: ["incident.locationType", "incident.incidentCity", "incident.incidentVenue"],
  },
  {
    id: "incident_description",
    label: "Incident description/outcome",
    fields: ["incident.description", "incident.outcome"],
  },
  {
    id: "perpetrator",
    label: "Perpetrator details",
    fields: [
      "incident.perpetratorKnown",
      "incident.perpetratorName",
      "incident.perpetratorOccupation",
      "incident.perpetratorRelationship",
      "incident.perpetratorGender",
      "incident.perpetratorUnknownGender",
      "incident.perpetratorUnknownAppearance",
    ],
  },
  {
    id: "witnesses",
    label: "Witness details",
    fields: [
      "incident.witnesses",
      "incident.witnessName",
      "incident.witnessContact",
      "incident.witnessRelationship",
    ],
  },
  {
    id: "prior_disclosure",
    label: "Prior disclosure/police report",
    fields: [
      "incident.toldAnyone",
      "incident.toldAnyoneWho",
      "incident.toldPolice",
      "incident.policeStation",
    ],
  },
  {
    id: "evidence",
    label: "Evidence/attachments",
    fields: ["evidence.files"],
  },
];

export const FIELD_LABELS = {
  "complainant.contactNumber": "Contact Number",
  "complainant.email": "Email",
  "incident.date": "Date",
  "incident.time": "Time",
  "incident.locationType": "Incident Location Type",
  "incident.incidentCity": "City / Municipality",
  "incident.incidentVenue": "Incident Venue / Online Platform",
  "incident.description": "What happened?",
  "incident.outcome": "What action or outcome are you seeking?",
  "incident.perpetratorKnown": "Is the perpetrator known to you?",
  "incident.perpetratorName": "Name of Perpetrator",
  "incident.perpetratorOccupation": "Occupation of Perpetrator",
  "incident.perpetratorRelationship": "Relationship to Perpetrator",
  "incident.perpetratorGender": "Gender of Perpetrator (as you perceive it)",
  "incident.perpetratorUnknownGender": "Gender of Perpetrator (as you perceive it)",
  "incident.perpetratorUnknownAppearance": "Appearance or identifying details",
  "incident.witnesses": "Are there any witnesses?",
  "incident.witnessName": "Name of Witness",
  "incident.witnessContact": "Contact Information of Witness",
  "incident.witnessRelationship": "Relationship to Witness",
  "incident.toldAnyone": "Have you told anyone about the incident?",
  "incident.toldAnyoneWho": "Who did you tell?",
  "incident.toldPolice": "Have you told the police?",
  "incident.policeStation": "Which police station?",
  "evidence.files": "Evidence / Attachments",
};

export function getFieldLabel(path, locationType = "") {
  if (path === "incident.incidentVenue") {
    if (locationType === "Physical Location") return "Where did this happen?";
    if (locationType === "Online") return "Online Platform / Service";
  }
  return FIELD_LABELS[path] || path;
}

const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
  "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
  "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
];

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

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

function yesNo(value) {
  if (value === "Yes" || value === "No") return value;
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function dateValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function timeValue(value) {
  if (!value || value === "N/A") return "";
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return "";
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function outcomeValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function buildAmendmentValues(reportData = {}) {
  return {
    complainant: {
      contactNumber: firstValue(reportData, ["contact_number", "contactNumber"]),
      email: firstValue(reportData, ["email"]),
    },
    incident: {
      date: dateValue(firstValue(reportData, ["incident_date", "incidentDate"])),
      time: timeValue(firstValue(reportData, ["incident_time", "incidentTime"])),
      locationType: firstValue(reportData, ["incident_location_type", "incidentLocationType"]),
      incidentCity: firstValue(reportData, ["incident_city", "incidentCity"]),
      incidentVenue: firstValue(reportData, ["incident_location", "incidentLocation"]),
      description: firstValue(reportData, ["incident_description", "description"]),
      outcome: outcomeValue(firstValue(reportData, ["action_requested", "outcome"], [])),
      perpetratorKnown: yesNo(firstValue(reportData, ["is_perpetrator_known", "perpetratorKnown"], null)),
      perpetratorName: firstValue(reportData, ["perpetrator_name", "perpetratorName"]),
      perpetratorOccupation: firstValue(reportData, ["perpetrator_occupation", "perpetratorOccupation"]),
      perpetratorRelationship: firstValue(reportData, ["perpetrator_relationship", "perpetratorRelationship"]),
      perpetratorGender: firstValue(reportData, ["perpetrator_gender", "perpetratorGender"]),
      perpetratorUnknownGender: firstValue(reportData, [
        "perpetrator_unknown_gender",
        "perpetratorUnknownGender",
      ]),
      perpetratorUnknownAppearance: firstValue(reportData, [
        "perpetrator_unknown_appearance",
        "perpetratorUnknownAppearance",
      ]),
      witnesses: yesNo(firstValue(reportData, ["has_witnesses", "hasWitnesses"], null)),
      witnessName: firstValue(reportData, ["witness_name", "witnessName"]),
      witnessContact: firstValue(reportData, ["witness_contact", "witnessContact"]),
      witnessRelationship: firstValue(reportData, ["witness_relationship", "witnessRelationship"]),
      toldAnyone: yesNo(firstValue(reportData, ["reported_to_others", "reportedToOthers"], null)),
      toldAnyoneWho: firstValue(reportData, ["told_anyone_who", "toldAnyoneWho"]),
      toldPolice: yesNo(firstValue(reportData, ["reported_to_police", "reportedToPolice"], null)),
      policeStation: firstValue(reportData, ["police_station", "policeStation"]),
    },
  };
}

function getPathValue(values, path) {
  const [section, key] = path.split(".");
  return values?.[section]?.[key];
}

export function buildFieldChanges(fields, original, edited) {
  return fields
    .filter((fieldKey) => fieldKey !== "evidence.files")
    .map((fieldKey) => ({
      field_key: fieldKey,
      previous_value: getPathValue(original, fieldKey) ?? null,
      new_value: getPathValue(edited, fieldKey) ?? null,
    }))
    .filter((change) =>
      JSON.stringify(change.previous_value) !== JSON.stringify(change.new_value)
    );
}

export function validateAmendmentFields(fields, values) {
  const complainantErrors = validateStep0({
    ...values.complainant,
    age: "1",
    gender: "Not amended",
    organization: "Not amended",
  });
  const incidentErrors = validateStep1({
    ...values.incident,
    date: fields.includes("incident.date") ? values.incident.date : "2000-01-01",
    time: fields.includes("incident.time") ? values.incident.time : "12:00",
    locationType: fields.includes("incident.locationType") ? values.incident.locationType : "Online",
    description: fields.includes("incident.description")
      ? values.incident.description
      : "Existing incident description is intentionally retained and is long enough for validation.",
    perpetratorKnown: fields.includes("incident.perpetratorKnown")
      ? values.incident.perpetratorKnown
      : "No",
    witnesses: fields.includes("incident.witnesses") ? values.incident.witnesses : "No",
    toldAnyone: fields.includes("incident.toldAnyone") ? values.incident.toldAnyone : "No",
    toldPolice: fields.includes("incident.toldPolice") ? values.incident.toldPolice : "No",
  });
  const errors = {};
  for (const field of fields.filter((field) => field !== "evidence.files")) {
    const [section, key] = field.split(".");
    const error = section === "complainant" ? complainantErrors[key] : incidentErrors[key];
    if (error && field !== "incident.time") errors[field] = error;
  }
  return errors;
}

export function FollowUpFieldChecklist({
  selectedFields,
  onChange,
  disabled = false,
  groups = AMENDMENT_GROUPS,
}) {
  function toggle(group) {
    const selected = group.fields.every((field) => selectedFields.includes(field));
    onChange(
      selected
        ? selectedFields.filter((field) => !group.fields.includes(field))
        : [...new Set([...selectedFields, ...group.fields])]
    );
  }

  return (
    <div className={styles.checklist}>
      {groups.map((group) => (
        <label key={group.id} className={styles.checkOption}>
          <input
            type="checkbox"
            checked={group.fields.every((field) => selectedFields.includes(field))}
            onChange={() => toggle(group)}
            disabled={disabled}
          />
          <span>{group.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function FollowUpFieldEditor({
  fields,
  reportData,
  values: controlledValues,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = "Save corrections",
  showActions = true,
  allowEmpty = false,
}) {
  const original = useMemo(() => buildAmendmentValues(reportData), [reportData]);
  const [localValues, setLocalValues] = useState(original);
  const [errors, setErrors] = useState({});
  const values = controlledValues || localValues;

  function setValue(path, value) {
    const [section, key] = path.split(".");
    const next = {
      ...values,
      [section]: { ...values[section], [key]: value },
    };
    if (path === "incident.locationType" && value === "Online") next.incident.incidentCity = "";
    if (path === "incident.perpetratorKnown" && value === "No") {
      next.incident.perpetratorName = "";
      next.incident.perpetratorOccupation = "";
      next.incident.perpetratorRelationship = "";
      next.incident.perpetratorGender = "";
    }
    if (path === "incident.perpetratorKnown" && value === "Yes") {
      next.incident.perpetratorUnknownGender = "";
      next.incident.perpetratorUnknownAppearance = "";
    }
    if (path === "incident.witnesses" && value === "No") {
      next.incident.witnessName = "";
      next.incident.witnessContact = "";
      next.incident.witnessRelationship = "";
    }
    if (path === "incident.toldAnyone" && value === "No") next.incident.toldAnyoneWho = "";
    if (path === "incident.toldPolice" && value === "No") next.incident.policeStation = "";
    setErrors((current) => {
      const copy = { ...current };
      delete copy[path];
      return copy;
    });
    if (onChange) onChange(next);
    else setLocalValues(next);
  }

  function submit(event) {
    event?.preventDefault();
    const nextErrors = validateAmendmentFields(fields, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const changes = buildFieldChanges(fields, original, values);
    if (!changes.length && !allowEmpty) {
      setErrors({ _form: "Change at least one selected field before submitting." });
      return;
    }
    onSubmit?.(changes, values);
  }

  const field = (path) => {
    const value = getPathValue(values, path);
    const error = errors[path];
    const common = { value: value ?? "", error };
    switch (path) {
      case "complainant.contactNumber":
        return <Field label={FIELD_LABELS[path]} required hint="We will use this to reach you regarding your report." error={error}><Input type="tel" placeholder="+639XXXXXXXXX" {...common} onChange={(e) => setValue(path, normalisePhone(e.target.value))} /></Field>;
      case "complainant.email":
        return <Field label={FIELD_LABELS[path]} required hint="A confirmation and updates will be sent here." error={error}><Input type="email" placeholder="sample@gmail.com" {...common} onChange={(e) => setValue(path, e.target.value.trim())} /></Field>;
      case "incident.date":
        return <Field label={FIELD_LABELS[path]} required hint="When did the incident happen?" error={error}><Input type="date" max={todayInputValue()} {...common} onChange={(e) => setValue(path, e.target.value)} /></Field>;
      case "incident.time":
        return <Field label={FIELD_LABELS[path]} hint="Approximate time is fine if exact time is unknown." error={error}><Input type="time" max={values.incident.date === todayInputValue() ? currentTimeInputValue() : undefined} {...common} onChange={(e) => setValue(path, e.target.value)} /></Field>;
      case "incident.locationType":
      case "incident.perpetratorKnown":
      case "incident.witnesses":
      case "incident.toldAnyone":
      case "incident.toldPolice":
        return (
          <Field label={FIELD_LABELS[path]} required error={error}>
            <RadioGroup
              name={`amend-${path}`}
              options={path === "incident.locationType" ? ["Physical Location", "Online"] : ["Yes", "No"]}
              value={value || ""}
              onChange={(next) => setValue(path, next)}
              error={error}
            />
          </Field>
        );
      case "incident.incidentCity":
        return (
          <Field label={FIELD_LABELS[path]} required hint="Select the city or municipality where the incident occurred." error={error}>
            <Select {...common} onChange={(e) => setValue(path, e.target.value)}>
              <option value="">Select city / municipality</option>
              {NCR_CITIES.map((city) => <option key={city}>{city}</option>)}
            </Select>
          </Field>
        );
      case "incident.incidentVenue":
        return values.incident.locationType === "Physical Location" ? (
          <Field
            label={getFieldLabel(path, values.incident.locationType)}
            hint="Tell us a little about where this occurred."
            error={error}
          >
            <IncidentLocationTypeahead
              value={value || ""}
              city={values.incident.incidentCity || ""}
              onChange={(next) => setValue(path, next)}
            />
          </Field>
        ) : (
          <Field
            label={getFieldLabel(path, values.incident.locationType)}
            hint={values.incident.locationType === "Online"
              ? "Where did this incident occur online?"
              : undefined}
            error={error}
          >
            <Input
              {...common}
              placeholder={values.incident.locationType === "Online"
                ? "Facebook, Instagram, WhatsApp, email, gaming platform, website"
                : undefined}
              onChange={(e) => setValue(path, e.target.value)}
            />
          </Field>
        );
      case "incident.description":
        return (
          <Field label={FIELD_LABELS[path]} required hint="Describe the sequence of events clearly and factually." error={error}>
            <textarea className={styles.textarea} placeholder="Describe what happened, including relevant details such as individuals involved and the sequence of events." value={value || ""} rows={6} onChange={(e) => setValue(path, e.target.value)} />
          </Field>
        );
      case "incident.outcome":
        return (
          <Field label={FIELD_LABELS[path]} hint="Optional — let us know what resolution or support you are looking for.">
            <div className={styles.outcomeGrid}>
              {OUTCOME_OPTIONS.map((option) => (
                <label key={option}>
                  <input
                    type="checkbox"
                    checked={(value || []).includes(option)}
                    onChange={(e) => setValue(path, e.target.checked
                      ? [...(value || []), option]
                      : (value || []).filter((item) => item !== option))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </Field>
        );
      case "incident.perpetratorGender":
        return (
          <Field
            label={FIELD_LABELS[path]}
            required
            hint="What is the gender of the perpetrator?"
            error={error}
          >
            <Select {...common} onChange={(e) => setValue(path, e.target.value)}>
              <option value="">Select gender identity</option>
              <option>Male</option><option>Female</option><option>Non-binary</option>
              <option>Unknown / Prefer not to say</option>
            </Select>
          </Field>
        );
      case "incident.perpetratorUnknownGender":
        return (
          <Field
            label={FIELD_LABELS[path]}
            hint="Optional. Share only what you remember or feel comfortable noting."
            error={error}
          >
            <Select {...common} onChange={(e) => setValue(path, e.target.value)}>
              <option value="">Select if remembered</option>
              <option>Male</option><option>Female</option><option>Non-binary</option>
              <option>Unable to tell</option><option>Prefer not to say</option>
            </Select>
          </Field>
        );
      case "incident.perpetratorUnknownAppearance":
        return (
          <Field
            label={FIELD_LABELS[path]}
            hint="Optional. Any detail you remember may help, but it is okay to leave this blank."
            error={error}
          >
            <textarea
              className={styles.textarea}
              placeholder="Clothing, approximate age, build, height, voice, marks, or other details you remember"
              value={value || ""}
              rows={3}
              onChange={(e) => setValue(path, e.target.value)}
            />
          </Field>
        );
      case "incident.policeStation":
        return (
          <Field label={FIELD_LABELS[path]} hint="Start typing the station, precinct, or district name. Suggestions may appear as you type." error={error}>
            <PoliceStationTypeahead value={value || ""} onChange={(next) => setValue(path, next)} />
          </Field>
        );
      default:
        const fieldProps = {
          "incident.perpetratorName": { hint: "Full name if known.", placeholder: "Full name" },
          "incident.perpetratorOccupation": { hint: "What does the perpetrator do for a living?", placeholder: "Teacher, coach, relative, stranger" },
          "incident.perpetratorRelationship": { hint: "How do you know this person?", placeholder: "Classmate, supervisor, partner, unknown" },
          "incident.witnessName": { hint: "Full name if known.", placeholder: "Full name" },
          "incident.witnessContact": { hint: "What is the witness's contact information?", placeholder: "Phone number or email" },
          "incident.witnessRelationship": { hint: "How do you know this person?", placeholder: "Classmate, supervisor, partner, unknown" },
          "incident.toldAnyoneWho": { hint: "Share the person or role if you feel comfortable.", placeholder: "Mother, friend, guidance counselor" },
        }[path] || {};
        return (
          <Field
            label={FIELD_LABELS[path]}
            required={[
              "incident.perpetratorName",
              "incident.witnessName",
              "incident.witnessContact",
            ].includes(path)}
            hint={fieldProps.hint}
            error={error}
          >
            <Input {...common} placeholder={fieldProps.placeholder} onChange={(e) => setValue(path, e.target.value)} />
          </Field>
        );
    }
  };

  const visibleFields = fields.filter((path) => {
    if (path === "evidence.files") return false;
    if (path === "incident.incidentCity") return values.incident.locationType === "Physical Location";
    if (["incident.perpetratorName", "incident.perpetratorOccupation", "incident.perpetratorRelationship", "incident.perpetratorGender"].includes(path)) {
      return values.incident.perpetratorKnown === "Yes";
    }
    if (["incident.perpetratorUnknownGender", "incident.perpetratorUnknownAppearance"].includes(path)) {
      return values.incident.perpetratorKnown === "No";
    }
    if (["incident.witnessName", "incident.witnessContact", "incident.witnessRelationship"].includes(path)) {
      return values.incident.witnesses === "Yes";
    }
    if (path === "incident.toldAnyoneWho") return values.incident.toldAnyone === "Yes";
    if (path === "incident.policeStation") return values.incident.toldPolice === "Yes";
    return true;
  });

  const content = (
    <>
      <div className={styles.editorGrid}>{visibleFields.map((path) => <div key={path}>{field(path)}</div>)}</div>
      {errors._form && <div className={styles.formError}>{errors._form}</div>}
      {showActions && (
        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>
      )}
    </>
  );

  return showActions ? <form onSubmit={submit}>{content}</form> : <div>{content}</div>;
}
