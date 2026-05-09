"use client";

import { useState } from "react";
import styles from "./signup.module.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState([]); 

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getError = (field) => errors.find((e) => e.path === field)?.msg;
  const getErrorLink = (field) => errors.find((e) => e.path === field)?.link;

  const handleSubmit = async (e) => {
    e.preventDefault();

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
          agreed:    agreed,
        }),
      });

      const data = await res.json();
      console.log('Status:', res.status);
      console.log('Response:', data);

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors([{ path: 'general', msg: data.error || 'Signup failed.' }]);
        }
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setErrors([{ path: 'general', msg: 'Something went wrong. Please try again.' }]);
      console.error(err);
    }
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay*/}
      <div className={styles.left}>
        <img src="sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      {/* ── Right: sign-up form ── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.loginLink}>
            Already have an account?&nbsp;
            <a href="/login">Log In</a>
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* General error e.g. "Email already in use" */}
            {getError('general') && (
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '8px' }}>
                {getError('general')}
              </p>
            )}

            {/* First + Last Name */}
            <div className={styles.nameRow}>
              <div className={styles.nameField}>
                <label className={styles.label}>First Name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                />
                {/* Error text shown under input */}
                {getError('firstName') && (
                  <p style={{ color: 'red', fontSize: '12px' }}>{getError('firstName')}</p>
                )}
              </div>
              <div className={styles.nameField}>
                <label className={styles.label}>Last Name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                />
                {getError('lastName') && (
                  <p style={{ color: 'red', fontSize: '12px' }}>{getError('lastName')}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
              />
              {getError('email') && (
                <p style={{ color: 'red', fontSize: '12px' }}>
                  {getError('email')}
                  {getErrorLink('email') && (
                    <a
                      href={getErrorLink('email').href}
                      style={{ marginLeft: 4, color: 'red', textDecoration: 'underline' }}
                    >
                      {getErrorLink('email').label}
                    </a>
                  )}
                </p>
              )}
            </div>

            {/* Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
              {getError('password') && (
                <p style={{ color: 'red', fontSize: '12px' }}>{getError('password')}</p>
              )}
            </div>

            {/* Terms checkbox */}
            <div className={styles.termsGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                I agree to <a href="/terms">Terms &amp; Condition</a>
              </label>
              {/* Error shown directly under the checkbox */}
              {getError('agreed') && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {getError('agreed')}
                </p>
  )}
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              Create Account
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}