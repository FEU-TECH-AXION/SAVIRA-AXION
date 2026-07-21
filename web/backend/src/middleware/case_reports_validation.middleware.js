const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong",
  "Manila", "Marikina", "Muntinlupa", "Navotas", "Parañaque",
  "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan",
  "Taguig", "Valenzuela",
];

const AGE_MIN = 13;
const AGE_MAX = 120;
const EMAIL_MAX_LENGTH = 254;
const SHORT_TEXT_MAX_LENGTH = 150;
const MEDIUM_TEXT_MAX_LENGTH = 300;
const LONG_TEXT_MAX_LENGTH = 1000;
const DESCRIPTION_MAX_LENGTH = 5000;

const VALID_REPORT_TYPES = ["Me (Myself)", "Someone else"];
const VALID_ORGS = [
  "Boy Scouts of the Philippines (BSP)",
  "Girl Scouts of the Philippines (GSP)",
  "No Organization / Independent",
  "Others",
];
const VALID_GENDERS = ["Male", "Female", "LGBTQIA+ member"];
const VALID_ORG_TYPES = [
  "School / University",
  "Workplace / Company",
  "Government Agency",
  "Non-Governmental Organization",
  "Community / Youth Organization",
  "Religious Organization",
  "Online Community / Platform",
  "Other",
];
const VALID_LOCATION_TYPES = ["Physical Location", "Online"];
const VALID_YES_NO = ["Yes", "No"];
const VALID_PERPETRATOR_GENDERS = ["Male", "Female", "Unable to tell"];
const VALID_UNKNOWN_PERPETRATOR_GENDERS = ["Male", "Female", "Unable to tell"];
const VALID_OUTCOMES = [
  "Safety planning and support",
  "Counseling or psychosocial support",
  "Legal advice",
  "Referral to police or another agency",
  "Financial support",
  "Documentation only",
  "I am not sure yet",
  "Others",
];

const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const EMAIL_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function trimString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeEmail(value) {
  return trimString(value || "").toLowerCase();
}

function limitString(value, maxLength) {
  if (typeof value !== "string") return value;
  return value.slice(0, maxLength);
}

function isIntegerString(value) {
  return /^\d+$/.test(String(value).trim());
}

function getDaysInMonth(year, month) {
  return new Date(year || new Date().getFullYear(), month, 0).getDate();
}

function parseJsonField(req, fieldName, errors) {
  const raw = req.body?.[fieldName];
  if (!raw) {
    errors[fieldName] = `${fieldName[0].toUpperCase()}${fieldName.slice(1)} data is required.`;
    return null;
  }
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") {
    errors[fieldName] = `${fieldName[0].toUpperCase()}${fieldName.slice(1)} data is invalid.`;
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors[fieldName] = `${fieldName[0].toUpperCase()}${fieldName.slice(1)} data is invalid.`;
      return null;
    }
    return parsed;
  } catch {
    errors[fieldName] = `${fieldName[0].toUpperCase()}${fieldName.slice(1)} data must be valid JSON.`;
    return null;
  }
}

function addMaxLengthError(errors, key, value, maxLength, label) {
  if (typeof value === "string" && value.trim().length > maxLength) {
    errors[key] = `${label} must be ${maxLength} characters or fewer.`;
  }
}

