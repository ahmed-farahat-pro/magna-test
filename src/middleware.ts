import { NextResponse, type NextRequest } from "next/server";

// Establishes the anonymous session cookie on the first page navigation — BEFORE
// any client-side API call fires — so concurrent first requests can't each mint a
// different session id (which would orphan a brand-new visitor's first generation).
// Signed with Web Crypto (Edge runtime) using the same HMAC-SHA256/base64url as the
// Node-side verifier in lib/session.ts, so the two are interoperable.

const COOKIE = process.env.SESSION_COOKIE_NAME || "acms_sid";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(id: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return `${id}.${base64url(new Uint8Array(sig))}`;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(COOKIE)) {
    const id = crypto.randomUUID();
    res.cookies.set(COOKIE, await sign(id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
