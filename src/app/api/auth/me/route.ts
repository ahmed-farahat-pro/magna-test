import { getUserId } from "@/lib/auth";
import { newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Never let the browser cache this — a cached pre-login {user:null} would leave
// the header showing "Sign in" after the user actually signed in.
function meResponse(user: { email: string } | null, requestId: string): Response {
  return Response.json(
    { user },
    { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
  );
}

// The current signed-in user (email only), or null when anonymous.
export async function GET() {
  const requestId = newRequestId();
  try {
    const userId = await getUserId();
    if (!userId || !dbEnabled()) return meResponse(null, requestId);
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return meResponse(user ? { email: user.email } : null, requestId);
  } catch (e) {
    logError("auth.me", requestId, e);
    return meResponse(null, requestId);
  }
}
