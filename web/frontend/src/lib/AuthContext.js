
// ── AuthContext: Global authentication state management ──
// Manages user login/logout using httpOnly cookies and provides auth context to all pages.
// Reads user data from cookies and makes it available via useAuth() hook throughout the app.

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

const AuthContext = createContext(null);

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

  // ── On mount: check if user cookie exists ──
  useEffect(() => {
    const userCookie = getCookie('user');
    if (userCookie) {
      setUser(JSON.parse(userCookie));
    }
    setLoading(false);
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
      credentials: "include",
    });
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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