"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
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
    
    // TODO: connect to backend API
        try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      console.log('Status:', res.status);
      console.log('Response:', data);

      if (!res.ok) {
        alert(data.error || "Login failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";

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
          <h1 className={styles.title}>Welcome Back!</h1>
          <p className={styles.loginLink}>
            Don't have an account yet?&nbsp;
            <a href="/signup">Sign Up</a>
          </p>

          <form onSubmit={handleSubmit} noValidate>

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
                Recognize this device for 30 days
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              Log In
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}