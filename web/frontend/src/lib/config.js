const RAILWAY_API_URL = "https://savira-axion-production.up.railway.app";
const RETIRED_API_HOSTS = new Set(["savira-axion-api.vercel.app"]);

function normalizeApiUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (RETIRED_API_HOSTS.has(url.hostname)) return RAILWAY_API_URL;
    return url.origin;
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getApiUrl() {
  const configured = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocal ? "http://localhost:5000" : RAILWAY_API_URL;
  }

  return process.env.NODE_ENV === "production" ? RAILWAY_API_URL : "http://localhost:5000";
}

export const API_URL = getApiUrl();
