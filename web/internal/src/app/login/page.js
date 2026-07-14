"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";
import { LANGUAGE_OPTIONS, useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  return (
    <main className={styles.wrapper}>
      <div className={styles.left}>
        <img src="/sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <div className={styles.languagePicker}>
            <label htmlFor="internal-login-language">{t("language")}</label>
            <select id="internal-login-language" value={language} onChange={handleLanguageChange}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <h1 className={styles.title}>{t("welcomeBack")}</h1>
          <p className={styles.loginLink}>{t("internalAccessOnly")}</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
