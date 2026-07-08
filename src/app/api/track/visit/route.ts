import { cookies } from "next/headers";
import { getUserId } from "@/lib/auth";
import { getAnonSessionId } from "@/lib/session";
import { track } from "@/lib/track";
import { ok, newRequestId } from "@/lib/http";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A one-shot marker so each browser is counted exactly once. The anon session
// cookie itself is minted earlier by middleware, so we can't use "did we just
// mint it?" — this dedicated cookie is the reliable "already counted" flag.
const VISIT_COOKIE = "acms_visit";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Called once by the client shell on load. Records one `session_start` per unique
// anonymous browser, giving the admin dashboard an accurate visitor count.
// Logged-in visitors and already-counted browsers are skipped.
export async function POST() {
  const requestId = newRequestId();
  try {
    const userId = await getUserId();
    if (userId) return ok({ tracked: false }, requestId);

    const jar = await cookies();
    if (jar.get(VISIT_COOKIE)) return ok({ tracked: false }, requestId);

    const id = await getAnonSessionId();
    await track("session_start", id, false);
    jar.set(VISIT_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
    return ok({ tracked: true }, requestId);
  } catch (e) {
    logError("track.visit", requestId, e);
    return ok({ tracked: false }, requestId);
  }
}
