"use client";

import { useState } from "react";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { validateBirthday } from "@/utils/birthdayValidation";
import styles from "./ProfileTab.module.css";

// ── NCR Data ──────────────────────────────────────────────────────────────────
const NCR_CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
  "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
  "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
];

const GENDER_IDENTITIES = [
  "Male", "Female", "Non-binary", "Prefer not to say",
];

const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;

function normalisePhone(raw) {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAge(birthday) {
  if (!birthday) return null;
  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function birthdayForAge(age) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return formatDateInput(date);
}

function validateProfile(data) {
  const errors = {};
  if (!data.first_name?.trim()) errors.first_name = "First name is required.";
  if (!data.last_name?.trim()) errors.last_name = "Last name is required.";
  if (!data.user_name?.trim()) errors.user_name = "Username is required.";
  if (!data.email?.trim()) errors.email = "Email is required.";
  if (data.gender_identity && !GENDER_IDENTITIES.includes(data.gender_identity)) {
    errors.gender_identity = "Select a valid gender identity.";
  }
  if (data.birthday) {
    const birthdayError = validateBirthday(data.birthday);
    if (birthdayError) errors.birthday = birthdayError;
  }
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
  const [underageDialogOpen, setUnderageDialogOpen] = useState(false);

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
    } else if (name === "birthday") {
      setForm((p) => ({ ...p, birthday: value }));
      if (value) {
        const birthdayError = validateBirthday(value);
        if (birthdayError) {
          setFormErrors((p) => ({ ...p, birthday: birthdayError }));
          const age = getAge(value);
          if (age !== null && age < 13) setUnderageDialogOpen(true);
        }
      }
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/api/users/${user.user_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      if (setUser) setUser(data);
      flash("success", "Profile updated successfully!");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <form className={styles.formCard} onSubmit={handleSave}>
      {success && (
        <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>
      )}
      {error && (
        <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>
      )}

      <div className={styles.sectionTitle}>Personal Information</div>

      <div className={styles.grid3}>
        <Field label="First Name" required error={formErrors.first_name}>
          <input name="first_name" value={form.first_name}
            onChange={handleChange} placeholder="First Name" required />
        </Field>
        <Field label="Middle Name" badge="Optional">
          <input name="middle_name" value={form.middle_name}
            onChange={handleChange} placeholder="Middle Name" />
        </Field>
        <Field label="Last Name" required error={formErrors.last_name}>
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
        <Field label="Username" required hint="Must be unique across Savira." error={formErrors.user_name}>
          <input name="user_name" value={form.user_name}
            onChange={handleChange} placeholder="@username" required />
        </Field>
      </div>

      <div className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
        About You
      </div>

      <div className={styles.grid2}>
        <Field label="Birthday" badge="Optional" hint="Helps us confirm age-appropriate access where required." error={formErrors.birthday}>
          <input name="birthday" type="date" value={form.birthday}
            onChange={handleChange}
            min={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() - 125)))}
            max={birthdayForAge(13)} />
        </Field>
        <Field label="Gender Identity" badge="Optional" hint="Visible only to you and authorized SASHA personnel." error={formErrors.gender_identity}>
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
          error={formErrors.email}
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
    <ConfirmDialog
      open={underageDialogOpen}
      title="Minimum age requirement"
      description="Savira accounts are available only to users who are at least 13 years old."
      detail="Please choose a birthday that confirms you are 13 or older."
      confirmLabel="Choose another birthday"
      tone="danger"
      hideCancel
      dismissible={false}
      onConfirm={() => {
        setUnderageDialogOpen(false);
        setForm((current) => ({ ...current, birthday: "" }));
      }}
      onCancel={() => setUnderageDialogOpen(false)}
    />
    </>
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
