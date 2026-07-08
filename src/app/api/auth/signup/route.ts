import { getAnonSessionId } from "@/lib/session";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge, clientIp } from "@/lib/http";
import { credentialsSchema, zodDetails } from "@/lib/validation";
import { isDisposableEmail } from "@/lib/email";
import { dbEnabled, getPrisma } from "@/lib/db";
import { claimAnonData } from "@/lib/migrateAnon";
import { track } from "@/lib/track";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string })?.code === "P2002";
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    // Throttle by IP (not session) so it can't be bypassed by dropping the cookie.
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
    if (isDisposableEmail(email)) {
      return fail(
        "VALIDATION_ERROR",
        "Please use a permanent email address — temporary/disposable inboxes aren't allowed.",
        requestId,
        { details: [{ path: "email", message: "disposable" }] },
      );
    }
    const prisma = getPrisma();
    const takenResponse = () =>
      fail("VALIDATION_ERROR", "An account with that email already exists.", requestId, {
        details: [{ path: "email", message: "taken" }],
      });

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return takenResponse();

    const passwordHash = await hashPassword(parsed.data.password);
    let user: { id: string; email: string };
    try {
      user = await prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });
    } catch (e) {
      // Concurrent duplicate signup — the unique index caught it; treat as taken.
      if (isUniqueViolation(e)) return takenResponse();
      throw e;
    }

    // Move the visitor's anonymous work onto the new account.
    try {
      await claimAnonData(await getAnonSessionId(), user.id);
    } catch (e) {
      logError("auth.signup.migrate", requestId, e);
    }

    await setAuthCookie(user.id);
    await track("signup", user.id, true);
    return ok({ user: { email: user.email } }, requestId);
  } catch (e) {
    logError("auth.signup", requestId, e);
    return fail("INTERNAL_ERROR", "Could not create the account.", requestId);
  }
}
