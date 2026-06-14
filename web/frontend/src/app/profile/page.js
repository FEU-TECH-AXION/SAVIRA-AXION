"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import {
  FiUser, FiMail, FiPhone, FiCamera,
  FiCheck, FiAlertCircle, FiShield,
  FiEye, FiEyeOff, FiBell
} from "react-icons/fi";
import styles from "./profile.module.css";

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

// ── Validation helpers ────────────────────────────────────────────────────────
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;

/**
 * Normalises a raw phone input into +63XXXXXXXXXX format.
 * Accepts:  09XXXXXXXXX  |  9XXXXXXXXX  |  +639XXXXXXXXX  (with/without separators)
 * Returns the cleaned string (may be partial — caller decides validity).
 */
function normalisePhone(raw) {
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

// ── Completion helpers ────────────────────────────────────────
function getCompletionFields(user) {
  return [
    { key: "middle_name",    label: "Middle Name",    optional: true  },
    { key: "extension_name", label: "Extension Name", optional: true  },
    { key: "user_name",      label: "Username",       optional: false },
    { key: "contact_number", label: "Contact Number", optional: false },
    { key: "city",           label: "City",           optional: false },
    { key: "province",       label: "Province",       optional: false },
    { key: "profile_img",    label: "Profile Photo",  optional: true  },
  ].map((f) => ({ ...f, filled: !!(user?.[f.key]) }));
}

function calcCompletion(user) {
  const required = getCompletionFields(user).filter((f) => !f.optional);
  const filled   = required.filter((f) => f.filled).length;
  const base  = 4; // first_name, last_name, email, password always filled after signup
  const total = base + required.length;
  const done  = base + filled;
  return Math.round((done / total) * 100);
}

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: "profile",       label: "Profile",       icon: FiUser   },
  { id: "security",      label: "Security",      icon: FiShield },
  { id: "notifications", label: "Notifications", icon: FiBell   },
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const fileRef = useRef(null);
  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState("");
  const [error,     setError]     = useState("");
  const [formErrors, setFormErrors] = useState({});

  // ── Profile form ──────────────────────────────────────────
  const [form, setForm] = useState({
    first_name:     "",
    middle_name:    "",
    last_name:      "",
    extension_name: "",
    user_name:      "",
    email:          "",
    contact_number: "",
    city:           "",
    province:       "",
    profile_img:    "",
  });

  // ── Security form ─────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password:     "",
    confirm_password: "",
  });
  const [showPw, setShowPw]   = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});

  // ── Notification prefs ────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    email_updates:   true,
    case_updates:    true,
    event_reminders: false,
    volunteer_news:  false,
  });

  // ── Fetch current user on mount ───────────────────────────
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    setForm({
      first_name:     user.first_name     || "",
      middle_name:    user.middle_name    || "",
      last_name:      user.last_name      || "",
      extension_name: user.extension_name || "",
      user_name:      user.user_name      || "",
      email:          user.email          || "",
      contact_number: user.contact_number || "",
      city:           user.city           || "",
      province:       user.province       || "National Capital Region (NCR)",
      profile_img:    user.profile_img    || "",
    });
  }, [user]);

  // ── Set active tab from query parameter ───────────────────
  useEffect(() => {
    const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const completion   = calcCompletion(user);
  const missingFields = getCompletionFields(user).filter((f) => !f.filled && !f.optional);
  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() || "?";

  // ── Handlers ──────────────────────────────────────────────
  const handleChange   = (e) => {
    const { name, value } = e.target;
    setFormErrors((p) => ({ ...p, [name]: "" }));
    
    if (name === "contact_number") {
      const formatted = normalisePhone(value);
      setForm((p) => ({ ...p, [name]: formatted }));
    } else if (name === "province") {
      // Only allow NCR
      if (value === "" || value === "National Capital Region (NCR)") {
        setForm((p) => ({ ...p, [name]: value }));
      }
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };
  const handlePwChange = (e) => setPwForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleNotifChange = (key) => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else                    { setError(msg);   setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  // Profile save
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateProfile(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`http://localhost:5000/api/users/${user.user_id}`, {
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

  // Password validation
  const validatePassword = () => {
    const errs = {};
    if (!pwForm.current_password) errs.current_password = "Required.";
    if (pwForm.new_password.length < 8)
      errs.new_password = "Minimum 8 characters.";
    if (!/[A-Z]/.test(pwForm.new_password))
      errs.new_password = (errs.new_password || "") + " Must include an uppercase letter.";
    if (!/[0-9]/.test(pwForm.new_password))
      errs.new_password = (errs.new_password || "") + " Must include a number.";
    if (pwForm.new_password !== pwForm.confirm_password)
      errs.confirm_password = "Passwords do not match.";
    return errs;
  };

  // Password save
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`http://localhost:5000/api/users/${user.user_id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password:     pwForm.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      flash("success", "Password changed successfully!");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── FIX: Profile image upload ─────────────────────────────
  // The previous avatarEdit button had no type="button", so inside a form
  // it defaulted to type="submit" and triggered form submission instead of
  // opening the file picker. Fixed by adding type="button".
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so the same file can be re-selected if needed
    e.target.value = "";

    const formData = new FormData();
    formData.append("profile_img", file);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(
        `http://localhost:5000/api/users/${user.user_id}/avatar`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setForm((p) => ({ ...p, profile_img: data.profile_img }));
      if (setUser) setUser((prev) => ({ ...prev, profile_img: data.profile_img }));
      flash("success", "Profile photo updated!");
    } catch (err) {
      flash("error", err.message);
    }
  };

  // Password strength indicator
  const pwStrength = (() => {
    const pw = pwForm.new_password;
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8)            score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[0-9]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#e53e3e", "#ed8936", "#3182ce", "#38a169"];
    return { score, label: labels[score], color: colors[score] };
  })();

  if (!user) return null;

  return (
    <div className={styles.page}>

      {/* ── Hero strip ────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.avatarWrap}>
            {form.profile_img ? (
              <img src={form.profile_img} alt="Profile" className={styles.avatar} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
            {/* FIX: type="button" prevents this from triggering form submission */}
            <button
              type="button"
              className={styles.avatarEdit}
              onClick={() => fileRef.current?.click()}
              title="Change photo"
            >
              <FiCamera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
          </div>

          <div className={styles.heroMeta}>
            <h1 className={styles.heroName}>
              {[user.first_name, user.last_name].filter(Boolean).join(" ")}
            </h1>
            <p className={styles.heroSub}>{user.email}</p>
            {user.role_name && (
              <span className={styles.roleBadge}>{user.role_name}</span>
            )}
          </div>

          {/* ── Completion card ─────────────────────── */}
          <div className={styles.completionCard}>
            <div className={styles.completionHeader}>
              <span>Profile completion</span>
              <strong>{completion}%</strong>
            </div>
            <div className={styles.completionBar}>
              <div
                className={styles.completionFill}
                style={{ width: `${completion}%` }}
              />
            </div>
            {missingFields.length > 0 && (
              <p className={styles.completionHint}>
                Add your{" "}
                {missingFields.map((f) => f.label).join(", ")}{" "}
                to complete your profile.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div className={styles.body}>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Flash messages */}
        {success && (
          <div className={styles.flashSuccess}>
            <FiCheck size={16} /> {success}
          </div>
        )}
        {error && (
          <div className={styles.flashError}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── PROFILE TAB ─────────────────────────── */}
        {activeTab === "profile" && (
          <form className={styles.formCard} onSubmit={handleSave}>
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
                <select name="extension_name" value={form.extension_name}
                  onChange={handleChange}>
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
              Contact &amp; Location
            </div>

            <div className={styles.grid2}>
              <Field
                label="Email"
                required
                hint={user.is_email_verified ? "✓ Verified" : "Not yet verified — check your inbox."}
                hintColor={user.is_email_verified ? "var(--sasha-teal)" : "#e53e3e"}
              >
                <input name="email" type="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com" required />
              </Field>
              <Field
                label="Contact Number"
                required
                hint={user.is_contact_number_verified ? "✓ Verified" : "Add a number to improve account security."}
                hintColor={user.is_contact_number_verified ? "var(--sasha-teal)" : "#888"}
                error={formErrors.contact_number}
              >
                <input name="contact_number" type="tel" value={form.contact_number}
                  onChange={handleChange} placeholder="+639XXXXXXXXX" />
              </Field>
            </div>

            <div className={styles.grid2}>
              <Field label="City" required error={formErrors.city}>
                <select name="city" value={form.city}
                  onChange={handleChange}>
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
        )}

        {/* ── SECURITY TAB ────────────────────────── */}
        {activeTab === "security" && (
          <form className={styles.formCard} onSubmit={handlePasswordSave}>
            <div className={styles.sectionTitle}>Change Password</div>
            <p className={styles.sectionDesc}>
              Use a strong password — at least 8 characters, one uppercase letter, and one number.
            </p>

            <div className={styles.grid1}>
              <Field label="Current Password" error={pwErrors.current_password}>
                <div className={styles.pwWrap}>
                  <input
                    name="current_password"
                    type={showPw.current ? "text" : "password"}
                    value={pwForm.current_password}
                    onChange={handlePwChange}
                    placeholder="Current password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                  >
                    {showPw.current ? <FiEye size={17} /> : <FiEyeOff size={17} />}
                  </button>
                </div>
              </Field>

              <Field label="New Password" error={pwErrors.new_password}>
                <div className={styles.pwWrap}>
                  <input
                    name="new_password"
                    type={showPw.new ? "text" : "password"}
                    value={pwForm.new_password}
                    onChange={handlePwChange}
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                  >
                    {showPw.new ? <FiEye size={17} /> : <FiEyeOff size={17} />}
                  </button>
                </div>
                {pwStrength && (
                  <div className={styles.strengthRow}>
                    <div className={styles.strengthBars}>
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={styles.strengthBar}
                          style={{ background: n <= pwStrength.score ? pwStrength.color : "#e2e8f0" }}
                        />
                      ))}
                    </div>
                    <span style={{ color: pwStrength.color, fontSize: "12px", fontWeight: 600 }}>
                      {pwStrength.label}
                    </span>
                  </div>
                )}
              </Field>

              <Field label="Confirm New Password" error={pwErrors.confirm_password}>
                <div className={styles.pwWrap}>
                  <input
                    name="confirm_password"
                    type={showPw.confirm ? "text" : "password"}
                    value={pwForm.confirm_password}
                    onChange={handlePwChange}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                  >
                    {showPw.confirm ? <FiEye size={17} /> : <FiEyeOff size={17} />}
                  </button>
                </div>
              </Field>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? "Updating…" : "Update Password"}
              </button>
            </div>

            {/* Account status info */}
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <FiMail size={16} />
                <div>
                  <p className={styles.infoLabel}>Email verified</p>
                  <p className={styles.infoValue} style={{ color: user.is_email_verified ? "var(--sasha-teal)" : "#e53e3e" }}>
                    {user.is_email_verified ? "Yes" : "No — please verify your email"}
                  </p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FiPhone size={16} />
                <div>
                  <p className={styles.infoLabel}>Contact verified</p>
                  <p className={styles.infoValue} style={{ color: user.is_contact_number_verified ? "var(--sasha-teal)" : "#888" }}>
                    {user.is_contact_number_verified ? "Yes" : "Not yet verified"}
                  </p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FiUser size={16} />
                <div>
                  <p className={styles.infoLabel}>Member since</p>
                  <p className={styles.infoValue}>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-PH", {
                          year: "numeric", month: "long", day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── NOTIFICATIONS TAB ───────────────────── */}
        {activeTab === "notifications" && (
          <div className={styles.formCard}>
            <div className={styles.sectionTitle}>Notification Preferences</div>
            <p className={styles.sectionDesc}>
              Choose what updates you receive from Savira.
            </p>
            <div className={styles.notifList}>
              {[
                { key: "email_updates",   label: "General email updates",    desc: "News, announcements and platform updates." },
                { key: "case_updates",    label: "Case status notifications", desc: "Updates on cases you filed or are involved in." },
                { key: "event_reminders", label: "Event reminders",           desc: "Reminders for upcoming SASHA events." },
                { key: "volunteer_news",  label: "Volunteer opportunities",   desc: "New volunteer programs and calls to action." },
              ].map(({ key, label, desc }) => (
                <label key={key} className={styles.notifRow}>
                  <div>
                    <p className={styles.notifLabel}>{label}</p>
                    <p className={styles.notifDesc}>{desc}</p>
                  </div>
                  <div
                    className={`${styles.toggle} ${notifPrefs[key] ? styles.toggleOn : ""}`}
                    onClick={() => handleNotifChange(key)}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </label>
              ))}
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => flash("success", "Notification preferences saved!")}
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
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