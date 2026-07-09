import {
  readDisplayPrefs,
  saveDisplayPrefs,
} from './displayPreferences';
import { useEffect, useState } from 'react';
import en from '../locales/en.json';
import tl from '../locales/tl.json';

export const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English' },
  { id: 'tl', label: 'Tagalog' },
];

const MESSAGES = { en, tl };

export function normalizeLanguage(language) {
  if (language === 'fil') return 'tl';
  return LANGUAGE_OPTIONS.some((option) => option.id === language) ? language : 'en';
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

export async function readLanguage() {
  const prefs = await readDisplayPrefs();
  return normalizeLanguage(prefs.language);
}

export async function saveLanguage(language) {
  const prefs = await readDisplayPrefs();
  const saved = await saveDisplayPrefs({ ...prefs, language: normalizeLanguage(language) });
  return normalizeLanguage(saved.language);
}

export function useI18n() {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    readLanguage().then(setLanguageState);
  }, []);

  const setLanguage = async (nextLanguage) => {
    const savedLanguage = await saveLanguage(nextLanguage);
    setLanguageState(savedLanguage);
    return savedLanguage;
  };

  return {
    language,
    setLanguage,
    t: (key, replacements) => translateText(language, key, replacements),
  };
}
