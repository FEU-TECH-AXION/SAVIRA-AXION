"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { getCurrentLanguage, translateText } from "@/lib/i18n";

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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const INCIDENT_MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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


export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = Number.parseInt(month, 10);
  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) return 31;
  const safeYear = parsedYear || new Date().getFullYear();
  return new Date(safeYear, parsedMonth, 0).getDate();
}

export function splitIncidentDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { incidentYear: "", incidentMonth: "", incidentMonthText: "", incidentDay: "" };
  }
  const [year, month, day] = date.split("-");
  const normalizedMonth = String(Number.parseInt(month, 10));
  return {
    incidentYear: year,
    incidentMonth: normalizedMonth,
    incidentMonthText: INCIDENT_MONTH_OPTIONS.find((option) => option.value === normalizedMonth)?.label || "",
    incidentDay: String(Number.parseInt(day, 10)),
  };
}

export function buildIncidentDate(incident) {
  const year = Number.parseInt(incident.incidentYear, 10);
  const month = Number.parseInt(incident.incidentMonth, 10);
  const day = Number.parseInt(incident.incidentDay, 10);
  if (!year || !month || !day) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > getDaysInMonth(year, month)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isFutureIncident(incident, time) {
  const date = buildIncidentDate(incident);
  if (!date) return false;
  const incidentDateTime = new Date(`${date}T${time || "23:59"}`);
  if (Number.isNaN(incidentDateTime.getTime())) return false;
  return incidentDateTime > new Date();
}

export function getEarliestIncidentYear(age) {
  const parsedAge = Number.parseInt(age, 10);
  const currentYear = new Date().getFullYear();
  if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) return 1900;
  return currentYear - parsedAge;
}

function isPartialIncidentDateInFuture(incident) {
  const year = Number.parseInt(incident.incidentYear, 10);
  const month = Number.parseInt(incident.incidentMonth, 10);
  const day = Number.parseInt(incident.incidentDay, 10);
  const today = new Date();
  if (!year || Number.isNaN(year)) return false;
  if (year > today.getFullYear()) return true;
  if (year < today.getFullYear()) return false;
  if (!month || Number.isNaN(month)) return false;
  if (month > today.getMonth() + 1) return true;
  if (month < today.getMonth() + 1) return false;
  if (!day || Number.isNaN(day)) return false;
  return day > today.getDate();
}


const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const EMAIL_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const EMAIL_LINE_BREAK_REGEX = /[\r\n]/g;
const AGE_MIN = 13;
const AGE_MAX = 120;
const EMAIL_MAX_LENGTH = 254;
const SHORT_TEXT_MAX_LENGTH = 150;
const MEDIUM_TEXT_MAX_LENGTH = 300;
const LONG_TEXT_MAX_LENGTH = 1000;
const DESCRIPTION_MAX_LENGTH = 5000;

