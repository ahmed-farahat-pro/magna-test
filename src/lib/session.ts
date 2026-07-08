import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { resolveSessionSecret } from "@/lib/sessionSecret";
import { getUserId } from "@/lib/auth";

const COOKIE = process.env.SESSION_COOKIE_NAME || "acms_sid";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

// Fail closed: in production without a real SESSION_SECRET we throw rather than
// sign/verify with a public default (which would make cookies forgeable). The
// route's try/catch turns this into a clean 5xx instead of a silent hole.
function secret(): string {
  const s = resolveSessionSecret();
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

function sign(id: string): string {
  const sig = createHmac("sha256", secret()).update(id).digest("base64url");
  return `${id}.${sig}`;
}

function verify(value: string): string | null {
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const id = value.slice(0, i);
  const sig = value.slice(i + 1);
  const expected = createHmac("sha256", secret()).update(id).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

/**
 * The caller's ANONYMOUS session id, minting + setting a signed httpOnly cookie
 * on first visit. Always device-local; used when logged out, and as the source
 * of rows to migrate when a visitor signs up.
 */
export async function getAnonSessionId(): Promise<string> {
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

/**
 * Clear the anonymous session cookie — used on logout so a shared browser doesn't
 * hand the next person the previous user's anonymous session. Middleware mints a
 * fresh one on the next navigation.
 */
export async function clearAnonCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * The OWNER id used to scope every DB read/write. When the user is logged in it
 * is their durable account id (data follows them across devices); otherwise it
 * is the device-local anonymous session id. All existing `where { id, sessionId }`
 * scoping keeps working unchanged.
 */
export async function getSessionId(): Promise<string> {
  const userId = await getUserId();
  if (userId) return userId;
  return getAnonSessionId();
}

/**
 * Like {@link getSessionId} but also reports whether the owner is a registered
 * user or an anonymous visitor — used by activity tracking to split traffic by
 * identity layer without a second lookup at the call site.
 */
export async function getActor(): Promise<{ id: string; isUser: boolean }> {
  const userId = await getUserId();
  if (userId) return { id: userId, isUser: true };
  return { id: await getAnonSessionId(), isUser: false };
}
