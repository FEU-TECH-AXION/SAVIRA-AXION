"use client";

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
  return saveDisplayPrefs({ ...prefs, language: normalizeLanguage(language) }).language;
}

export function translate(language, key) {
  const lang = normalizeLanguage(language);
  return MESSAGES[lang]?.[key] || MESSAGES.en[key] || key;
}
