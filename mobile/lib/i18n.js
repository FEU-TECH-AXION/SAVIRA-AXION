import {
  readDisplayPrefs,
  saveDisplayPrefs,
} from './displayPreferences';
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

export async function readLanguage() {
  const prefs = await readDisplayPrefs();
  return normalizeLanguage(prefs.language);
}

export async function saveLanguage(language) {
  const prefs = await readDisplayPrefs();
  const saved = await saveDisplayPrefs({ ...prefs, language: normalizeLanguage(language) });
  return normalizeLanguage(saved.language);
}
