"use client";

import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { applyDisplayPrefs, readDisplayPrefs, saveDisplayPrefs } from "@/lib/displayPreferences";
import styles from "./DisplayAccessibilityTab.module.css";

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
  const [prefs, setPrefs] = useState(() => readDisplayPrefs());
  const [saved, setSaved] = useState(false);

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
        <div className={styles.flashSuccess}><FiCheck size={16} /> Display preferences saved!</div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Text &amp; Readability</div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Font size</label>
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

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Language</label>
          <select
            className={styles.select}
            value={prefs.language}
            onChange={(e) => updatePrefs({ language: e.target.value })}
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
            <p className={styles.toggleRowLabel}>High contrast</p>
            <p className={styles.toggleRowDesc}>Increases contrast between text and backgrounds for better readability.</p>
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
            <p className={styles.toggleRowLabel}>Extended screen reader labels</p>
            <p className={styles.toggleRowDesc}>Adds more descriptive labels for screen reader and assistive technology users.</p>
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
          Save Preferences
        </button>
      </div>
    </div>
  );
}
