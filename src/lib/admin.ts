import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { resolveSessionSecret } from "@/lib/sessionSecret";

// Admin access is a single operator account configured entirely by environment
// variables — no admin rows in the database, nothing to seed, nothing to leak.
// The session is an HMAC-signed, httpOnly cookie (same primitive as user auth).
const ADMIN_COOKIE = "acms_admin";
const TTL_SECONDS = 60 * 60 * 12; // 12h admin session
const nowSec = () => Math.floor(Date.now() / 1000);

/** True when both ADMIN_USERNAME and ADMIN_PASSWORD are set (surfaced on /health). */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

/** Constant-time string compare that never short-circuits on length. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a compare against self so timing doesn't leak length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Verify submitted credentials against the env-configured operator account. */
export function checkAdminCredentials(username: string, password: string): boolean {
  const U = process.env.ADMIN_USERNAME || "";
  const P = process.env.ADMIN_PASSWORD || "";
  if (!U || !P) return false;
  // Evaluate both so a wrong username and a wrong password cost the same.
  const okU = safeEqual(username, U);
  const okP = safeEqual(password, P);
  return okU && okP;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Issue the admin session cookie. Returns false if signing isn't possible. */
export async function setAdminCookie(): Promise<boolean> {
  const secret = resolveSessionSecret();
  if (!secret) return false;
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: nowSec() + TTL_SECONDS }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return true;
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** True when the request carries a valid, unexpired admin cookie. */
export async function isAdmin(): Promise<boolean> {
  const secret = resolveSessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { role, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return role === "admin" && typeof exp === "number" && exp > nowSec();
  } catch {
    return false;
  }
}
