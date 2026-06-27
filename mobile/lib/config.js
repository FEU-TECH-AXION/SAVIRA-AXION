import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  extra.apiUrl ||
  'https://www.saviraphilippines.org'
).replace(/\/$/, '');

export const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  extra.mapboxToken ||
  '';
