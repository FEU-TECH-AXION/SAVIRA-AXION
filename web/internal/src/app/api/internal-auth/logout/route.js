import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";
import { clearInternalSession, getInternalToken } from "@/lib/internalAuth";

export async function POST() {
  const token = await getInternalToken();

  if (token) {
    await fetch(`${getBackendUrl()}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  await clearInternalSession();
  return NextResponse.json({ message: "Logged out successfully." });
}
