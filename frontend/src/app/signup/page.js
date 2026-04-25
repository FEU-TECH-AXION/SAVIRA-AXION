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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      alert("Please agree to the Terms & Conditions.");
      return;
    }
    console.log("Form submitted:", form);
    // TODO: connect to backend API
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay + logo ── */}
      <div className={styles.left}>
        <img
          src="sasha-bg-1.png"
          alt="SASHA community"
        />
        <div className={styles.leftOverlay} />

        {/* Logo */}
        <div className={styles.logo}>
          <img
            src="sasha-logo.png"
            alt="SASHA logo"
          />
        </div>
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

            {/* First + Last Name */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className={styles.label}>First Name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-6">
                <label className={styles.label}>Last Name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className={styles.label}>E-mail</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
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
            </div>

            {/* Terms checkbox */}
            <div className="mb-4">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                I agree to <a href="/terms">Terms &amp; Condition</a>
              </label>
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