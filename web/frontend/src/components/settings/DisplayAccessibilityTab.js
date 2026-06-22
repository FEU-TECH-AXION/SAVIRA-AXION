"use client";

import { useState } from "react";
import { FiSun, FiMoon, FiMonitor, FiCheck } from "react-icons/fi";
import styles from "./DisplayAccessibilityTab.module.css";

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: FiSun },
  { id: "dark", label: "Dark", icon: FiMoon },
  { id: "system", label: "System", icon: FiMonitor },
];

const FONT_SIZES = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra Large" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "fil", label: "Filipino" },
];

export default function DisplayAccessibilityTab() {
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("md");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderHints, setScreenReaderHints] = useState(true);
  const [language, setLanguage] = useState("en");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Persisted via a settings endpoint once available; for now reflected locally.
    try {
      localStorage.setItem(
        "savira_display_prefs",
        JSON.stringify({ theme, fontSize, reducedMotion, highContrast, screenReaderHints, language })
      );
    } catch {
      // localStorage may be unavailable (private mode); fail silently.
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.wrap}>
      {saved && (
        <div className={styles.flashSuccess}><FiCheck size={16} /> Display preferences saved!</div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Theme</div>
        <p className={styles.cardDesc}>Choose how Savira looks on this device.</p>
        <div className={styles.themeGrid}>
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.themeCard} ${theme === id ? styles.themeCardActive : ""}`}
              onClick={() => setTheme(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Text &amp; Readability</div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Font size</label>
          <div className={styles.segmentGroup}>
            {FONT_SIZES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`${styles.segmentBtn} ${fontSize === id ? styles.segmentBtnActive : ""}`}
                onClick={() => setFontSize(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Language</label>
          <select
            className={styles.select}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Accessibility</div>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>Reduce motion</p>
            <p className={styles.toggleRowDesc}>Minimizes animations and transitions throughout the app.</p>
          </div>
          <div
            className={`${styles.toggle} ${reducedMotion ? styles.toggleOn : ""}`}
            onClick={() => setReducedMotion((v) => !v)}
          >
            <div className={styles.toggleKnob} />
          </div>
        </label>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>High contrast</p>
            <p className={styles.toggleRowDesc}>Increases contrast between text and backgrounds for better readability.</p>
          </div>
          <div
            className={`${styles.toggle} ${highContrast ? styles.toggleOn : ""}`}
            onClick={() => setHighContrast((v) => !v)}
          >
            <div className={styles.toggleKnob} />
          </div>
        </label>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>Extended screen reader labels</p>
            <p className={styles.toggleRowDesc}>Adds more descriptive labels for screen reader and assistive technology users.</p>
          </div>
          <div
            className={`${styles.toggle} ${screenReaderHints ? styles.toggleOn : ""}`}
            onClick={() => setScreenReaderHints((v) => !v)}
          >
            <div className={styles.toggleKnob} />
          </div>
        </label>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnPrimary} onClick={handleSave}>
          Save Preferences
        </button>
      </div>
    </div>
  );
}