const REPORT_TYPE_OPTIONS = ["Me (Myself)", "Someone else"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const ORGANIZATION_OPTIONS = [
  "Boy Scouts of the Philippines (BSP)",
  "Girl Scouts of the Philippines (GSP)",
  "No Organization / Independent",
  "Others",
];
const ORGANIZATION_TYPE_OPTIONS = [
  "School / University",
  "Workplace / Company",
  "Government Agency",
  "Non-Governmental Organization",
  "Community / Youth Organization",
  "Religious Organization",
  "Online Community / Platform",
  "Other",
];
const LOCATION_TYPE_OPTIONS = ["Physical Location", "Online"];
const YES_NO_OPTIONS = ["Yes", "No"];
const PERPETRATOR_GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Unknown"];
const UNKNOWN_PERPETRATOR_GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Unable to tell"];

function tr(text, replacements) {
  if (typeof text !== "string") return text;
  return translateText(getCurrentLanguage(), text, replacements);
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function limitString(value, maxLength) {
  if (typeof value !== "string") return value;
  return value.slice(0, maxLength);
}

function normalizeEmail(value) {
  return trimString(value || "").toLowerCase();
}

function stripEmailLineBreaks(value) {
  return String(value || "").replace(EMAIL_LINE_BREAK_REGEX, "");
}

function getEmailValidationError(value) {
  const normalized = normalizeEmail(value);
  const atCount = (normalized.match(/@/g) || []).length;
  const [localPart = "", domainPart = ""] = normalized.split("@");

  if (!normalized) return "Email is required.";
  if (/[\r\n]/.test(String(value || ""))) {
    return "Email cannot contain line breaks.";
  }
  if (normalized.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  }
  if (localPart.length > 64) {
    return "Email local part must be 64 characters or fewer.";
  }
  if (atCount !== 1) return "Email must contain exactly one @ symbol.";
  if (!localPart) return "Email must include text before @.";
  if (!domainPart) return "Email must include a domain after @.";
  if (!domainPart.includes(".")) return "Email domain must include a top-level domain.";
  if (normalized.includes("..")) return "Email cannot contain consecutive dots.";
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return "Email local part cannot start or end with a dot.";
  }
  if (!EMAIL_REGEX.test(normalized)) {
    return "Enter a valid email address such as john+alerts@mail.company.co.uk.";
  }
  return "";
}

function sanitizeComplainant(data) {
  return {
    ...data,
    name: limitString(trimString(data.name) || "", SHORT_TEXT_MAX_LENGTH),
    age: trimString(data.age) || "",
    council: limitString(trimString(data.council) || "", SHORT_TEXT_MAX_LENGTH),
    orgName: limitString(trimString(data.orgName) || "", SHORT_TEXT_MAX_LENGTH),
    organizationTypeOther: limitString(trimString(data.organizationTypeOther) || "", SHORT_TEXT_MAX_LENGTH),
    contactNumber: trimString(data.contactNumber) || "",
    email: normalizeEmail(data.email),
  };
}

function sanitizeIncident(data) {
  return {
    ...data,
    incidentVenue: limitString(trimString(data.incidentVenue) || "", MEDIUM_TEXT_MAX_LENGTH),
    description: limitString(trimString(data.description) || "", DESCRIPTION_MAX_LENGTH),
    perpetratorName: limitString(trimString(data.perpetratorName) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorOccupation: limitString(trimString(data.perpetratorOccupation) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorRelationship: limitString(trimString(data.perpetratorRelationship) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorUnknownAppearance: limitString(trimString(data.perpetratorUnknownAppearance) || "", LONG_TEXT_MAX_LENGTH),
    witnessName: limitString(trimString(data.witnessName) || "", SHORT_TEXT_MAX_LENGTH),
    witnessContact: limitString(trimString(data.witnessContact) || "", SHORT_TEXT_MAX_LENGTH),
    witnessRelationship: limitString(trimString(data.witnessRelationship) || "", SHORT_TEXT_MAX_LENGTH),
    toldAnyoneWho: limitString(trimString(data.toldAnyoneWho) || "", SHORT_TEXT_MAX_LENGTH),
    policeStation: limitString(trimString(data.policeStation) || "", MEDIUM_TEXT_MAX_LENGTH),
  };
}

function isIntegerString(value) {
  return /^\d+$/.test(String(value).trim());
}

function isValidEmailOrPhone(value) {
  const trimmed = trimString(value) || "";
  if (!trimmed) return true;
  return !getEmailValidationError(trimmed) || PHONE_REGEX.test(normalisePhone(trimmed));
}

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


export function validateStep0(data) {
  const errors = {};
  const sanitized = sanitizeComplainant(data);

  if (!REPORT_TYPE_OPTIONS.includes(sanitized.reporteeType)) errors.reporteeType = "Please select who this report is about.";

  const age = Number(sanitized.age);
  if (!sanitized.age) {
    errors.age = "Age is required.";
  } else if (!isIntegerString(sanitized.age) || !Number.isInteger(age)) {
    errors.age = "Age must be a whole number.";
  } else if (age < AGE_MIN || age > AGE_MAX) {
    errors.age = `Enter an age from ${AGE_MIN} to ${AGE_MAX}.`;
  }

  if (!GENDER_OPTIONS.includes(sanitized.gender)) errors.gender = "Gender identity is required.";

  if (!sanitized.contactNumber) {
    errors.contactNumber = "Contact number is required.";
  } else if (!PHONE_REGEX.test(sanitized.contactNumber)) {
    errors.contactNumber = "Enter a valid Philippine mobile number.";
  }

  const emailError = getEmailValidationError(data.email);
  if (emailError) errors.email = emailError;

  if (!ORGANIZATION_OPTIONS.includes(sanitized.organization)) errors.organization = "Organization is required.";

  const isScoutOrg =
    sanitized.organization === "Boy Scouts of the Philippines (BSP)" ||
    sanitized.organization === "Girl Scouts of the Philippines (GSP)";
  const isIndependent = sanitized.organization === "No Organization / Independent";

  if (isScoutOrg) {
    if (!sanitized.council) errors.council = "Council is required.";
    else if (sanitized.council.length > SHORT_TEXT_MAX_LENGTH) {
      errors.council = `Council must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (sanitized.organization === "Others") {
    if (!ORGANIZATION_TYPE_OPTIONS.includes(sanitized.organizationType)) errors.organizationType = "Organization type is required.";
    if (sanitized.organizationType === "Other" && sanitized.organizationTypeOther.length > SHORT_TEXT_MAX_LENGTH) {
      errors.organizationTypeOther = `Organization type must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
    }

    const hasAffiliation =
      sanitized.organizationType && sanitized.organizationType !== "No Organization / Independent";

    if (hasAffiliation) {
      if (!sanitized.orgName) errors.orgName = "Organization name is required.";
      else if (sanitized.orgName.length > SHORT_TEXT_MAX_LENGTH) {
        errors.orgName = `Organization name must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
      }
      if (!NCR_CITIES.includes(sanitized.orgCity)) errors.orgCity = "Organization city is required.";
    }
  }

  if ((sanitized.organization === "Others" || isIndependent) && !NCR_CITIES.includes(sanitized.userCity)) {
    errors.userCity = "Your city/municipality is required.";
  }

  return errors;
}

export function validateStep1(data, complainantAge) {
  const errors = {};
  const sanitized = sanitizeIncident(data);

  const currentYear = new Date().getFullYear();
  const earliestYear = getEarliestIncidentYear(complainantAge);
  const incidentYear = Number.parseInt(sanitized.incidentYear, 10);
  const incidentMonth = Number.parseInt(sanitized.incidentMonth, 10);
  const incidentDay = Number.parseInt(sanitized.incidentDay, 10);

  if (!sanitized.incidentYear) {
    errors.incidentYear = "Incident year is required.";
  } else if (
    !isIntegerString(sanitized.incidentYear) ||
    Number.isNaN(incidentYear) ||
    incidentYear < earliestYear ||
    incidentYear > currentYear
  ) {
    errors.incidentYear = `Enter a valid year from ${earliestYear} to ${currentYear}.`;
  }

  if (sanitized.incidentMonthText && !sanitized.incidentMonth) {
    errors.incidentMonth = "Choose a month from the suggestions.";
  } else if (sanitized.incidentMonth && (!isIntegerString(sanitized.incidentMonth) || Number.isNaN(incidentMonth) || incidentMonth < 1 || incidentMonth > 12)) {
    errors.incidentMonth = "Enter a valid month.";
  }

  if (sanitized.incidentDay && !sanitized.incidentMonth) {
    errors.incidentMonth = "Choose a month if you include a date.";
  }

  if (sanitized.incidentDay && (!isIntegerString(sanitized.incidentDay) || Number.isNaN(incidentDay) || incidentDay < 1 || incidentDay > 31)) {
    errors.incidentDay = "Enter a valid date.";
  }

  if (sanitized.incidentMonth && sanitized.incidentDay && incidentYear) {
    const daysInMonth = getDaysInMonth(incidentYear, incidentMonth);
    if (incidentDay > daysInMonth) {
      errors.incidentDay = "Enter a valid date for the selected month and year.";
    }
  }

  if (sanitized.incidentYear && (isPartialIncidentDateInFuture(sanitized) || isFutureIncident(sanitized, sanitized.time))) {
    errors.incidentYear = "The incident date and time cannot be in the future.";
    if (sanitized.time) errors.time = "The incident time cannot be in the future for the selected date.";
  }
  if (!LOCATION_TYPE_OPTIONS.includes(sanitized.locationType))
    errors.locationType = "Please let us know whether this happened in person or online — this helps us understand the nature of the incident.";

  if (sanitized.locationType === "Physical Location") {
    if (!NCR_CITIES.includes(sanitized.incidentCity))
      errors.incidentCity = "Please select the city or municipality where this took place — this helps us connect you with the right local support.";
  }

  if (sanitized.incidentVenue.length > MEDIUM_TEXT_MAX_LENGTH) {
    errors.incidentVenue = `Location details must be ${MEDIUM_TEXT_MAX_LENGTH} characters or fewer.`;
  }

  if (!sanitized.description) {
    errors.description = "Please share what happened — even a few words can help us understand your situation.";
  } else if (sanitized.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  } else {
    const wordCount = sanitized.description.split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      errors.description = `We want to make sure we fully understand what you went through. Could you share a little more? At least 50 words is recommended`;
    }
  }

  if (!YES_NO_OPTIONS.includes(sanitized.perpetratorKnown))
    errors.perpetratorKnown = "Please let us know if you recognise who did this — even partial information can help us take the right steps to support you.";

  if (!YES_NO_OPTIONS.includes(sanitized.witnesses))
    errors.witnesses = "Please indicate if anyone else was present — witnesses can play an important role in strengthening your case.";

  if (!YES_NO_OPTIONS.includes(sanitized.toldAnyone))
    errors.toldAnyone = "Please let us know if you've spoken to anyone about this — it helps us understand what support you may already have around you.";

  if (!YES_NO_OPTIONS.includes(sanitized.toldPolice))
    errors.toldPolice = "Please let us know if the police have been informed — this helps us coordinate the appropriate next steps for your case.";

  if (sanitized.perpetratorUnknownGender && !UNKNOWN_PERPETRATOR_GENDER_OPTIONS.includes(sanitized.perpetratorUnknownGender)) {
    errors.perpetratorUnknownGender = "Select a valid gender option.";
  }
  if (sanitized.perpetratorOccupation.length > SHORT_TEXT_MAX_LENGTH) {
    errors.perpetratorOccupation = `Occupation must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.perpetratorRelationship.length > SHORT_TEXT_MAX_LENGTH) {
    errors.perpetratorRelationship = `Relationship must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.perpetratorUnknownAppearance.length > LONG_TEXT_MAX_LENGTH) {
    errors.perpetratorUnknownAppearance = `Appearance details must be ${LONG_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.witnessName.length > SHORT_TEXT_MAX_LENGTH) {
    errors.witnessName = `Witness name must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.witnessContact && !isValidEmailOrPhone(sanitized.witnessContact)) {
    errors.witnessContact = "Enter a valid witness email or Philippine mobile number.";
  }
  if (sanitized.witnessRelationship.length > SHORT_TEXT_MAX_LENGTH) {
    errors.witnessRelationship = `Witness relationship must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.toldAnyoneWho.length > SHORT_TEXT_MAX_LENGTH) {
    errors.toldAnyoneWho = `This field must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (sanitized.policeStation.length > MEDIUM_TEXT_MAX_LENGTH) {
    errors.policeStation = `Police station must be ${MEDIUM_TEXT_MAX_LENGTH} characters or fewer.`;
  }

  if (sanitized.perpetratorKnown === "Yes") {
    if (!sanitized.perpetratorName)
      errors.perpetratorName = "If you know their name, please share it — this helps us properly document who was involved.";
    else if (sanitized.perpetratorName.length > SHORT_TEXT_MAX_LENGTH) {
      errors.perpetratorName = `Name must be ${SHORT_TEXT_MAX_LENGTH} characters or fewer.`;
    }
    if (!PERPETRATOR_GENDER_OPTIONS.includes(sanitized.perpetratorGender))
      errors.perpetratorGender = "Please share the perpetrator's gender as you perceive it — this helps us complete the incident record accurately.";
  }

  return errors;
}


export function createReportFormFields(classes = {}) {
  function Field({ label, children, required, hint, error }) {
    return (
      <div className={classes.field}>
        <label className={classes.fieldLabel}>
          {tr(label)}
          {required && <span className={classes.required}>*</span>}
        </label>
        {children}
        {hint && !error && <p className={classes.fieldHint}>{tr(hint)}</p>}
        {error && <p className={classes.fieldError}>{tr(error)}</p>}
      </div>
    );
  }

  function Input({ error, ...props }) {
    return (
      <input
        className={`${classes.input || ""} ${error ? classes.inputError || "" : ""}`}
        data-error={error ? "true" : "false"}
        {...props}
        placeholder={tr(props.placeholder)}
      />
    );
  }

  function Select({ children, error, ...props }) {
    const translatedChildren = Children.map(children, (child) => {
      if (!isValidElement(child) || child.type !== "option") return child;
      const optionChildren = child.props.children;
      if (typeof optionChildren !== "string") return child;
      return cloneElement(child, {}, tr(optionChildren));
    });

    return (
      <select
        className={`${classes.select || ""} ${error ? classes.inputError || "" : ""}`}
        data-error={error ? "true" : "false"}
        {...props}
      >
        {translatedChildren}
      </select>
    );
  }

  function RadioGroup({ name, options, value, onChange, error }) {
    return (
      <div className={`${classes.radioGroup || ""} ${error ? classes.radioGroupError || "" : ""}`}>
        {options.map((opt) => (
          <label key={opt} className={classes.radioLabel}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className={classes.radioInput}
            />
            {tr(opt)}
          </label>
        ))}
      </div>
    );
  }

  function PoliceStationTypeahead({ value, onChange }) {
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
    <div className={classes.typeahead}>
      <Input
        placeholder={tr("Search for the police station or precinct")}
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
        <div id="police-station-suggestions" className={classes.suggestionsList} role="listbox">
          {suggestions.map((feature, index) => (
            <button
              id={`police-station-suggestion-${index}`}
              type="button"
              className={`${classes.suggestionItem || ""} ${activeIndex === index ? classes.suggestionItemActive || "" : ""}`}
              key={feature.id}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(feature)}
            >
              <span className={classes.suggestionName}>{feature.text}</span>
              <span className={classes.suggestionAddress}>{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
      {isTyping && status === "loading" && <p className={classes.fieldHint}>{tr("Looking for nearby police station matches...")}</p>}
      {isTyping && status === "local" && <p className={classes.fieldHint}>{tr("Showing local suggestions. You can still type the exact station name if it is not listed.")}</p>}
      {isTyping && status === "empty" && <p className={classes.fieldHint}>{tr("No suggestions found yet. You can still type the station name you know.")}</p>}
      {isTyping && status === "error" && <p className={classes.fieldHint}>{tr("Suggestions are unavailable right now. You can still type the station name.")}</p>}
    </div>
  );
}



  function IncidentLocationTypeahead({ value, onChange, city }) {
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
    <div className={classes.typeahead}>
      <Input
        placeholder={tr("Barangay hall, school, park, landmark, or address")}
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
        <div id="incident-location-suggestions" className={classes.suggestionsList} role="listbox">
          {suggestions.map((feature, index) => (
            <button
              id={`incident-location-suggestion-${index}`}
              type="button"
              className={`${classes.suggestionItem || ""} ${activeIndex === index ? classes.suggestionItemActive || "" : ""}`}
              key={feature.id}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(feature)}
            >
              <span className={classes.suggestionName}>{feature.text}</span>
              <span className={classes.suggestionAddress}>{feature.place_name}</span>
            </button>
          ))}
        </div>
      )}
      {isTyping && status === "loading" && (
        <p className={classes.fieldHint}>{tr("Finding location suggestions...")}</p>
      )}
      {isTyping && status === "empty" && (
        <p className={classes.fieldHint}>{tr("No suggestions found. You can still enter the location manually.")}</p>
      )}
      {isTyping && (status === "error" || status === "missingToken") && (
        <p className={classes.fieldHint}>{tr("Suggestions are unavailable. You can still enter the location manually.")}</p>
      )}
    </div>
  );
}



  return { Field, Input, Select, RadioGroup, PoliceStationTypeahead, IncidentLocationTypeahead };
}

export const {
  Field,
  Input,
  Select,
  RadioGroup,
  PoliceStationTypeahead,
  IncidentLocationTypeahead,
} = createReportFormFields();