function getEmailValidationError(value) {
  const raw = String(value || "");
  const normalized = normalizeEmail(raw);
  const atCount = (normalized.match(/@/g) || []).length;
  const [localPart = "", domainPart = ""] = normalized.split("@");

  if (!normalized) return "Email is required.";
  if (/[\r\n]/.test(raw)) return "Email cannot contain line breaks.";
  if (normalized.length > EMAIL_MAX_LENGTH) return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  if (localPart.length > 64) return "Email local part must be 64 characters or fewer.";
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

function normalisePhone(raw) {
  let digits = String(raw || "").replace(/[^\d]/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
}

function isValidEmailOrPhone(value) {
  const trimmed = trimString(value) || "";
  if (!trimmed) return true;
  return !getEmailValidationError(trimmed) || PHONE_REGEX.test(normalisePhone(trimmed));
}

function normalizeOutcomeSelection(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function isPartialIncidentDateInFuture(year, month, day) {
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

function buildIncidentDate(incident) {
  const year = Number.parseInt(incident.incidentYear ?? incident.incident_year, 10);
  const month = Number.parseInt(incident.incidentMonth ?? incident.incident_month, 10);
  const day = Number.parseInt(incident.incidentDay ?? incident.incident_day, 10);
  if (!year || !month || !day) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > getDaysInMonth(year, month)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isFutureIncident(incident) {
  const date = incident.date || buildIncidentDate(incident);
  if (!date) return false;
  const incidentDateTime = new Date(`${date}T${incident.time || "23:59"}`);
  if (Number.isNaN(incidentDateTime.getTime())) return false;
  return incidentDateTime > new Date();
}

function sanitizeComplainant(complainant) {
  return {
    ...complainant,
    name: limitString(trimString(complainant.name) || "", SHORT_TEXT_MAX_LENGTH),
    age: trimString(complainant.age) || "",
    council: limitString(trimString(complainant.council) || "", SHORT_TEXT_MAX_LENGTH),
    orgName: limitString(trimString(complainant.orgName) || "", SHORT_TEXT_MAX_LENGTH),
    organizationTypeOther: limitString(trimString(complainant.organizationTypeOther) || "", SHORT_TEXT_MAX_LENGTH),
    contactNumber: trimString(complainant.contactNumber) || "",
    email: normalizeEmail(complainant.email),
  };
}

function sanitizeIncident(incident) {
  return {
    ...incident,
    incidentVenue: limitString(trimString(incident.incidentVenue) || "", MEDIUM_TEXT_MAX_LENGTH),
    description: limitString(trimString(incident.description) || "", DESCRIPTION_MAX_LENGTH),
    perpetratorName: limitString(trimString(incident.perpetratorName) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorOccupation: limitString(trimString(incident.perpetratorOccupation) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorRelationship: limitString(trimString(incident.perpetratorRelationship) || "", SHORT_TEXT_MAX_LENGTH),
    perpetratorUnknownAppearance: limitString(trimString(incident.perpetratorUnknownAppearance) || "", LONG_TEXT_MAX_LENGTH),
    witnessName: limitString(trimString(incident.witnessName) || "", SHORT_TEXT_MAX_LENGTH),
    witnessContact: limitString(trimString(incident.witnessContact) || "", SHORT_TEXT_MAX_LENGTH),
    witnessRelationship: limitString(trimString(incident.witnessRelationship) || "", SHORT_TEXT_MAX_LENGTH),
    toldAnyoneWho: limitString(trimString(incident.toldAnyoneWho) || "", SHORT_TEXT_MAX_LENGTH),
    policeStation: limitString(trimString(incident.policeStation) || "", MEDIUM_TEXT_MAX_LENGTH),
  };
}

function validateComplainant(rawComplainant) {
  const errors = {};
  const complainant = sanitizeComplainant(rawComplainant);
  const age = Number(complainant.age);

  if (!VALID_REPORT_TYPES.includes(complainant.reporteeType)) {
    errors.reporteeType = "Please select who this report is about.";
  }
  if (!complainant.age) {
    errors.age = "Age is required.";
  } else if (!isIntegerString(complainant.age) || !Number.isInteger(age)) {
    errors.age = "Age must be a whole number.";
  } else if (age < AGE_MIN || age > AGE_MAX) {
    errors.age = `Enter an age from ${AGE_MIN} to ${AGE_MAX}.`;
  }
  if (!VALID_GENDERS.includes(complainant.gender)) {
    errors.gender = "Gender identity is required.";
  }
  if (!complainant.contactNumber) {
    errors.contactNumber = "Contact number is required.";
  } else if (!PHONE_REGEX.test(complainant.contactNumber)) {
    errors.contactNumber = "Enter a valid Philippine mobile number.";
  }

  const emailError = getEmailValidationError(rawComplainant.email);
  if (emailError) errors.email = emailError;

  if (!VALID_ORGS.includes(complainant.organization)) {
    errors.organization = "Organization is required.";
  }

  const isScoutOrg =
    complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
    complainant.organization === "Girl Scouts of the Philippines (GSP)";
  const isIndependent = complainant.organization === "No Organization / Independent";

  if (isScoutOrg && !complainant.council) {
    errors.council = "Council is required.";
  }
  addMaxLengthError(errors, "council", rawComplainant.council, SHORT_TEXT_MAX_LENGTH, "Council");

  if (complainant.organization === "Others") {
    if (!VALID_ORG_TYPES.includes(complainant.organizationType)) {
      errors.organizationType = "Organization type is required.";
    }
    addMaxLengthError(errors, "organizationTypeOther", rawComplainant.organizationTypeOther, SHORT_TEXT_MAX_LENGTH, "Organization type");

    if (complainant.organizationType) {
      if (!complainant.orgName) {
        errors.orgName = "Organization name is required.";
      }
      addMaxLengthError(errors, "orgName", rawComplainant.orgName, SHORT_TEXT_MAX_LENGTH, "Organization name");
      if (!NCR_CITIES.includes(complainant.orgCity)) {
        errors.orgCity = "Organization city is required.";
      }
    }
  }

  if ((complainant.organization === "Others" || isIndependent) && !NCR_CITIES.includes(complainant.userCity)) {
    errors.userCity = "Your city/municipality is required.";
  }

  if (!VALID_YES_NO.includes(complainant.interview)) {
    errors.interview = "Please let us know whether you are willing to be interviewed.";
  }

  return { errors, complainant };
}

function validateIncident(rawIncident, complainantAge) {
  const errors = {};
  const incident = sanitizeIncident(rawIncident);
  const currentYear = new Date().getFullYear();
  const earliestYear = currentYear - Number(complainantAge || AGE_MIN);
  const incidentYearValue = incident.incident_year ?? incident.incidentYear;
  const incidentMonthValue = incident.incident_month ?? incident.incidentMonth;
  const incidentDayValue = incident.incident_day ?? incident.incidentDay;
  const incidentYear = Number.parseInt(incidentYearValue, 10);
  const incidentMonth = Number.parseInt(incidentMonthValue, 10);
  const incidentDay = Number.parseInt(incidentDayValue, 10);

  if (!incidentYearValue) {
    errors.incidentYear = "Incident year is required.";
  } else if (
    !isIntegerString(incidentYearValue) ||
    Number.isNaN(incidentYear) ||
    incidentYear < earliestYear ||
    incidentYear > currentYear
  ) {
    errors.incidentYear = `Enter a valid year from ${earliestYear} to ${currentYear}.`;
  }

  if (incident.incidentMonthText && !incidentMonthValue) {
    errors.incidentMonth = "Choose a month from the suggestions.";
  } else if (
    incidentMonthValue &&
    (!isIntegerString(incidentMonthValue) || Number.isNaN(incidentMonth) || incidentMonth < 1 || incidentMonth > 12)
  ) {
    errors.incidentMonth = "Enter a valid month.";
  }

  if (incidentDayValue && !incidentMonthValue) {
    errors.incidentMonth = "Choose a month if you include a date.";
  }
  if (
    incidentDayValue &&
    (!isIntegerString(incidentDayValue) || Number.isNaN(incidentDay) || incidentDay < 1 || incidentDay > 31)
  ) {
    errors.incidentDay = "Enter a valid date.";
  }
  if (incidentMonthValue && incidentDayValue && incidentYear && incidentDay > getDaysInMonth(incidentYear, incidentMonth)) {
    errors.incidentDay = "Enter a valid date for the selected month and year.";
  }
  if (incidentYearValue && (isPartialIncidentDateInFuture(incidentYear, incidentMonth, incidentDay) || isFutureIncident(incident))) {
    errors.incidentYear = "The incident date and time cannot be in the future.";
    if (incident.time) errors.time = "The incident time cannot be in the future for the selected date.";
  }

  if (!VALID_LOCATION_TYPES.includes(incident.locationType)) {
    errors.locationType = "Please let us know whether this happened in person or online.";
  }
  if (incident.locationType === "Physical Location" && !NCR_CITIES.includes(incident.incidentCity)) {
    errors.incidentCity = "Please select the city or municipality where this took place.";
  }
  addMaxLengthError(errors, "incidentVenue", rawIncident.incidentVenue, MEDIUM_TEXT_MAX_LENGTH, "Location details");

  if (!incident.description) {
    errors.description = "Please share what happened.";
  } else if (String(rawIncident.description || "").trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  } else if (incident.description.split(/\s+/).filter(Boolean).length < 50) {
    errors.description = "Please share at least 50 words about what happened.";
  }

  const outcomeValues = normalizeOutcomeSelection(incident.outcome);
  if (outcomeValues.some((outcome) => !VALID_OUTCOMES.includes(outcome))) {
    errors.outcome = "Select a valid requested outcome.";
  }

  if (!VALID_YES_NO.includes(incident.perpetratorKnown)) {
    errors.perpetratorKnown = "Please let us know if you recognise who did this.";
  }
  if (incident.perpetratorKnown === "Yes") {
    if (!incident.perpetratorName) errors.perpetratorName = "Perpetrator name is required.";
    if (!VALID_PERPETRATOR_GENDERS.includes(incident.perpetratorGender)) {
      errors.perpetratorGender = "Please select a valid perpetrator gender.";
    }
  }
  if (
    incident.perpetratorUnknownGender &&
    !VALID_UNKNOWN_PERPETRATOR_GENDERS.includes(incident.perpetratorUnknownGender)
  ) {
    errors.perpetratorUnknownGender = "Select a valid gender option.";
  }

  addMaxLengthError(errors, "perpetratorName", rawIncident.perpetratorName, SHORT_TEXT_MAX_LENGTH, "Name");
  addMaxLengthError(errors, "perpetratorOccupation", rawIncident.perpetratorOccupation, SHORT_TEXT_MAX_LENGTH, "Occupation");
  addMaxLengthError(errors, "perpetratorRelationship", rawIncident.perpetratorRelationship, SHORT_TEXT_MAX_LENGTH, "Relationship");
  addMaxLengthError(errors, "perpetratorUnknownAppearance", rawIncident.perpetratorUnknownAppearance, LONG_TEXT_MAX_LENGTH, "Appearance details");

  if (!VALID_YES_NO.includes(incident.witnesses)) {
    errors.witnesses = "Please indicate if there are witnesses.";
  }
  addMaxLengthError(errors, "witnessName", rawIncident.witnessName, SHORT_TEXT_MAX_LENGTH, "Witness name");
  addMaxLengthError(errors, "witnessContact", rawIncident.witnessContact, SHORT_TEXT_MAX_LENGTH, "Witness contact");
  if (incident.witnessContact && !isValidEmailOrPhone(incident.witnessContact)) {
    errors.witnessContact = "Enter a valid witness email or Philippine mobile number.";
  }
  addMaxLengthError(errors, "witnessRelationship", rawIncident.witnessRelationship, SHORT_TEXT_MAX_LENGTH, "Witness relationship");

  if (!VALID_YES_NO.includes(incident.toldAnyone)) {
    errors.toldAnyone = "Please indicate if you told anyone.";
  }
  addMaxLengthError(errors, "toldAnyoneWho", rawIncident.toldAnyoneWho, SHORT_TEXT_MAX_LENGTH, "This field");

  if (!VALID_YES_NO.includes(incident.toldPolice)) {
    errors.toldPolice = "Please indicate if you told the police.";
  }
  addMaxLengthError(errors, "policeStation", rawIncident.policeStation, MEDIUM_TEXT_MAX_LENGTH, "Police station");

  return { errors, incident };
}

function validateEvidence(rawEvidence) {
  const errors = {};
  if (!rawEvidence) return { errors, evidence: {} };
  if (typeof rawEvidence !== "object" || Array.isArray(rawEvidence)) {
    errors.evidence = "Evidence data is invalid.";
    return { errors, evidence: {} };
  }
  return {
    errors,
    evidence: {
      ...rawEvidence,
      anonymous: Boolean(rawEvidence.anonymous),
    },
  };
}

function validateCaseReport(req, res, next) {
  const parseErrors = {};
  const complainantRaw = parseJsonField(req, "complainant", parseErrors);
  const incidentRaw = parseJsonField(req, "incident", parseErrors);
  const evidenceRaw = req.body?.evidence ? parseJsonField(req, "evidence", parseErrors) : {};

  if (Object.keys(parseErrors).length > 0) {
    return res.status(400).json({ error: "Validation failed.", errors: parseErrors });
  }

  const { errors: complainantErrors, complainant } = validateComplainant(complainantRaw);
  const { errors: incidentErrors, incident } = validateIncident(incidentRaw, complainant.age);
  const { errors: evidenceErrors, evidence } = validateEvidence(evidenceRaw);
  const errors = {
    ...complainantErrors,
    ...incidentErrors,
    ...evidenceErrors,
  };

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: "Validation failed.", errors });
  }

  const incidentYear = Number.parseInt(incident.incidentYear ?? incident.incident_year, 10);
  const incidentMonth = incident.incidentMonth ?? incident.incident_month;
  const incidentDay = incident.incidentDay ?? incident.incident_day;
  const normalizedIncident = {
    ...incident,
    date: buildIncidentDate(incident),
    incident_year: incidentYear || null,
    incident_month: incidentMonth ? Number.parseInt(incidentMonth, 10) : null,
    incident_day: incidentDay ? Number.parseInt(incidentDay, 10) : null,
  };

  req.body.complainant = JSON.stringify(complainant);
  req.body.incident = JSON.stringify(normalizedIncident);
  req.body.evidence = JSON.stringify(evidence);

  next();
}

module.exports = { validateCaseReport };
