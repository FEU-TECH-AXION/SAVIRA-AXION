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

const DECODED_BODY_HEADERS = new Set([
  "content-encoding",
  "content-length",
]);

const BACKEND_TIMEOUT_MS = 15000;

function jsonError(message, status, details = {}) {
  return NextResponse.json(
    {
      error: message,
      ...details,
    },
    { status }
  );
}

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

async function fetchBackendWithTimeout(backendUrl, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    return await fetch(backendUrl, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyBackend(request, context) {
  let token;
  try {
    token = await getInternalToken();
  } catch (error) {
    console.error("[backend proxy] Failed to read internal session:", error);
    return jsonError("Unable to read internal session.", 500);
  }

  if (!token) {
    return jsonError("Not authenticated.", 401);
  }

  let params;
  let backendUrl;
  try {
    params = await context.params;
    backendUrl = backendUrlFor(request, params?.path || []);
  } catch (error) {
    console.error("[backend proxy] Failed to resolve backend URL:", error);
    return jsonError("Unable to resolve backend route.", 500);
  }

  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: forwardedHeaders(request, token),
    cache: "no-store",
    redirect: "manual",
  };

  try {
    if (method !== "GET" && method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }
  } catch (error) {
    console.error("[backend proxy] Failed to read request body:", error);
    return jsonError("Unable to read request body.", 400);
  }

  let backendResponse;
  try {
    backendResponse = await fetchBackendWithTimeout(backendUrl, init);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("[backend proxy] Backend request failed:", {
      url: backendUrl.toString(),
      method,
      timedOut,
      message: error?.message,
    });
    return jsonError(
      timedOut ? "Backend request timed out." : "Backend request failed.",
      timedOut ? 504 : 502,
      {
        backendPath: backendUrl.pathname,
        timeoutMs: timedOut ? BACKEND_TIMEOUT_MS : undefined,
      }
    );
  }

  const responseHeaders = new Headers();

  backendResponse.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) return;
    if (DECODED_BODY_HEADERS.has(normalizedKey)) return;
    if (normalizedKey === "set-cookie") return;
    responseHeaders.set(key, value);
  });

  if (backendResponse.status === 401) {
    try {
      await clearInternalSession();
    } catch (error) {
      console.error("[backend proxy] Failed to clear internal session:", error);
    }
  }

  const responseBody = await backendResponse.arrayBuffer();
  const contentType = backendResponse.headers.get("content-type") || "";

  if (backendResponse.status >= 500 && contentType.toLowerCase().includes("text/html")) {
    const html = new TextDecoder().decode(responseBody).replace(/\s+/g, " ").trim();
    return jsonError(
      "Backend returned an internal server error.",
      backendResponse.status,
      {
        backendPath: backendUrl.pathname,
        details: html.slice(0, 240),
      }
    );
  }

  return new Response(responseBody, {
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
