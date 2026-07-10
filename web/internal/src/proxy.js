import { NextResponse } from "next/server";
import { getAllowedRolesForPath, getRoleHome, normalizeRole } from "@/lib/roles";

const TOKEN_COOKIE = "savira_internal_token";

function backendUrl() {
  return (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
}

async function getVerifiedRole(token) {
  if (!token) return null;

  const response = await fetch(`${backendUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;

  const data = await response.json().catch(() => null);
  return normalizeRole(data?.user?.role_name || data?.user?.role);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const role = await getVerifiedRole(token);

  if (pathname === "/login") {
    if (role) return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    return NextResponse.next();
  }

  const allowedRoles = getAllowedRolesForPath(pathname);
  if (!allowedRoles) return NextResponse.next();

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/not-authorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/cases/:path*",
    "/legal/:path*",
    "/staff/:path*",
    "/users/:path*",
    "/projects/:path*",
    "/projectTasks/:path*",
    "/staffAvailability/:path*",
    "/volunteerRanking/:path*",
    "/volunteer/:path*",
    "/reportGenerator/:path*",
  ],
};
