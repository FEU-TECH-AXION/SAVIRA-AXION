"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import styles from "./login.module.css";

const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

export default function LoginForm() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/internal-auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = Array.isArray(data.errors)
        ? data.errors.map((item) => item.msg).join(" ")
        : data.error || "Unable to sign in.";
      setError(message);
      setIsSubmitting(false);
      return;
    }

    window.location.assign(data.redirectTo || "/dashboard");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="internal-email">Email</label>
        <input
          id="internal-email"
          className={styles.input}
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
        />
      </div>

      <div className={styles.fieldGroupLg}>
        <label className={styles.label} htmlFor="internal-password">Password</label>
        <div className={styles.passwordWrap}>
          <input
            id="internal-password"
            className={styles.input}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label="Toggle password visibility"
          >
            {showPassword ? <FiEye /> : <FiEyeOff />}
          </button>
        </div>
      </div>

      <div className={styles.auxiliaryGroup}>
        <a href={`${FRONTEND_URL}/forgotPassword`} className={styles.forgotPassword}>
          Forgot Password?
        </a>
      </div>

      <button className={styles.btn} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Log In"}
      </button>
    </form>
  );
}
