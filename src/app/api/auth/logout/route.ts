import { clearAuthCookie } from "@/lib/auth";
import { clearAnonCookie } from "@/lib/session";
import { ok, newRequestId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const requestId = newRequestId();
  // Clear the account token AND the anonymous session, so the next person on a
  // shared browser starts clean instead of inheriting this session.
  await clearAuthCookie();
  await clearAnonCookie();
  return ok({ ok: true }, requestId);
}
