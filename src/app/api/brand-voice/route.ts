import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { brandVoiceSchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — the session's saved brand voice (server-side source of truth), or null.
export async function GET() {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    if (!dbEnabled()) return ok({ brandVoice: null }, requestId);
    const row = await getPrisma().brandVoice.findUnique({
      where: { sessionId },
      select: { data: true },
    });
    return ok({ brandVoice: row?.data ?? null }, requestId);
  } catch (e) {
    logError("brandVoice.get", requestId, e);
    // Degrade gracefully — the client still has its localStorage copy.
    return ok({ brandVoice: null }, requestId);
  }
}

// PUT — upsert the session's brand voice.
export async function PUT(req: Request) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    if (tooLarge(req)) {
      return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);
    }
    const body = await req.json().catch(() => null);
    const parsed = brandVoiceSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid brand voice.", requestId, { details });
    }
    if (!dbEnabled()) {
      return ok({ saved: false, brandVoice: parsed.data }, requestId);
    }
    // JSON round-trip strips any undefined so it's clean JSONB.
    const data = JSON.parse(JSON.stringify(parsed.data));
    await getPrisma().brandVoice.upsert({
      where: { sessionId },
      create: { sessionId, data },
      update: { data },
    });
    return ok({ saved: true, brandVoice: parsed.data }, requestId);
  } catch (e) {
    logError("brandVoice.put", requestId, e);
    return fail("INTERNAL_ERROR", "Could not save the brand voice.", requestId);
  }
}
