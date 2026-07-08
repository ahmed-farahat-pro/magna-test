import { getAnonSessionId } from "@/lib/session";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge, clientIp } from "@/lib/http";
import { credentialsSchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";
import { claimAnonData } from "@/lib/migrateAnon";
import { track } from "@/lib/track";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A valid-shaped dummy hash so scrypt runs even for unknown emails (no timing leak).
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const rl = await checkRateLimit(clientIp(req), "auth");
    if (!rl.ok) {
      return fail("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfter}s.`, requestId, {
        headers: { "retry-after": String(rl.retryAfter) },
      });
    }
    if (tooLarge(req)) {
      return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);
    }
    const body = await req.json().catch(() => null);
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid input.", requestId, { details });
    }
    if (!dbEnabled()) {
      return fail("CONFIG_ERROR", "Accounts require a database connection.", requestId);
    }

    const email = parsed.data.email.toLowerCase();
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    // Same generic message + always-run hash → no user enumeration (response or timing).
    const okPw = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !okPw) {
      return fail("VALIDATION_ERROR", "Invalid email or password.", requestId, {
        status: 401,
        details: [{ path: "credentials", message: "invalid" }],
      });
    }

    // Claim any anonymous work done on this device before signing in.
    try {
      await claimAnonData(await getAnonSessionId(), user.id);
    } catch (e) {
      logError("auth.login.migrate", requestId, e);
    }

    await setAuthCookie(user.id);
    await track("login", user.id, true);
    return ok({ user: { email } }, requestId);
  } catch (e) {
    logError("auth.login", requestId, e);
    return fail("INTERNAL_ERROR", "Could not sign in.", requestId);
  }
}
