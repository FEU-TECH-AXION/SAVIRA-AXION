"use client";

import { useEffect, useState } from "react";
import { FiCheck } from "react-icons/fi";
import styles from "./DisplayAccessibilityTab.module.css";

const STORAGE_KEY = "savira-internal-display-prefs";

const DEFAULT_PREFS = {
  fontSize: "md",
  theme: "system",
  reducedMotion: false,
  highContrast: false,
  screenReaderHints: false,
};

const FONT_SIZES = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra Large" },
];

const THEMES = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

function readPrefs() {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefs(prefs) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.fontSize = prefs.fontSize;
  document.documentElement.dataset.reducedMotion = prefs.reducedMotion ? "true" : "false";
  document.documentElement.dataset.highContrast = prefs.highContrast ? "true" : "false";
  document.documentElement.dataset.screenReaderHints = prefs.screenReaderHints ? "true" : "false";

  if (prefs.theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = prefs.theme;
  }
}

export default function DisplayAccessibilityTab({ t }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = readPrefs();
    setPrefs(stored);
    applyPrefs(stored);
  }, []);

  const updatePrefs = (updates) => {
    setPrefs((current) => {
      const next = { ...current, ...updates };
      applyPrefs(next);
      return next;
    });
  };

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    applyPrefs(prefs);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.wrap}>
      {saved && (
        <div className={styles.flashSuccess}>
          <FiCheck size={16} /> {t("preferencesSaved")}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>{t("textReadability")}</div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t("fontSize")}</label>
          <div className={styles.segmentGroup}>
            {FONT_SIZES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={prefs.fontSize === id}
                className={`${styles.segmentBtn} ${prefs.fontSize === id ? styles.segmentBtnActive : ""}`}
                onClick={() => updatePrefs({ fontSize: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Theme</div>
        <div className={styles.themeGrid}>
          {THEMES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={prefs.theme === id}
              className={`${styles.themeCard} ${prefs.theme === id ? styles.themeCardActive : ""}`}
              onClick={() => updatePrefs({ theme: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>{t("accessibility")}</div>

        <ToggleRow
          label={t("reduceMotion")}
          description={t("reduceMotionDesc")}
          active={prefs.reducedMotion}
          onToggle={() => updatePrefs({ reducedMotion: !prefs.reducedMotion })}
        />
        <ToggleRow
          label={t("highContrast")}
          description={t("highContrastDesc")}
          active={prefs.highContrast}
          onToggle={() => updatePrefs({ highContrast: !prefs.highContrast })}
        />
        <ToggleRow
          label={t("extendedLabels")}
          description={t("extendedLabelsDesc")}
          active={prefs.screenReaderHints}
          onToggle={() => updatePrefs({ screenReaderHints: !prefs.screenReaderHints })}
        />
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnPrimary} onClick={handleSave}>
          {t("savePreferences")}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, active, onToggle }) {
  return (
    <label className={styles.toggleRow}>
      <div>
        <p className={styles.toggleRowLabel}>{label}</p>
        <p className={styles.toggleRowDesc}>{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={active}
        className={`${styles.toggle} ${active ? styles.toggleOn : ""}`}
        onClick={onToggle}
      >
        <div className={styles.toggleKnob} />
      </button>
    </label>
  );
}
