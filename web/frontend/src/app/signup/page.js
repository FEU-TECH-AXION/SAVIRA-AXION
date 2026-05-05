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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      alert("Please agree to the Terms & Conditions.");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          password:  form.password,
        }),
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data); 

    if (!res.ok) {
      alert(data.message || data.error || "Signup failed.");
      return;
    }

    // Save token and redirect
    localStorage.setItem("token", data.token);
    window.location.href = "/dashboard"; // or wherever
  } catch (err) {
    alert("Something went wrong. Please try again.");
    console.error(err);
  }
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay*/}
      <div className={styles.left}>
        <img
          src="sasha-bg-1.png"
          alt="SASHA community"
        />
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
                  required
                />
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
                  required
                />
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
                required
              />
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