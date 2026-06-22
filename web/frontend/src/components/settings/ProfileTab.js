"use client";

import { useState } from "react";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import styles from "./ProfileTab.module.css";

// ── NCR Data ──────────────────────────────────────────────────────────────────
const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
  "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
  "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
];

const GENDER_IDENTITIES = [
  "Woman", "Man", "Non-binary", "Transgender Woman", "Transgender Man",
  "Genderqueer", "Prefer to self-describe", "Prefer not to say",
];

const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;

function normalisePhone(raw) {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
}

function validateProfile(data) {
  const errors = {};
  if (!data.contact_number) {
    errors.contact_number = "Contact number is required.";
  } else if (!PHONE_REGEX.test(data.contact_number)) {
    errors.contact_number = "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }
  if (!data.city) {
    errors.city = "City is required.";
  } else if (!NCR_CITIES.includes(data.city)) {
    errors.city = "City must be from Metro Manila/NCR.";
  }
  if (!data.province) {
    errors.province = "Province is required.";
  } else if (data.province !== "National Capital Region (NCR)") {
    errors.province = "Province must be National Capital Region (NCR).";
  }
  return errors;
}

export default function ProfileTab({ user, setUser, form, setForm }) {
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else { setError(msg); setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormErrors((p) => ({ ...p, [name]: "" }));

    if (name === "contact_number") {
      setForm((p) => ({ ...p, [name]: normalisePhone(value) }));
    } else if (name === "province") {
      if (value === "" || value === "National Capital Region (NCR)") {
        setForm((p) => ({ ...p, [name]: value }));
      }
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validateProfile(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/users/${user.user_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      if (setUser) setUser((prev) => ({ ...prev, ...data.user }));
      flash("success", "Profile updated successfully!");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSave}>
      {success && (
        <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>
      )}
      {error && (
        <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>
      )}

      <div className={styles.sectionTitle}>Personal Information</div>

      <div className={styles.grid3}>
        <Field label="First Name" required>
          <input name="first_name" value={form.first_name}
            onChange={handleChange} placeholder="First Name" required />
        </Field>
        <Field label="Middle Name" badge="Optional">
          <input name="middle_name" value={form.middle_name}
            onChange={handleChange} placeholder="Middle Name" />
        </Field>
        <Field label="Last Name" required>
          <input name="last_name" value={form.last_name}
            onChange={handleChange} placeholder="Last Name" required />
        </Field>
      </div>

      <div className={styles.grid2}>
        <Field label="Extension Name" badge="Optional">
          <select name="extension_name" value={form.extension_name} onChange={handleChange}>
            <option value="">None</option>
            {["Jr.", "Sr.", "II", "III", "IV"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Username" required hint="Must be unique across Savira.">
          <input name="user_name" value={form.user_name}
            onChange={handleChange} placeholder="@username" required />
        </Field>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
        About You
      </div>

      <div className={styles.grid2}>
        <Field label="Birthday" badge="Optional" hint="Helps us confirm age-appropriate access where required.">
          <input name="birthday" type="date" value={form.birthday}
            onChange={handleChange} max={new Date().toISOString().split("T")[0]} />
        </Field>
        <Field label="Gender Identity" badge="Optional" hint="Visible only to you and authorized SASHA personnel.">
          <select name="gender_identity" value={form.gender_identity} onChange={handleChange}>
            <option value="">Select…</option>
            {GENDER_IDENTITIES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
        Contact &amp; Location
      </div>

      <div className={styles.grid2}>
        <Field
          label="Email"
          required
          hint={user.is_email_verified ? "Verified" : "Not yet verified — check your inbox."}
          hintColor={user.is_email_verified ? "var(--sasha-teal)" : "#e53e3e"}
        >
          <input name="email" type="email" value={form.email}
            onChange={handleChange} placeholder="you@example.com" required />
        </Field>
        <Field
          label="Contact Number"
          required
          hint={user.is_contact_number_verified ? "Verified" : "Add a number to improve account security."}
          hintColor={user.is_contact_number_verified ? "var(--sasha-teal)" : "#888"}
          error={formErrors.contact_number}
        >
          <input name="contact_number" type="tel" value={form.contact_number}
            onChange={handleChange} placeholder="+639XXXXXXXXX" />
        </Field>
      </div>

      <div className={styles.grid2}>
        <Field label="City" required error={formErrors.city}>
          <select name="city" value={form.city} onChange={handleChange}>
            <option value="">Select city / municipality</option>
            {NCR_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Province" required error={formErrors.province}>
          <input name="province" value={form.province}
            onChange={handleChange} placeholder="National Capital Region (NCR)" readOnly />
        </Field>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Reusable Field wrapper ────────────────────────────────────
function Field({ label, required, badge, hint, hintColor, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {badge && <span className={styles.badge}>{badge}</span>}
      </label>
      {children}
      {hint && !error && (
        <p className={styles.fieldHint} style={{ color: hintColor || "#888" }}>{hint}</p>
      )}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}