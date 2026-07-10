"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { internalApiFetch } from "@/lib/internalApiFetch";

const AuthContext = createContext(null);

export function authHeaders(headers = {}) {
  return headers;
}

export function authFetch(url, options = {}) {
  return internalApiFetch(url, options);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    fetch("/api/internal-auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (mounted) setUser(data.user || null);
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

  async function logout() {
    await fetch("/api/internal-auth/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => null);
    setUser(null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
