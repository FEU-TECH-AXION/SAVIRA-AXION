"use client";

import { useState } from "react";
import styles from "./contact.module.css";
import { FaFacebook, FaInstagram, FaCheck } from "react-icons/fa6";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 50;
const SUBJECT_MAX_LENGTH = 150;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;
const EMAIL_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const UNSAFE_TEXT_CHARS_REGEX = /[<>/\\`]/g;
const SCRIPT_LIKE_TEXT_REGEX = /\bjavascript:|on\w+\s*=/gi;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function sanitizeTextInput(value) {
  return String(value || "")
    .replace(UNSAFE_TEXT_CHARS_REGEX, "")
    .replace(SCRIPT_LIKE_TEXT_REGEX, "");
}

function validateTextField(errors, form, fieldName, label, maxLength, options = {}) {
  const rawValue = form[fieldName];
  const value = String(rawValue || "").trim();

  if (!value) {
    errors[fieldName] = `${label} is required.`;
  } else if (options.noLineBreaks && /[\r\n]/.test(rawValue)) {
    errors[fieldName] = `${label} cannot contain line breaks.`;
  } else if (value.length > maxLength) {
    errors[fieldName] = `${label} must be ${maxLength} characters or fewer.`;
  } else if (hasHtmlLikeContent(value)) {
    errors[fieldName] = `${label} cannot contain HTML tags.`;
  }
}

function validateContactForm(form) {
  const errors = {};
  const message = String(form.message || "").trim();
  const phone = String(form.phone || "").trim();

  validateTextField(errors, form, "firstName", "First name", NAME_MAX_LENGTH, { noLineBreaks: true });
  validateTextField(errors, form, "lastName", "Last name", NAME_MAX_LENGTH, { noLineBreaks: true });
  validateTextField(errors, form, "subject", "Subject", SUBJECT_MAX_LENGTH);
  validateTextField(errors, form, "message", "Message", MESSAGE_MAX_LENGTH);

  const emailError = getEmailValidationError(form.email);
  if (emailError) errors.email = emailError;
  if (phone && !PHONE_REGEX.test(normalisePhone(phone))) {
    errors.phone = "Enter a valid Philippine mobile number.";
  }
  if (message && message.length < MESSAGE_MIN_LENGTH) {
    errors.message = `Message must be at least ${MESSAGE_MIN_LENGTH} characters.`;
  }

  return errors;
}

function getFieldError(form, key) {
  return validateContactForm(form)[key] || "";
}

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const set = (key) => (e) => {
    const nextValue = ["firstName", "lastName", "subject", "message"].includes(key)
      ? sanitizeTextInput(e.target.value)
      : e.target.value;
    const nextForm = { ...form, [key]: nextValue };
    setForm(nextForm);
    if (fieldErrors[key]) {
      const nextError = getFieldError(nextForm, key);
      setFieldErrors((currentErrors) => {
        if (nextError) return { ...currentErrors, [key]: nextError };
        const { [key]: _removed, ...remainingErrors } = currentErrors;
        return remainingErrors;
      });
    }
  };

  const validateField = (key) => () => {
    const nextError = getFieldError(form, key);
    setFieldErrors((currentErrors) => {
      if (nextError) return { ...currentErrors, [key]: nextError };
      const { [key]: _removed, ...remainingErrors } = currentErrors;
      return remainingErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateContactForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.errors) {
        setFieldErrors(data.errors);
        throw new Error(data.error || "Please correct the highlighted fields.");
      }
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setSubmitted(true);
      setForm(emptyForm);
      setFieldErrors({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <h1 className={styles.heroTitle}>
          Get <span className={styles.accent}>In Touch</span>
        </h1>
      </section>

      <section className={styles.intro}>
        <p className={styles.sectionLabel}>
          <span className={styles.labelLine} /> Contact Us
        </p>
        <h2 className={styles.introHeading}>
          We&apos;re Here <span className={styles.accent}>to Help</span>
        </h2>
        <p className={styles.introBody}>
          For inquiries, partnership proposals, or organizational concerns, you may reach
          out through the form below. All messages are handled by authorized
          representatives of SASHA.
        </p>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formCard}>
          <div className={styles.formLeft}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    First Name <span className={styles.requiredMark} aria-hidden="true">*</span>
                    <span className={styles.srOnly}>required</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    className={styles.input}
                    value={form.firstName}
                    onChange={set("firstName")}
                    onBlur={validateField("firstName")}
                    maxLength={NAME_MAX_LENGTH}
                    required
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                  />
                  {fieldErrors.firstName && <p id="firstName-error" className={styles.fieldError}>{fieldErrors.firstName}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Last Name <span className={styles.requiredMark} aria-hidden="true">*</span>
                    <span className={styles.srOnly}>required</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    className={styles.input}
                    value={form.lastName}
                    onChange={set("lastName")}
                    onBlur={validateField("lastName")}
                    maxLength={NAME_MAX_LENGTH}
                    required
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                  />
                  {fieldErrors.lastName && <p id="lastName-error" className={styles.fieldError}>{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    E-mail <span className={styles.requiredMark} aria-hidden="true">*</span>
                    <span className={styles.srOnly}>required</span>
                  </label>
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    className={styles.input}
                    value={form.email}
                    onChange={set("email")}
                    onBlur={validateField("email")}
                    maxLength={EMAIL_MAX_LENGTH}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  />
                  {fieldErrors.email && <p id="email-error" className={styles.fieldError}>{fieldErrors.email}</p>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+639XXXXXXXXX"
                    className={styles.input}
                    value={form.phone}
                    onChange={(e) => {
                      const nextForm = { ...form, phone: normalisePhone(e.target.value) };
                      setForm(nextForm);
                      if (fieldErrors.phone) {
                        const nextError = getFieldError(nextForm, "phone");
                        setFieldErrors((currentErrors) => {
                          if (nextError) return { ...currentErrors, phone: nextError };
                          const { phone: _removed, ...remainingErrors } = currentErrors;
                          return remainingErrors;
                        });
                      }
                    }}
                    onBlur={validateField("phone")}
                    maxLength={13}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  />
                  {fieldErrors.phone && <p id="phone-error" className={styles.fieldError}>{fieldErrors.phone}</p>}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Subject <span className={styles.requiredMark} aria-hidden="true">*</span>
                  <span className={styles.srOnly}>required</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter subject here..."
                  className={styles.input}
                  value={form.subject}
                  onChange={set("subject")}
                  onBlur={validateField("subject")}
                  maxLength={SUBJECT_MAX_LENGTH}
                  required
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
                />
                {fieldErrors.subject && <p id="subject-error" className={styles.fieldError}>{fieldErrors.subject}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Your Message <span className={styles.requiredMark} aria-hidden="true">*</span>
                  <span className={styles.srOnly}>required</span>
                </label>
                <textarea
                  placeholder="Enter here..."
                  className={styles.textarea}
                  rows={5}
                  value={form.message}
                  onChange={set("message")}
                  onBlur={validateField("message")}
                  maxLength={MESSAGE_MAX_LENGTH}
                  required
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? "message-error message-count" : "message-count"}
                />
                <div className={styles.messageMeta}>
                  {fieldErrors.message && <p id="message-error" className={styles.fieldError}>{fieldErrors.message}</p>}
                  <span id="message-count" className={styles.charCount}>
                    {form.message.length}/{MESSAGE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting || hasFieldErrors}>
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          <div className={styles.infoPanel}>
            <div className={styles.infoOverlay} />
            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Address</h4>
              <p className={styles.infoText}>
                270A ML Quezon Street, Buli, Muntinlupa City
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Contact</h4>
              <p className={styles.infoText}>
                Email: sasha@oneamaps.com
                <br />
                Contact Number: 0977 319 6087
              </p>
            </div>

            <div className={styles.infoBlock}>
              <span className={styles.infoBar} />
              <h4 className={styles.infoTitle}>Stay Connected</h4>
              <div className={styles.socials}>
                <a href="https://www.facebook.com/PHsasha" aria-label="Facebook"><FaFacebook /></a>
                <a href="https://www.instagram.com/phsasha_official/?g=5" aria-label="Instagram"><FaInstagram /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {submitted && (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.sentModal} role="dialog" aria-modal="true" aria-labelledby="contact-sent-title">
            <span className={styles.modalIcon}><FaCheck /></span>
            <h3 id="contact-sent-title">Message Sent</h3>
            <p>Thank you for reaching out. We&apos;ll get back to you shortly.</p>
            <button type="button" className={styles.modalButton} onClick={() => setSubmitted(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
