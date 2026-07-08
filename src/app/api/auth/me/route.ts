import { getUserId } from "@/lib/auth";
import { ok, newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The current signed-in user (email only), or null when anonymous.
export async function GET() {
  const requestId = newRequestId();
  try {
    const userId = await getUserId();
    if (!userId || !dbEnabled()) return ok({ user: null }, requestId);
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return ok({ user: user ? { email: user.email } : null }, requestId);
  } catch (e) {
    logError("auth.me", requestId, e);
    return ok({ user: null }, requestId);
  }
}
