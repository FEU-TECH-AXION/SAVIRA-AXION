"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";
import { FiCheck, FiGlobe } from "react-icons/fi";
import { LANGUAGE_OPTIONS, useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
  };

  return (
    <main className={styles.wrapper}>
      <div className={styles.left}>
        <img src="/sasha-bg-1.png" alt="SASHA community" />
        <div className={styles.leftOverlay} />
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.title}>{t("welcomeBack")}</h1>
          <p className={styles.loginLink}>{t("internalAccessOnly")}</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className={styles.languagePicker} aria-label={t("language")}>
            <div className={styles.languageLabel}>
              <FiGlobe aria-hidden="true" />
              <span>{t("language")}</span>
            </div>
            <div className={styles.languageOptions}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.languageOption} ${isActive ? styles.languageOptionActive : ""}`}
                    aria-pressed={isActive}
                    onClick={() => handleLanguageChange(option.id)}
                  >
                    <span>{option.label}</span>
                    {isActive && <FiCheck aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
