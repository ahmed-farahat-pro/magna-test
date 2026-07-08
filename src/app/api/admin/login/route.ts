import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge, clientIp } from "@/lib/http";
import {
  adminConfigured,
  checkAdminCredentials,
  setAdminCookie,
} from "@/lib/admin";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    // Brute-force protection: reuse the IP-keyed auth bucket.
    const rl = await checkRateLimit("admin:" + clientIp(req), "auth");
    if (!rl.ok) {
      return fail("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfter}s.`, requestId, {
        headers: { "retry-after": String(rl.retryAfter) },
      });
    }
    if (tooLarge(req)) {
      return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);
    }
    if (!adminConfigured()) {
      return fail(
        "CONFIG_ERROR",
        "Admin access is not configured (set ADMIN_USERNAME and ADMIN_PASSWORD).",
        requestId,
      );
    }
    const body = (await req.json().catch(() => null)) as
      | { username?: unknown; password?: unknown }
      | null;
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!checkAdminCredentials(username, password)) {
      return fail("VALIDATION_ERROR", "Invalid admin credentials.", requestId, {
        status: 401,
      });
    }
    const signed = await setAdminCookie();
    if (!signed) {
      return fail("CONFIG_ERROR", "Server is missing SESSION_SECRET.", requestId);
    }
    return ok({ ok: true }, requestId);
  } catch (e) {
    logError("admin.login", requestId, e);
    return fail("INTERNAL_ERROR", "Could not sign in.", requestId);
  }
}
