"use client";

import { useEffect, useState } from "react";
import {
  FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiMail, FiPhone,
  FiUser, FiTrash2,
} from "react-icons/fi";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import styles from "./AccountPrivacyTab.module.css";

const SECTIONS = [
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "notifications", label: "Notifications" },
  { id: "policies", label: "Policies" },
];

export default function AccountPrivacyTab({ user, setUser }) {
  const [section, setSection] = useState("email");
  const [policy, setPolicy] = useState("terms");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ── Password state ───────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: "", new_password: "", confirm_password: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [emailForm, setEmailForm] = useState({
    newEmail: user?.email || "",
    code: "",
    awaitingCode: false,
  });
  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0);

  useEffect(() => {
    if (emailCodeCooldown <= 0) return undefined;
    const timer = setTimeout(() => {
      setEmailCodeCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [emailCodeCooldown]);

  // ── Two-factor state ──────────────────────────────────────
  // ── Notification prefs ────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    email_updates: true,
    case_updates: true,
    event_reminders: false,
    volunteer_news: false,
  });

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); }
    else { setError(msg); setSuccess(""); }
    setTimeout(() => { setSuccess(""); setError(""); }, 4000);
  };

  const handlePwChange = (e) => setPwForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleNotifChange = (key) => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  const requestEmailChange = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail.trim()) {
      flash("error", "Enter the email address you want to use.");
      return;
    }
    if (emailCodeCooldown > 0) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/email-change/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ newEmail: emailForm.newEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const sendError = new Error(data.error || "Could not send verification code.");
        sendError.retryAfter = data.retryAfter;
        throw sendError;
      }
      setEmailForm((p) => ({ ...p, awaitingCode: true, code: "" }));
      setEmailCodeCooldown(60);
      flash("success", "Verification code sent. Please check your inbox.");
    } catch (err) {
      if (err.retryAfter) setEmailCodeCooldown(Number(err.retryAfter) || 60);
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const verifyEmailChange = async (e) => {
    e.preventDefault();
    if (emailForm.code.trim().length !== 6) {
      flash("error", "Enter the 6-digit verification code.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/email-change/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          newEmail: emailForm.newEmail.trim(),
          code: emailForm.code.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Email verification failed.");
      localStorage.setItem("token", data.token);
      if (setUser) setUser(data.user);
      setEmailForm({ newEmail: data.user.email, code: "", awaitingCode: false });
      flash("success", "Email verified and updated.");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errs = {};
    if (!pwForm.current_password) errs.current_password = "Required.";
    if (pwForm.new_password.length < 8) errs.new_password = "Minimum 8 characters.";
    if (!/[A-Z]/.test(pwForm.new_password))
      errs.new_password = (errs.new_password || "") + " Must include an uppercase letter.";
    if (!/[0-9]/.test(pwForm.new_password))
      errs.new_password = (errs.new_password || "") + " Must include a number.";
    if (pwForm.new_password !== pwForm.confirm_password)
      errs.confirm_password = "Passwords do not match.";
    return errs;
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${user.user_id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
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

  const pwStrength = (() => {
    const pw = pwForm.new_password;
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#e53e3e", "#ed8936", "#3182ce", "#38a169"];
    return { score, label: labels[score], color: colors[score] };
  })();

  return (
    <div className={styles.wrap}>
      {success && <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>}
      {error && <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>}

      <div className={styles.layout}>
        {/* ── Sub-navigation ──────────────────────────── */}
        <nav className={styles.subNav}>
          {SECTIONS.map((s) => (
            <div key={s.id}>
              <button
                type="button"
                className={`${styles.subNavItem} ${section === s.id ? styles.subNavItemActive : ""}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
              {s.id === "policies" && section === "policies" && (
                <div className={styles.policySubNav}>
                  <button
                    type="button"
                    className={`${styles.policySubNavItem} ${policy === "terms" ? styles.policySubNavItemActive : ""}`}
                    onClick={() => setPolicy("terms")}
                  >
                    Terms and Conditions
                  </button>
                  <button
                    type="button"
                    className={`${styles.policySubNavItem} ${policy === "privacy" ? styles.policySubNavItemActive : ""}`}
                    onClick={() => setPolicy("privacy")}
                  >
                    Privacy Policy
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className={styles.navDivider} />
          <button
            type="button"
            className={`${styles.subNavItem} ${styles.deactivateNavItem} ${section === "deactivate" ? styles.deactivateNavItemActive : ""}`}
            onClick={() => setSection("deactivate")}
          >
            Deactivate Account
          </button>
        </nav>

        {/* ── Content ──────────────────────────────────── */}
        <div className={styles.content}>

          {section === "email" && (
            <form className={styles.card} onSubmit={emailForm.awaitingCode ? verifyEmailChange : requestEmailChange}>
              <div className={styles.cardTitle}>Email</div>
              <p className={styles.cardDesc}>
                {user.email}
                <br />
                {user.is_email_verified
                  ? "Verified"
                  : "Not yet verified — check your inbox."}
              </p>

              <div className={styles.grid1}>
                <Field label="Email address">
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
                    placeholder="user@test.com"
                  />
                </Field>

                {emailForm.awaitingCode && (
                  <Field label="Verification code">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailForm.code}
                      onChange={(e) => setEmailForm((p) => ({ ...p, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                      placeholder="6-digit code"
                    />
                  </Field>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving || (!emailForm.awaitingCode && emailCodeCooldown > 0)}>
                  {saving
                    ? "Working..."
                    : !emailForm.awaitingCode && emailCodeCooldown > 0
                    ? `Send again in ${emailCodeCooldown}s`
                    : emailForm.awaitingCode
                    ? "Verify Email"
                    : "Send Verification Code"}
                </button>
              </div>
            </form>
          )}

          {section === "password" && (
            <form className={styles.card} onSubmit={handlePasswordSave}>
              <div className={styles.cardTitle}>Change Password</div>
              <p className={styles.cardDesc}>
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
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}>
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
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}>
                      {showPw.new ? <FiEye size={17} /> : <FiEyeOff size={17} />}
                    </button>
                  </div>
                  {pwStrength && (
                    <div className={styles.strengthRow}>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className={styles.strengthBar}
                            style={{ background: n <= pwStrength.score ? pwStrength.color : "#e2e8f0" }} />
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
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}>
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

          {section === "notifications" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Notification Preferences</div>
              <p className={styles.cardDesc}>Choose what updates you receive from Savira.</p>
              <div className={styles.notifList}>
                {[
                  { key: "email_updates", label: "General email updates", desc: "News, announcements and platform updates." },
                  { key: "case_updates", label: "Case status notifications", desc: "Updates on cases you filed or are involved in." },
                  { key: "event_reminders", label: "Event reminders", desc: "Reminders for upcoming SASHA events." },
                  { key: "volunteer_news", label: "Volunteer opportunities", desc: "New volunteer programs and calls to action." },
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

          {section === "policies" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Policies</div>
              <h2 className={styles.policyTitle}>
                {POLICIES[policy].title}
              </h2>
              <PolicyMarkdown
                markdown={POLICIES[policy].markdown}
                className={styles.policyContent}
              />
            </div>
          )}

          {section === "deactivate" && (
            <div className={styles.card}>
              <div className={`${styles.cardTitle} ${styles.dangerTitle}`}>Deactivate Account</div>
              <p className={styles.cardDesc}>
                Temporarily disable your account. You can reactivate it by signing back in.
              </p>
              <div className={styles.dangerPanel}>
                <div>
                  <p className={styles.dangerPanelTitle}>
                    <FiTrash2 size={16} />
                    Deactivate your Savira account
                  </p>
                  <p className={styles.privacyDesc}>
                    Your profile will no longer be accessible until you reactivate your account.
                  </p>
                </div>
                <button type="button" className={styles.btnDanger}>
                  Deactivate Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Reusable Field wrapper ────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

