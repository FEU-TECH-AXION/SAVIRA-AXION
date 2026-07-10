export function getBackendUrl() {
  return (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
}

export function getSessionMaxAge() {
  const value = Number(process.env.INTERNAL_SESSION_MAX_AGE_SECONDS || 7200);
  return Number.isFinite(value) && value > 0 ? value : 7200;
}
