const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 50;
const SHORT_TEXT_MAX_LENGTH = 150;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;

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

function normalisePhone(raw) {
  let digits = String(raw || "").replace(/[^\d]/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
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

function hasHtmlLikeContent(value) {
  return /[<>/\\`]|\bjavascript:|on\w+\s*=/i.test(String(value || ""));
}

function validateTextField(errors, rawValue, fieldName, label, maxLength, options = {}) {
  const value = trimString(rawValue || "");

  if (typeof rawValue !== "string") {
    errors[fieldName] = `${label} is required.`;
  } else if (!value) {
    errors[fieldName] = `${label} is required.`;
  } else if (options.noLineBreaks && /[\r\n]/.test(rawValue)) {
    errors[fieldName] = `${label} cannot contain line breaks.`;
  } else if (value.length > maxLength) {
    errors[fieldName] = `${label} must be ${maxLength} characters or fewer.`;
  } else if (hasHtmlLikeContent(value)) {
    errors[fieldName] = `${label} cannot contain HTML tags.`;
  }

  return limitString(value, maxLength);
}

function validateContactMessage(req, res, next) {
  const errors = {};
  const firstName = validateTextField(errors, req.body?.firstName, "firstName", "First name", NAME_MAX_LENGTH, {
    noLineBreaks: true,
  });
  const lastName = validateTextField(errors, req.body?.lastName, "lastName", "Last name", NAME_MAX_LENGTH, {
    noLineBreaks: true,
  });
  const subject = validateTextField(errors, req.body?.subject, "subject", "Subject", SHORT_TEXT_MAX_LENGTH);
  const message = validateTextField(errors, req.body?.message, "message", "Message", MESSAGE_MAX_LENGTH);
  const email = normalizeEmail(req.body?.email);
  const phoneRaw = trimString(req.body?.phone || "");
  const phone = normalisePhone(phoneRaw);
  const emailError = getEmailValidationError(req.body?.email);

  if (emailError) errors.email = emailError;
  if (phoneRaw && !PHONE_REGEX.test(phone)) {
    errors.phone = "Enter a valid Philippine mobile number.";
  }
  if (message && message.length < MESSAGE_MIN_LENGTH) {
    errors.message = `Message must be at least ${MESSAGE_MIN_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: "Validation failed.", errors });
  }

  req.body = {
    ...req.body,
    firstName,
    lastName,
    email,
    phone,
    subject,
    message,
  };

  next();
}

module.exports = { validateContactMessage };
