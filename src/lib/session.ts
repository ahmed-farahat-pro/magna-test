import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const COOKIE = process.env.SESSION_COOKIE_NAME || "acms_sid";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function sign(id: string): string {
  const sig = createHmac("sha256", SECRET).update(id).digest("base64url");
  return `${id}.${sig}`;
}

function verify(value: string): string | null {
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const id = value.slice(0, i);
  const sig = value.slice(i + 1);
  const expected = createHmac("sha256", SECRET).update(id).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

/**
 * Resolve the caller's anonymous session id, minting + setting a signed httpOnly
 * cookie on first visit. Every DB read/write is scoped to this id — the only
 * identity in the app (no login).
 */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) {
    const id = verify(existing);
    if (id) return id;
  }

  const id = randomUUID();
  jar.set(COOKIE, sign(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return id;
}
