import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISPLAY_PREFS_KEY = 'savira_display_prefs';

export const DEFAULT_DISPLAY_PREFS = {
  theme: 'light',
  themeDefaultMigrated: true,
  fontSize: 'md',
  reducedMotion: false,
  highContrast: false,
  screenReaderHints: true,
  language: 'en',
};

export function normalizeDisplayPrefs(value) {
  return {
    ...DEFAULT_DISPLAY_PREFS,
    ...(value && typeof value === 'object' ? value : {}),
  };
}

export async function readDisplayPrefs() {
  try {
    const raw = await AsyncStorage.getItem(DISPLAY_PREFS_KEY);
    const prefs = normalizeDisplayPrefs(raw ? JSON.parse(raw) : null);

    if (prefs.theme === 'system' && prefs.themeDefaultMigrated !== true) {
      const migrated = { ...prefs, theme: 'light', themeDefaultMigrated: true };
      await AsyncStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return prefs;
  } catch {
    return DEFAULT_DISPLAY_PREFS;
  }
}

export async function saveDisplayPrefs(prefs) {
  const normalized = normalizeDisplayPrefs(prefs);
  await AsyncStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(normalized));
  return normalized;
}
