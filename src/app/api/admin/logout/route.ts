import { clearAdminCookie } from "@/lib/admin";
import { ok, newRequestId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const requestId = newRequestId();
  await clearAdminCookie();
  return ok({ ok: true }, requestId);
}
