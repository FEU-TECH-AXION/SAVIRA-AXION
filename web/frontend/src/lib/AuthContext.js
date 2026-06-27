// ── AuthContext: Global authentication state management ──
// Manages user login/logout using httpOnly cookies and provides auth context to all pages.
// Verifies the session via /api/auth/me on mount (the browser sends the httpOnly
// cookie automatically on cross-domain requests; we can't read it via document.cookie
// since the backend lives on a different domain than the frontend).

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const AuthContext = createContext(null);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function setStoredToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("token", token);
  } else {
    window.localStorage.removeItem("token");
  }
}

export function authHeaders(headers = {}) {
  const token = getStoredToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: options.credentials || "include",
    headers: authHeaders(options.headers || {}),
  });
}

// ── Role → dashboard route map ───────────────────────────
const ROLE_REDIRECT = {
  "user":             "/dashboard",
  "complainant":      "/dashboard",
  "admin":            "/dashboard",
  "case officer":     "/dashboard",
  "staff":            "/dashboard",
  "legal personnel":  "/dashboard",
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while we check session
  const router                = useRouter();

  // ── On mount: verify session with the backend ──
  useEffect(() => {
    let mounted = true;

    fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
      headers: authHeaders(),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (mounted) setUser(data.user);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ── Login ────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include", // ← cookie gets set by backend
      body:        JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Re-throw so login page can display errors
      throw data.errors || [{ path: "general", msg: data.error || "Login failed." }];
    }

    setUser(data.user);
    setStoredToken(data.token);

    // Redirect based on role
    const role     = data.user?.role_name?.toLowerCase() ?? "user";
    const redirect = ROLE_REDIRECT[role] ?? "/dashboard";
    router.push(redirect);

    return data;
  };

  // ── Logout ───────────────────────────────────────────────
  const logout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method:      "POST",
      headers:     authHeaders(),
      credentials: "include",
    });
    setUser(null);
    setStoredToken(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
