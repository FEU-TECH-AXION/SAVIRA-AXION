"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readDisplayPrefs, saveDisplayPrefs } from "@/lib/displayPreferences";
import en from "@/locales/en.json";
import tl from "@/locales/tl.json";

export const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "tl", label: "Tagalog" },
];

const MESSAGES = { en, tl };

export function normalizeLanguage(language) {
  const value = String(language || "").trim().toLowerCase();
  if (["tl", "tgl", "tagalog", "fil", "filipino"].includes(value)) return "tl";
  if (["en", "eng", "english"].includes(value)) return "en";
  return LANGUAGE_OPTIONS.some((item) => item.id === value) ? value : "en";
}

export function getCurrentLanguage() {
  return normalizeLanguage(readDisplayPrefs().language);
}

export function setCurrentLanguage(language) {
  const prefs = readDisplayPrefs();
  const nextLanguage = saveDisplayPrefs({ ...prefs, language: normalizeLanguage(language) }).language;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("savira:languagechange", { detail: { language: nextLanguage } }));
  }
  return nextLanguage;
}

export function translate(language, key) {
  const lang = normalizeLanguage(language);
  return MESSAGES[lang]?.[key] || MESSAGES.en[key] || key;
}

const I18nContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguageState(normalizeLanguage(event.detail?.language || getCurrentLanguage()));
    };

    window.addEventListener("savira:languagechange", handleLanguageChange);
    window.addEventListener("storage", handleLanguageChange);
    return () => {
      window.removeEventListener("savira:languagechange", handleLanguageChange);
      window.removeEventListener("storage", handleLanguageChange);
    };
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage: (nextLanguage) => setLanguageState(setCurrentLanguage(nextLanguage)),
    t: (key) => translate(language, key),
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
