import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/env";
import { clearInternalSession, getInternalToken } from "@/lib/internalAuth";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function backendUrlFor(request, pathSegments = []) {
  const sourceUrl = new URL(request.url);
  const backendUrl = new URL(`${getBackendUrl()}/api/${pathSegments.join("/")}`);
  backendUrl.search = sourceUrl.search;
  return backendUrl;
}

function forwardedHeaders(request, token) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) return;
    if (normalizedKey === "cookie") return;
    if (normalizedKey === "authorization") return;
    headers.set(key, value);
  });

  headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function proxyBackend(request, context) {
  const token = await getInternalToken();

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const params = await context.params;
  const backendUrl = backendUrlFor(request, params?.path || []);
  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: forwardedHeaders(request, token),
    cache: "no-store",
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(backendUrl, init);
  const responseHeaders = new Headers();

  backendResponse.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) return;
    if (normalizedKey === "set-cookie") return;
    responseHeaders.set(key, value);
  });

  if (backendResponse.status === 401) {
    await clearInternalSession();
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyBackend;
export const POST = proxyBackend;
export const PUT = proxyBackend;
export const PATCH = proxyBackend;
export const DELETE = proxyBackend;
