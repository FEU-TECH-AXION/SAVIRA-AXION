"use client";

import { useState } from "react";
import { FiCheck, FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";
import styles from "../resetPassword/resetPassword.module.css";
import { API_URL } from "@/lib/config";
import { authFetch, useAuth } from "@/lib/AuthContext";

const PW_RULES = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "One number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#$...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 1, label: "Weak", color: "#e53e3e" };
  if (passed === 2) return { level: 2, label: "Fair", color: "#ed8936" };
  if (passed === 3) return { level: 3, label: "Good", color: "#3182ce" };
  if (passed === 4) return { level: 4, label: "Strong", color: "#38a169" };
  return { level: 5, label: "Very Strong", color: "#276749" };
}

export default function ChangePassword() {
  const [show, setShow] = useState({ current: false, password: false, confirm: false });
  const [form, setForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({});
  const [pwFocused, setPwFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  const validate = (field, value) => {
    if (field === "currentPassword") return value ? "" : "Temporary password is required.";
    if (field === "password") {
      if (!PW_RULES.every((r) => r.test(value))) return "Password does not meet all requirements.";
      if (value === form.currentPassword) return "Use a password different from the temporary password.";
      return "";
    }
    if (field === "confirmPassword") return value !== form.password ? "Passwords do not match." : "";
    return "";
  };

  const isFormValid =
    !validate("currentPassword", form.currentPassword) &&
    !validate("password", form.password) &&
    !validate("confirmPassword", form.confirmPassword);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ currentPassword: true, password: true, confirmPassword: true });
    setError("");
    if (!isFormValid) return;

    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/auth/change-expired-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to change password.");
        return;
      }
      if (data.token) localStorage.setItem("token", data.token);
      setUser(data.user);
      router.replace("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password ? getStrength(form.password) : null;
  const allRulesPassed = PW_RULES.every((r) => r.test(form.password));

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <img src="/sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Change Password</h1>
          <p className={styles.pgdescription}>
            Your temporary password has expired. Please set a new password to continue.
          </p>

          {error && <div style={{ color: "red", fontSize: "13px", marginBottom: "8px" }}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <PasswordField
              label="Temporary Password"
              name="currentPassword"
              value={form.currentPassword}
              visible={show.current}
              onToggle={() => setShow((p) => ({ ...p, current: !p.current }))}
              onChange={handleChange}
              error={touched.currentPassword ? validate("currentPassword", form.currentPassword) : ""}
              autoComplete="current-password"
            />

            <div className={styles.fieldGroupLg}>
              <PasswordField
                label="New Password"
                name="password"
                value={form.password}
                visible={show.password}
                onToggle={() => setShow((p) => ({ ...p, password: !p.password }))}
                onChange={handleChange}
                onFocus={() => setPwFocused(true)}
                onBlur={() => {
                  setTouched((p) => ({ ...p, password: true }));
                  setPwFocused(false);
                }}
                error={touched.password ? validate("password", form.password) : ""}
                autoComplete="new-password"
              />

              {strength && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <div style={{ display: "flex", gap: "3px", flex: 1 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} style={{ height: "4px", flex: 1, borderRadius: "2px", background: n <= strength.level ? strength.color : "#e2e8f0" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "12px", color: strength.color, whiteSpace: "nowrap" }}>{strength.label}</span>
                </div>
              )}

              {form.password && (pwFocused || !allRulesPassed) && (
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: "12px" }}>
                  {PW_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li key={rule.id} style={{ display: "flex", alignItems: "center", gap: "6px", color: ok ? "#276749" : "#e53e3e", marginBottom: "2px" }}>
                        {ok ? <FiCheck size={11} /> : <FiX size={11} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={form.confirmPassword}
              visible={show.confirm}
              onToggle={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
              onChange={handleChange}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
              error={touched.confirmPassword ? validate("confirmPassword", form.confirmPassword) : ""}
              autoComplete="new-password"
            />

            <button type="submit" className={styles.btn} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, name, value, visible, onToggle, onChange, onFocus, onBlur, error, autoComplete }) {
  return (
    <div className={styles.fieldGroupLg}>
      <label className={styles.label}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          className={styles.input}
          type={visible ? "text" : "password"}
          name={name}
          placeholder={label}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle} aria-label="Toggle password visibility">
          {visible ? <FiEye /> : <FiEyeOff />}
        </button>
      </div>
      {error && <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}
