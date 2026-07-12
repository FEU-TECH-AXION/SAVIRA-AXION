import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const response = await fetch(`${getBackendUrl()}/api/users/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      resetBaseUrl: new URL(request.url).origin,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  return NextResponse.json(data, { status: response.status });
}
