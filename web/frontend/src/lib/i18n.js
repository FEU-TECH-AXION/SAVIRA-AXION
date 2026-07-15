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
  return language === "fil" ? "tl" : LANGUAGE_OPTIONS.some((item) => item.id === language) ? language : "en";
}

export function getCurrentLanguage() {
  return normalizeLanguage(readDisplayPrefs().language);
}

export function setCurrentLanguage(language) {
  const prefs = readDisplayPrefs();
  const nextLanguage = saveDisplayPrefs({ ...prefs, language: normalizeLanguage(language) }).language;
  window.dispatchEvent(new CustomEvent("savira:languagechange", { detail: { language: nextLanguage } }));
  return nextLanguage;
}

export function translate(language, key) {
  const lang = normalizeLanguage(language);
  return MESSAGES[lang]?.[key] || MESSAGES.en[key] || key;
}

export function translateText(language, text, replacements = {}) {
  const template = translate(language, text);
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
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
