"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib/AuthContext";
import { LANGUAGE_OPTIONS, getCurrentLanguage, setCurrentLanguage, translate } from "@/lib/i18n";

export default function Login() {
  const [language, setLanguage] = useState(() => getCurrentLanguage());
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState([]);

  const { login } = useAuth();
  const router = useRouter();
  const t = (key) => translate(language, key);

  const handleLanguageChange = (e) => {
    setLanguage(setCurrentLanguage(e.target.value));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getError = (field) => errors.find((e) => e.path === field)?.msg;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const fieldErrors = [];
    if (!form.email.trim()) fieldErrors.push({ path: 'email', msg: t('emailRequired') });
    if (!form.password) fieldErrors.push({ path: 'password', msg: t('passwordRequired') });
    if (fieldErrors.length) {
      setErrors(fieldErrors);
      return;
    }

    try {
      const data = await login(form.email, form.password);
      if (data?.verificationRequired) {
        router.push(`/verify-email?purpose=login&email=${encodeURIComponent(data.email)}`);
      }
    } catch (err) {
      // err could be an array or a single error object
      if (Array.isArray(err)) {
        setErrors(err);
      } else {
        setErrors([{ path: 'general', msg: t('loginFailed') }]);
      }
    }
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Left: hero image + overlay*/}
      <div className={styles.left}>
        <img src="sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      {/* ── Right: login form ── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <div className={styles.languagePicker}>
            <label htmlFor="login-language">{t("language")}</label>
            <select id="login-language" value={language} onChange={handleLanguageChange}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <h1 className={styles.title}>{t("welcomeBack")}</h1>
          <p className={styles.loginLink}>
            {t("noAccount")}&nbsp;
            <a href="/signup">{t("signUp")}</a>
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* General error e.g. "Invalid email or password" */}
            {getError('general') && (
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '8px' }}>
                {getError('general')}
              </p>
            )}

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t("email")}</label>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder={t("email")}
                value={form.email}
                onChange={handleChange}
              />
              {/* Error shown under email */}
              {getError('email') && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {getError('email')}
                </p>
              )}
            </div>

            {/* Password */}
            <div className={styles.fieldGroupLg}>
              <label className={styles.label}>{t("password")}</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("password")}
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
              {/* Error shown under password */}
              {getError('password') && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {getError('password')}
                </p>
              )}
            </div>

            {/* Remember device + Forgot Password */}
            <div className={styles.auxiliaryGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className={styles.checkboxText}>
                  {t("recognizeDevice")}
                </span>
              </label>
              <a href="/forgotPassword" className={styles.forgotPassword}>
                {t("forgotPassword")}
              </a>
            </div>

            {/* Submit */}
            <button type="submit" className={styles.btn}>
              {t("logIn")}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
