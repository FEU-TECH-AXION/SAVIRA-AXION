import { cookies } from "next/headers";
import { getBackendUrl, getSessionMaxAge } from "@/lib/env";
import { isInternalRole, normalizeRole } from "@/lib/roles";

export const INTERNAL_TOKEN_COOKIE = "savira_internal_token";
export const INTERNAL_USER_COOKIE = "savira_internal_user";

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAge(),
  };
}

export async function setInternalSession(token, user) {
  const cookieStore = await cookies();
  const safeUser = {
    user_id: user?.user_id || user?.id || null,
    email: user?.email || null,
    first_name: user?.first_name || null,
    last_name: user?.last_name || null,
    role_name: user?.role_name || user?.role || null,
    role: normalizeRole(user?.role_name || user?.role),
  };

  cookieStore.set(INTERNAL_TOKEN_COOKIE, token, cookieOptions());
  cookieStore.set(INTERNAL_USER_COOKIE, JSON.stringify(safeUser), cookieOptions());
}

export async function clearInternalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(INTERNAL_TOKEN_COOKIE);
  cookieStore.delete(INTERNAL_USER_COOKIE);
}

export async function getInternalToken() {
  const cookieStore = await cookies();
  return cookieStore.get(INTERNAL_TOKEN_COOKIE)?.value || null;
}

export async function fetchBackendSession(token) {
  if (!token) return null;

  const response = await fetch(`${getBackendUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  const role = normalizeRole(data?.user?.role_name || data?.user?.role);
  if (!isInternalRole(role)) return null;

  return {
    user: {
      ...data.user,
      role,
    },
    token: data.token || token,
  };
}
