const { body, validationResult } = require('express-validator');

const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong",
  "Manila", "Marikina", "Muntinlupa", "Navotas", "Parañaque",
  "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan",
  "Taguig", "Valenzuela",
];

const VALID_ORGS       = ["Boy Scouts of the Philippines (BSP)", "Girl Scouts of the Philippines (GSP)", "Others"];
const VALID_GENDERS    = ["Male", "Female", "Non-binary", "Prefer not to say"];
const PHONE_REGEX      = /^\+639\d{9}$/;
const EMAIL_REGEX      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    errors.push('A valid Philippine mobile number is required (+639XXXXXXXXX).');

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

  // ── Incident ──────────────────────────────────────────────
  if (!incident)                            return res.status(400).json({ error: 'Incident data is required.' });

  if (!incident.date)                       errors.push('Incident date is required.');
  if (!incident.time)                       errors.push('Incident time is required.');
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

  if (incident.witnesses === 'Yes') {
    if (!incident.witnessName?.trim())      errors.push('Witness name is required.');
    if (!incident.witnessContact?.trim())   errors.push('Witness contact is required.');
  }

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
