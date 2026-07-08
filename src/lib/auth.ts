import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { resolveSessionSecret } from "@/lib/sessionSecret";

const scryptAsync = promisify(scrypt);

const AUTH_COOKIE = "acms_auth";
export const AUTH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days while logged in
const nowSec = () => Math.floor(Date.now() / 1000);

// ── Password hashing (scrypt, no external dependency) ────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

const KEY_LEN = 32; // must match hashPassword

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [alg, saltHex, keyHex] = stored.split("$");
  // Reject anything not exactly 16-byte salt + 32-byte key of valid hex — never
  // derive the compare length from the (attacker-controllable) stored value.
  if (alg !== "scrypt" || saltHex?.length !== 32 || keyHex?.length !== KEY_LEN * 2) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LEN) return false;
  const test = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return timingSafeEqual(key, test);
}

// ── Auth token (a compact, HMAC-signed session token: payload.signature) ──────
function signToken(userId: string): string | null {
  const secret = resolveSessionSecret();
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: nowSec() + AUTH_TTL_SECONDS }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const secret = resolveSessionSecret();
  if (!secret) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!uid || !exp || exp < nowSec()) return null; // expired or malformed
    return uid as string;
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
/** The logged-in user's id, or null when browsing anonymously. */
export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function setAuthCookie(userId: string): Promise<void> {
  const token = signToken(userId);
  if (!token) return;
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TTL_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
