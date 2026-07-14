"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import styles from "./login.module.css";
import { useI18n } from "@/lib/i18n";

export default function LoginForm() {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recognizeDevice, setRecognizeDevice] = useState(true);

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
        : data.error || t("unableToSignIn");
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
        <label className={styles.label} htmlFor="internal-email">{t("email")}</label>
        <input
          id="internal-email"
          className={styles.input}
          name="email"
          type="email"
          placeholder={t("email")}
          autoComplete="email"
          required
        />
      </div>

      <div className={styles.fieldGroupLg}>
        <label className={styles.label} htmlFor="internal-password">{t("password")}</label>
        <div className={styles.passwordWrap}>
          <input
            id="internal-password"
            className={styles.input}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("password")}
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
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={recognizeDevice}
            onChange={(event) => setRecognizeDevice(event.target.checked)}
          />
          <span className={styles.checkboxText}>{t("recognizeDevice")}</span>
        </label>
        <a href="/forgotPassword" className={styles.forgotPassword}>
          {t("forgotPassword")}
        </a>
      </div>

      <button className={styles.btn} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("signingIn") : t("logIn")}
      </button>
    </form>
  );
}
