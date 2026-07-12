"use client";

import { useEffect } from "react";

const STORAGE_KEY = "savira-internal-display-prefs";

export default function DisplayPreferencesClient() {
  useEffect(() => {
    try {
      const prefs = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
      if (prefs.fontSize) document.documentElement.dataset.fontSize = prefs.fontSize;
      if (prefs.reducedMotion !== undefined) {
        document.documentElement.dataset.reducedMotion = prefs.reducedMotion ? "true" : "false";
      }
      if (prefs.highContrast !== undefined) {
        document.documentElement.dataset.highContrast = prefs.highContrast ? "true" : "false";
      }
      if (prefs.screenReaderHints !== undefined) {
        document.documentElement.dataset.screenReaderHints = prefs.screenReaderHints ? "true" : "false";
      }
      if (prefs.theme === "light" || prefs.theme === "dark") {
        document.documentElement.dataset.theme = prefs.theme;
      }
    } catch {
      // Display preferences are optional; a bad local value should not block app rendering.
    }
  }, []);

  return null;
}
