import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";
import { clearInternalSession, setInternalSession } from "@/lib/internalAuth";
import { getRoleHome, isInternalRole, normalizeRole } from "@/lib/roles";

export async function POST(request) {
  const credentials = await request.json();

  const backendResponse = await fetch(`${getBackendUrl()}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
    cache: "no-store",
  });

  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    await clearInternalSession();
    return NextResponse.json(data, { status: backendResponse.status });
  }

  if (data.verificationRequired) {
    await clearInternalSession();
    return NextResponse.json(
      {
        error: "Email verification is required. Complete verification in the public app before using the internal app.",
      },
      { status: 403 }
    );
  }

  const role = normalizeRole(data?.user?.role_name || data?.user?.role);
  if (!data.token || !isInternalRole(role)) {
    await clearInternalSession();
    return NextResponse.json(
      { error: "This sign-in portal is only available to internal SAVIRA roles." },
      { status: 403 }
    );
  }

  await setInternalSession(data.token, data.user);

  return NextResponse.json({
    user: {
      ...data.user,
      role,
    },
    redirectTo: getRoleHome(role),
  });
}
