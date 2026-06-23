"use client";

import { Suspense, useState } from "react";
import styles from "./resetPassword.module.css";
import { IoIosArrowBack } from "react-icons/io";
import { FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";
import { useRouter, useSearchParams } from 'next/navigation';

// ── Password strength check (same rules as signup) ────────────
const PW_RULES = [
  { id: "len",     label: "At least 8 characters",         test: (p) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",           test: (p) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter",           test: (p) => /[a-z]/.test(p) },
  { id: "digit",   label: "One number",                     test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#$…)",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 1, label: "Weak",       color: "#e53e3e" };
  if (passed === 2) return { level: 2, label: "Fair",       color: "#ed8936" };
  if (passed === 3) return { level: 3, label: "Good",       color: "#3182ce" };
  if (passed === 4) return { level: 4, label: "Strong",     color: "#38a169" };
  return              { level: 5, label: "Very Strong", color: "#276749" };
}

function ResetPasswordContent() {
  const [show, setShow] = useState({ password: false, confirm: false });
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({});
  const [pwFocused, setPwFocused] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const validate = (field, value) => {
    switch (field) {
      case "password":
        return PW_RULES.every((r) => r.test(value))
          ? ""
          : "Password does not meet all requirements.";
      case "confirmPassword":
        return value !== form.password ? "Passwords do not match." : "";
      default:
        return "";
    }
  };

  const clientErrors = {
    password: touched.password ? validate("password", form.password) : "",
    confirmPassword: touched.confirmPassword ? validate("confirmPassword", form.confirmPassword) : "",
  };

  const isFormValid = !validate("password", form.password) && !validate("confirmPassword", form.confirmPassword);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  };

  const handleBlur = (e) => {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
    if (e.target.name === "password") setPwFocused(false);
  };

  const handlePwFocus = () => setPwFocused(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing reset link.");
      return;
    }
    if (!isFormValid) return;

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => router.push('/login'), 2000);
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
        <img src="sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.pgdescription}>
            Please kindly set your new password below
          </p>

          {error && (
            <div style={{ color: 'red', fontSize: '13px', marginBottom: '8px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={show.password ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handlePwFocus}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShow((p) => ({ ...p, password: !p.password }))}
                  aria-label="Toggle password visibility"
                >
                  {show.password ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>

              {/* Strength bar — inline styles, no extra CSS needed */}
              {strength && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        style={{
                          height: '4px',
                          flex: 1,
                          borderRadius: '2px',
                          background: n <= strength.level ? strength.color : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: strength.color, whiteSpace: 'nowrap' }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Rules list — inline styles */}
              {form.password && (pwFocused || !allRulesPassed) && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: '12px' }}>
                  {PW_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li
                        key={rule.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: ok ? '#276749' : '#e53e3e',
                          marginBottom: '2px',
                        }}
                      >
                        {ok ? <FiCheck size={11} /> : <FiX size={11} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={show.confirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
                  aria-label="Toggle confirm password visibility"
                >
                  {show.confirm ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
              {touched.confirmPassword && clientErrors.confirmPassword && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {clientErrors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className={styles.btn} disabled={loading || !isFormValid}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {message && (
              <p className={styles.pgdescription} style={{ color: 'green', marginTop: '10px' }}>
                {message}
              </p>
            )}

            <div className={styles.auxiliaryGroup}>
              <a href="/login" className={styles.backtoLogin}>
                <IoIosArrowBack /> Back to Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
