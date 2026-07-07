"use client";

import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { applyDisplayPrefs, readDisplayPrefs, saveDisplayPrefs } from "@/lib/displayPreferences";
import { LANGUAGE_OPTIONS, normalizeLanguage, translate } from "@/lib/i18n";
import styles from "./DisplayAccessibilityTab.module.css";

const FONT_SIZES = [
  { id: "sm", labelKey: "small" },
  { id: "md", labelKey: "default" },
  { id: "lg", labelKey: "large" },
  { id: "xl", labelKey: "extraLarge" },
];

export default function DisplayAccessibilityTab() {
  const [prefs, setPrefs] = useState(() => readDisplayPrefs());
  const [saved, setSaved] = useState(false);
  const language = normalizeLanguage(prefs.language);
  const t = (key) => translate(language, key);

  const updatePrefs = (updates) => {
    setPrefs((current) => {
      const next = { ...current, ...updates };
      applyDisplayPrefs(next);
      return next;
    });
  };

  const handleSave = () => {
    saveDisplayPrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.wrap}>
      {saved && (
        <div className={styles.flashSuccess}><FiCheck size={16} /> {t("preferencesSaved")}</div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>{t("textReadability")}</div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t("fontSize")}</label>
          <div className={styles.segmentGroup}>
            {FONT_SIZES.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                aria-pressed={prefs.fontSize === id}
                className={`${styles.segmentBtn} ${prefs.fontSize === id ? styles.segmentBtnActive : ""}`}
                onClick={() => updatePrefs({ fontSize: id })}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t("language")}</label>
          <select
            className={styles.select}
            value={language}
            onChange={(e) => updatePrefs({ language: e.target.value })}
          >
            {LANGUAGE_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>{t("accessibility")}</div>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>{t("reduceMotion")}</p>
            <p className={styles.toggleRowDesc}>{t("reduceMotionDesc")}</p>
          </div>
          <button
            type="button"
            aria-pressed={prefs.reducedMotion}
            className={`${styles.toggle} ${prefs.reducedMotion ? styles.toggleOn : ""}`}
            onClick={() => updatePrefs({ reducedMotion: !prefs.reducedMotion })}
          >
            <div className={styles.toggleKnob} />
          </button>
        </label>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>{t("highContrast")}</p>
            <p className={styles.toggleRowDesc}>{t("highContrastDesc")}</p>
          </div>
          <button
            type="button"
            aria-pressed={prefs.highContrast}
            className={`${styles.toggle} ${prefs.highContrast ? styles.toggleOn : ""}`}
            onClick={() => updatePrefs({ highContrast: !prefs.highContrast })}
          >
            <div className={styles.toggleKnob} />
          </button>
        </label>

        <label className={styles.toggleRow}>
          <div>
            <p className={styles.toggleRowLabel}>{t("extendedLabels")}</p>
            <p className={styles.toggleRowDesc}>{t("extendedLabelsDesc")}</p>
          </div>
          <button
            type="button"
            aria-pressed={prefs.screenReaderHints}
            className={`${styles.toggle} ${prefs.screenReaderHints ? styles.toggleOn : ""}`}
            onClick={() => updatePrefs({ screenReaderHints: !prefs.screenReaderHints })}
          >
            <div className={styles.toggleKnob} />
          </button>
        </label>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnPrimary} onClick={handleSave}>
          {t("savePreferences")}
        </button>
      </div>
    </div>
  );
}
