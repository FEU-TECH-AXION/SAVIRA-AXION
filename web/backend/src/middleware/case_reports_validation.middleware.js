const { body, validationResult } = require('express-validator');

const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong",
  "Manila", "Marikina", "Muntinlupa", "Navotas", "Parañaque",
  "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan",
  "Taguig", "Valenzuela",
];

const VALID_ORGS       = ["Boy Scouts of the Philippines (BSP)", "Girl Scouts of the Philippines (GSP)", "No Organization / Independent", "Others"];
const VALID_GENDERS    = ["Male", "Female", "Non-binary", "Prefer not to say"];
const PHONE_REGEX      = /^(?:\+63|0)9\d{9}$/;
const EMAIL_REGEX      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDaysInMonth(year, month) {
  return new Date(year || new Date().getFullYear(), month, 0).getDate();
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

function validateCaseReport(req, res, next) {
  const { complainant, incident } = req.body;
  const errors = [];

  // ── Complainant ───────────────────────────────────────────
  if (!complainant)                         return res.status(400).json({ error: 'Complainant data is required.' });

  const age = parseInt(complainant.age);
  if (!complainant.age || isNaN(age) || age < 1 || age > 120)
    errors.push('A valid age is required.');

  if (!VALID_GENDERS.includes(complainant.gender))
    errors.push('A valid gender identity is required.');

  if (!complainant.contactNumber || !PHONE_REGEX.test(complainant.contactNumber))
    errors.push('A valid Philippine mobile number is required (09XXXXXXXXX or +639XXXXXXXXX).');

  if (!complainant.email || !EMAIL_REGEX.test(complainant.email))
    errors.push('A valid email address is required.');

  if (!['Yes', 'No'].includes(complainant.interview))
    errors.push('Consent to interview is required.');

  if (!VALID_ORGS.includes(complainant.organization))
    errors.push('A valid organization is required.');

  // ── Organization-specific ─────────────────────────────────
  const isScoutOrg =
    complainant.organization === "Boy Scouts of the Philippines (BSP)" ||
    complainant.organization === "Girl Scouts of the Philippines (GSP)";
  const isIndependent = complainant.organization === 'No Organization / Independent';

  if (isScoutOrg && !complainant.council?.trim())
    errors.push('Council is required for Scout organizations.');

  if (complainant.organization === 'Others') {
    if (!complainant.organizationType?.trim())
      errors.push('Organization type is required.');

    const hasAffiliation = complainant.organizationType &&
      complainant.organizationType !== 'No Organization / Independent';

    if (hasAffiliation) {
      if (!complainant.orgName?.trim()) errors.push('Organization name is required.');
      if (!NCR_CITIES.includes(complainant.orgCity)) errors.push('A valid organization city is required.');
    }

    if (!NCR_CITIES.includes(complainant.userCity))
      errors.push('A valid city/municipality is required for your location.');
  }

  if (isIndependent && !NCR_CITIES.includes(complainant.userCity))
    errors.push('A valid city/municipality is required for your location.');

  // ── Incident ──────────────────────────────────────────────
  if (!incident)                            return res.status(400).json({ error: 'Incident data is required.' });

  const incidentYear = Number.parseInt(incident.incident_year ?? incident.incidentYear, 10);
  const incidentMonth = incident.incident_month ?? incident.incidentMonth;
  const incidentDay = incident.incident_day ?? incident.incidentDay;
  const parsedMonth = Number.parseInt(incidentMonth, 10);
  const parsedDay = Number.parseInt(incidentDay, 10);
  const currentYear = new Date().getFullYear();
  const earliestYear = Number.isNaN(age) ? 1900 : currentYear - age;

  if (!incidentYear || Number.isNaN(incidentYear) || incidentYear < earliestYear || incidentYear > currentYear)
    errors.push(`A valid incident year from ${earliestYear} to ${currentYear} is required.`);
  if (incidentMonth && (Number.isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12))
    errors.push('A valid incident month is required.');
  if (incidentDay && !incidentMonth)
    errors.push('Incident month is required when incident date is provided.');
  if (incidentDay && (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31))
    errors.push('A valid incident date is required.');
  if (incidentMonth && incidentDay && incidentYear && parsedDay > getDaysInMonth(incidentYear, parsedMonth))
    errors.push('A valid incident date for the selected month and year is required.');
  if (isPartialIncidentDateInFuture(incidentYear, parsedMonth, parsedDay))
    errors.push('Incident date cannot be in the future.');
  if (incident.date && incident.time) {
    const incidentDateTime = new Date(`${incident.date}T${incident.time}`);
    if (!Number.isNaN(incidentDateTime.getTime()) && incidentDateTime > new Date())
      errors.push('Incident date and time cannot be in the future.');
  }
  if (!NCR_CITIES.includes(incident.incidentCity)) errors.push('A valid incident city is required.');
  if (!incident.description?.trim())        errors.push('Incident description is required.');

  if (!['Yes', 'No'].includes(incident.perpetratorKnown))
    errors.push('Please indicate if the perpetrator is known.');

  if (incident.perpetratorKnown === 'Yes') {
    if (!incident.perpetratorName?.trim())  errors.push('Perpetrator name is required.');
    if (!incident.perpetratorGender?.trim()) errors.push('Perpetrator gender is required.');
  }

  if (!['Yes', 'No'].includes(incident.witnesses))
    errors.push('Please indicate if there are witnesses.');

  if (!['Yes', 'No'].includes(incident.toldAnyone))
    errors.push('Please indicate if you told anyone.');

  if (!['Yes', 'No'].includes(incident.toldPolice))
    errors.push('Please indicate if you told the police.');

  // ── Return errors or proceed ──────────────────────────────
  if (errors.length > 0)
    return res.status(400).json({ errors });

  next();
}

module.exports = { validateCaseReport };
