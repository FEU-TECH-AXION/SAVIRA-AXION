function normalizeInternalApiPath(input) {
  const raw = input instanceof URL ? input.toString() : String(input || "");

  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    return `${url.pathname}${url.search}`;
  }

  return raw;
}

function toProxyPath(input) {
  const path = normalizeInternalApiPath(input);

  if (path.startsWith("/api/backend/")) return path;
  if (path === "/api/backend") return path;
  if (path.startsWith("/api/")) return `/api/backend/${path.slice(5)}`;
  if (path.startsWith("/")) return `/api/backend${path}`;
  return `/api/backend/${path}`;
}

export function internalApiFetch(url, options = {}) {
  return fetch(toProxyPath(url), {
    ...options,
    credentials: options.credentials || "include",
  });
}

export const API_URL = "";
