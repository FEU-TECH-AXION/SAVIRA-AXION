"use client";

export const DISPLAY_PREFS_KEY = "savira_display_prefs";

export const DEFAULT_DISPLAY_PREFS = {
  theme: "system",
  fontSize: "md",
  reducedMotion: false,
  highContrast: false,
  screenReaderHints: true,
  language: "en",
};

export function normalizeDisplayPrefs(value) {
  return {
    ...DEFAULT_DISPLAY_PREFS,
    ...(value && typeof value === "object" ? value : {}),
  };
}

export function readDisplayPrefs() {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_PREFS;

  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFS_KEY);
    return normalizeDisplayPrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_DISPLAY_PREFS;
  }
}

export function saveDisplayPrefs(prefs) {
  const normalized = normalizeDisplayPrefs(prefs);

  try {
    window.localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be blocked in private mode; the active page still updates.
  }

  applyDisplayPrefs(normalized);
  return normalized;
}

export function applyDisplayPrefs(prefs) {
  if (typeof document === "undefined") return;

  const normalized = normalizeDisplayPrefs(prefs);
  const root = document.documentElement;
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = normalized.theme === "system" ? (systemDark ? "dark" : "light") : normalized.theme;

  root.dataset.theme = resolvedTheme;
  root.dataset.fontSize = normalized.fontSize;
  root.dataset.reducedMotion = normalized.reducedMotion ? "true" : "false";
  root.dataset.highContrast = normalized.highContrast ? "true" : "false";
  root.dataset.screenReaderHints = normalized.screenReaderHints ? "true" : "false";
  root.lang = normalized.language || DEFAULT_DISPLAY_PREFS.language;
}
