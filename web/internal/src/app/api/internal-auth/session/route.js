import { NextResponse } from "next/server";
import {
  clearInternalSession,
  fetchBackendSession,
  getInternalToken,
  setInternalSession,
} from "@/lib/internalAuth";

export async function GET() {
  const token = await getInternalToken();
  const session = await fetchBackendSession(token);

  if (!session) {
    await clearInternalSession();
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await setInternalSession(session.token, session.user);
  return NextResponse.json({ user: session.user });
}
