"use client";

import { useState } from "react";
import styles from "./signup.module.css";
import { FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";

// ── Password strength check ───────────────────────────────────
const PW_RULES = [
  { id: "len",     label: "At least 8 characters",         test: (p) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",           test: (p) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter",           test: (p) => /[a-z]/.test(p) },
  { id: "digit",   label: "One number",                     test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#$…)",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 1, label: "Weak",        color: "#e53e3e" };
  if (passed === 2) return { level: 2, label: "Fair",        color: "#ed8936" };
  if (passed === 3) return { level: 3, label: "Good",        color: "#3182ce" };
  if (passed === 4) return { level: 4, label: "Strong",      color: "#38a169" };
  return              { level: 5, label: "Very Strong",  color: "#276749" };
}

export default function SignUp() {
  const [show, setShow]     = useState({ password: false, confirm: false });
  const [agreed, setAgreed] = useState(false);
  const [form, setForm]     = useState({
    firstName:       "",
    lastName:        "",
    email:           "",
    password:        "",
    confirmPassword: "",
  });
  const [touched, setTouched]     = useState({});
  const [errors, setErrors]       = useState([]); // server errors
  const [loading, setLoading]     = useState(false);
  const [pwFocused, setPwFocused] = useState(false); // controls checklist popover

  // ── Client-side field validation ─────────────────────────────
  const validate = (field, value) => {
    switch (field) {
      case "firstName":
        return !value.trim() ? "First name is required." : "";
      case "lastName":
        return !value.trim() ? "Last name is required." : "";
      case "email":
        return !value.trim()
          ? "Email is required."
          : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? "Enter a valid email address."
          : "";
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

  const clientErrors = Object.fromEntries(
    Object.keys(form).map((k) => [k, touched[k] ? validate(k, form[k]) : ""])
  );

  const isFormValid =
    Object.keys(form).every((k) => !validate(k, form[k])) && agreed;

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  };

  const handleBlur = (e) => {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
    if (e.target.name === "password") setPwFocused(false);
  };

  const handlePwFocus = () => setPwFocused(true);

  const getServerError = (field) => errors.find((e) => e.path === field)?.msg;
  const getServerErrorLink = (field) => errors.find((e) => e.path === field)?.link;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });
    if (!isFormValid) return;

    setLoading(true);
    setErrors([]);

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          password:  form.password,
          agreed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors([{ path: "general", msg: data.error || "Sign up failed." }]);
        }
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setErrors([{ path: "general", msg: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password ? getStrength(form.password) : null;
  const allRulesPassed = PW_RULES.every((r) => r.test(form.password));

  return (
    <div className={styles.wrapper}>

      {/* ── Left hero ───────────────────────────── */}
      <div className={styles.left}>
        <img src="/sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      {/* ── Right form ──────────────────────────── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.loginLink}>
            Already have an account? <a href="/login">Log In</a>
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {getServerError("general") && (
              <div className={styles.alertError}>
                {getServerError("general")}
              </div>
            )}

            {/* Name row */}
            <div className={styles.nameRow}>
              <FormField
                label="First Name"
                required
                error={clientErrors.firstName || getServerError("firstName")}
              >
                <input
                  className={`${styles.input} ${clientErrors.firstName ? styles.inputError : ""}`}
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="given-name"
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={clientErrors.lastName || getServerError("lastName")}
              >
                <input
                  className={`${styles.input} ${clientErrors.lastName ? styles.inputError : ""}`}
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            {/* Email */}
            <FormField
              label="Email"
              required
              error={clientErrors.email || getServerError("email")}
              errorLink={getServerErrorLink("email")}
            >
              <input
                className={`${styles.input} ${clientErrors.email ? styles.inputError : ""}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
              />
            </FormField>

            {/* Password */}
            <FormField label="Password" required error={""}>
              {/* FIX: use passwordWrap (matches CSS), not pwWrap */}
              <div className={styles.passwordWrap}>
                <input
                  className={`${styles.input} ${
                    touched.password && clientErrors.password ? styles.inputError : ""
                  }`}
                  type={show.password ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
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
                  {show.password ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
              </div>

              {/* Strength bar — shown only when typing */}
              {strength && (
                <div className={styles.strengthRow}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={styles.strengthBar}
                        style={{
                          background: n <= strength.level ? strength.color : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Rules popover — only shown while focused or not all rules passed yet */}
              {form.password && (pwFocused || !allRulesPassed) && (
                <div className={styles.pwRulesPopover}>
                  <p className={styles.pwRulesTitle}>Password requirements</p>
                  <ul className={styles.pwRules}>
                    {PW_RULES.map((rule) => {
                      const ok = rule.test(form.password);
                      return (
                        <li key={rule.id} className={ok ? styles.ruleOk : styles.ruleFail}>
                          <span className={styles.ruleIcon}>
                            {ok ? <FiCheck size={11} /> : <FiX size={11} />}
                          </span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </FormField>

            {/* Confirm Password */}
            <FormField
              label="Confirm Password"
              required
              error={clientErrors.confirmPassword}
            >
              {/* FIX: use passwordWrap (matches CSS), not pwWrap */}
              <div className={styles.passwordWrap}>
                <input
                  className={`${styles.input} ${
                    clientErrors.confirmPassword ? styles.inputError : ""
                  }`}
                  type={show.confirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                />
                {/* FIX: eye button now correctly toggles show.confirm */}
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
                  aria-label="Toggle confirm password visibility"
                >
                  {show.confirm ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
              </div>

              {/* Match indicator */}
              {/* {form.confirmPassword && form.password && (
                <p className={
                  form.confirmPassword === form.password
                    ? styles.matchOk
                    : styles.matchFail
                }>
                  {form.confirmPassword === form.password
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )} */}
            </FormField>

            {/* Terms */}
            <div className={styles.termsGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                I agree to the <a href="/terms">Terms &amp; Conditions</a> and{" "}
                <a href="/privacy">Privacy Policy</a>
              </label>
              {getServerError("agreed") && (
                <p className={styles.fieldError}>{getServerError("agreed")}</p>
              )}
            </div>

            <button
              type="submit"
              className={styles.btn}
              disabled={loading || !isFormValid}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

// ── FormField wrapper ─────────────────────────────────────────
function FormField({ label, required, error, errorLink, children }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {error && (
        <p className={styles.fieldError}>
          {error}
          {errorLink && (
            <a href={errorLink.href} style={{ marginLeft: 4, textDecoration: "underline" }}>
              {errorLink.label}
            </a>
          )}
        </p>
      )}
    </div>
  );
}