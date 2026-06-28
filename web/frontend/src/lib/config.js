function normalizeApiUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getApiUrl() {
  return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || "");
}

export const API_URL = getApiUrl();
