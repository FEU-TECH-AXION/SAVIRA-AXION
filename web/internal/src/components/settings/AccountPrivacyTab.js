"use client";

import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiMail, FiPhone, FiTrash2, FiUser } from "react-icons/fi";
import PolicyMarkdown from "@/components/policies/PolicyMarkdown";
import { POLICIES } from "@/components/policies/policyContent";
import { internalApiFetch } from "@/lib/internalApiFetch";
import styles from "./AccountPrivacyTab.module.css";

const SECTIONS = [
  { id: "email", labelKey: "email" },
  { id: "password", labelKey: "password" },
  { id: "notifications", labelKey: "notifications" },
  { id: "policies", labelKey: "policies" },
];

export default function AccountPrivacyTab({ user, setUser, t }) {
  const [section, setSection] = useState("email");
  const [policy, setPolicy] = useState("terms");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [emailForm, setEmailForm] = useState({
    newEmail: user?.email || "",
    code: "",
    awaitingCode: false,
  });
  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0);
  const [notifPrefs, setNotifPrefs] = useState({
    email_updates: true,
    case_updates: true,
    event_reminders: false,
    volunteer_news: false,
  });

  useEffect(() => {
    if (emailCodeCooldown <= 0) return undefined;
    const timer = setTimeout(() => {
      setEmailCodeCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [emailCodeCooldown]);

  const flash = (type, msg) => {
    if (type === "success") {
      setSuccess(msg);
      setError("");
    } else {
      setError(msg);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
  };

  const handlePwChange = (event) => {
    setPwForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleNotifChange = (key) => {
    setNotifPrefs((current) => ({ ...current, [key]: !current[key] }));
  };

  const requestEmailChange = async (event) => {
    event.preventDefault();
    if (!emailForm.newEmail.trim()) {
      flash("error", "Enter the email address you want to use.");
      return;
    }
    if (emailCodeCooldown > 0) return;

    setSaving(true);
    try {
      const response = await internalApiFetch("/api/auth/email-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: emailForm.newEmail.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const sendError = new Error(data.error || "Could not send verification code.");
        sendError.retryAfter = data.retryAfter;
        throw sendError;
      }
      setEmailForm((current) => ({ ...current, awaitingCode: true, code: "" }));
      setEmailCodeCooldown(60);
      flash("success", "Verification code sent. Please check your inbox.");
    } catch (err) {
      if (err.retryAfter) setEmailCodeCooldown(Number(err.retryAfter) || 60);
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const verifyEmailChange = async (event) => {
    event.preventDefault();
    if (emailForm.code.trim().length !== 6) {
      flash("error", "Enter the 6-digit verification code.");
      return;
    }

    setSaving(true);
    try {
      const response = await internalApiFetch("/api/auth/email-change/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: emailForm.newEmail.trim(),
          code: emailForm.code.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Email verification failed.");
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
    if (!/[A-Z]/.test(pwForm.new_password)) {
      errs.new_password = `${errs.new_password || ""} Must include an uppercase letter.`;
    }
    if (!/[0-9]/.test(pwForm.new_password)) {
      errs.new_password = `${errs.new_password || ""} Must include a number.`;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      errs.confirm_password = "Passwords do not match.";
    }
    return errs;
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length) {
      setPwErrors(errs);
      return;
    }
    setPwErrors({});
    setSaving(true);
    try {
      const response = await internalApiFetch(`/api/users/${user.user_id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Password change failed.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      flash("success", "Password changed successfully.");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const pwStrength = (() => {
    const password = pwForm.new_password;
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#e53e3e", "#ed8936", "#3182ce", "#38a169"];
    return { score, label: labels[score], color: colors[score] };
  })();

  return (
    <div className={styles.wrap}>
      {success && <div className={styles.flashSuccess}><FiCheck size={16} /> {success}</div>}
      {error && <div className={styles.flashError}><FiAlertCircle size={16} /> {error}</div>}

      <div className={styles.layout}>
        <nav className={styles.subNav}>
          {SECTIONS.map((item) => (
            <div key={item.id}>
              <button
                type="button"
                className={`${styles.subNavItem} ${section === item.id ? styles.subNavItemActive : ""}`}
                onClick={() => setSection(item.id)}
              >
                {t(item.labelKey)}
              </button>
              {item.id === "policies" && section === "policies" && (
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
            {t("deactivateAccount")}
          </button>
        </nav>

        <div className={styles.content}>
          {section === "email" && (
            <form className={styles.card} onSubmit={emailForm.awaitingCode ? verifyEmailChange : requestEmailChange}>
              <div className={styles.cardTitle}>{t("email")}</div>
              <p className={styles.cardDesc}>
                {user.email}
                <br />
                {user.is_email_verified ? t("verified") : t("notVerifiedInbox")}
              </p>

              <div className={styles.grid1}>
                <Field label={t("emailAddress")}>
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(event) => setEmailForm((current) => ({ ...current, newEmail: event.target.value }))}
                    placeholder="user@test.com"
                  />
                </Field>

                {emailForm.awaitingCode && (
                  <Field label={t("verificationCode")}>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailForm.code}
                      onChange={(event) => setEmailForm((current) => ({
                        ...current,
                        code: event.target.value.replace(/\D/g, "").slice(0, 6),
                      }))}
                      placeholder="6-digit code"
                    />
                  </Field>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving || (!emailForm.awaitingCode && emailCodeCooldown > 0)}>
                  {saving
                    ? t("working")
                    : !emailForm.awaitingCode && emailCodeCooldown > 0
                      ? `${t("sendAgainIn")} ${emailCodeCooldown}s`
                      : emailForm.awaitingCode
                        ? t("verifyEmail")
                        : t("sendVerificationCode")}
                </button>
              </div>
            </form>
          )}

          {section === "password" && (
            <form className={styles.card} onSubmit={handlePasswordSave}>
              <div className={styles.cardTitle}>{t("changePassword")}</div>
              <p className={styles.cardDesc}>{t("changePasswordDesc")}</p>

              <div className={styles.grid1}>
                <Field label={t("currentPassword")} error={pwErrors.current_password}>
                  <PasswordInput name="current_password" value={pwForm.current_password} visible={showPw.current} onChange={handlePwChange} onToggle={() => setShowPw((current) => ({ ...current, current: !current.current }))} placeholder="Current password" />
                </Field>

                <Field label={t("newPassword")} error={pwErrors.new_password}>
                  <PasswordInput name="new_password" value={pwForm.new_password} visible={showPw.new} onChange={handlePwChange} onToggle={() => setShowPw((current) => ({ ...current, new: !current.new }))} placeholder="New password" />
                  {pwStrength && (
                    <div className={styles.strengthRow}>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((value) => (
                          <div key={value} className={styles.strengthBar} style={{ background: value <= pwStrength.score ? pwStrength.color : "#e2e8f0" }} />
                        ))}
                      </div>
                      <span style={{ color: pwStrength.color, fontSize: "12px", fontWeight: 600 }}>
                        {pwStrength.label}
                      </span>
                    </div>
                  )}
                </Field>

                <Field label={t("confirmNewPassword")} error={pwErrors.confirm_password}>
                  <PasswordInput name="confirm_password" value={pwForm.confirm_password} visible={showPw.confirm} onChange={handlePwChange} onToggle={() => setShowPw((current) => ({ ...current, confirm: !current.confirm }))} placeholder="Confirm new password" />
                </Field>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? t("updating") : t("updatePassword")}
                </button>
              </div>

              <div className={styles.infoGrid}>
                <InfoItem icon={<FiMail size={16} />} label="Email verified" value={user.is_email_verified ? "Yes" : "No"} tone={user.is_email_verified ? "var(--sasha-teal)" : "#e53e3e"} />
                <InfoItem icon={<FiPhone size={16} />} label="Contact verified" value={user.is_contact_number_verified ? "Yes" : "Not yet verified"} tone={user.is_contact_number_verified ? "var(--sasha-teal)" : "#888"} />
                <InfoItem icon={<FiUser size={16} />} label="Member since" value={user.created_at ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
              </div>
            </form>
          )}

          {section === "notifications" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>{t("notificationPreferences")}</div>
              <p className={styles.cardDesc}>{t("notificationPreferencesDesc")}</p>
              <div className={styles.notifList}>
                {[
                  { key: "email_updates", label: t("generalEmailUpdates"), desc: t("generalEmailUpdatesDesc") },
                  { key: "case_updates", label: t("caseStatusNotifications"), desc: t("caseStatusNotificationsDesc") },
                  { key: "event_reminders", label: t("eventReminders"), desc: t("eventRemindersDesc") },
                  { key: "volunteer_news", label: t("volunteerOpportunities"), desc: t("volunteerOpportunitiesDesc") },
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
                <button type="button" className={styles.btnPrimary} onClick={() => flash("success", t("notificationPrefsSaved"))}>
                  {t("savePreferences")}
                </button>
              </div>
            </div>
          )}

          {section === "policies" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>{t("policies")}</div>
              <h2 className={styles.policyTitle}>{POLICIES[policy].title}</h2>
              <PolicyMarkdown
                markdown={POLICIES[policy].markdown}
                className={styles.policyContent}
              />
            </div>
          )}

          {section === "deactivate" && (
            <div className={styles.card}>
              <div className={`${styles.cardTitle} ${styles.dangerTitle}`}>{t("deactivateAccount")}</div>
              <p className={styles.cardDesc}>{t("deactivateDesc")}</p>
              <div className={styles.dangerPanel}>
                <div>
                  <p className={styles.dangerPanelTitle}>
                    <FiTrash2 size={16} />
                    {t("deactivateAccount")}
                  </p>
                  <p className={styles.privacyDesc}>{t("deactivatePanelDesc")}</p>
                </div>
                <button type="button" className={styles.btnDanger}>
                  {t("deactivateAccount")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ name, value, visible, onChange, onToggle, placeholder }) {
  return (
    <div className={styles.pwWrap}>
      <input name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" className={styles.eyeBtn} onClick={onToggle}>
        {visible ? <FiEye size={17} /> : <FiEyeOff size={17} />}
      </button>
    </div>
  );
}

function InfoItem({ icon, label, value, tone }) {
  return (
    <div className={styles.infoItem}>
      {icon}
      <div>
        <p className={styles.infoLabel}>{label}</p>
        <p className={styles.infoValue} style={{ color: tone }}>{value}</p>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}
