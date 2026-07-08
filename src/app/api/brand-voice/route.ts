import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { brandVoiceSchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VOICES = 10;

type Row = { id: string; data: unknown };
const merge = (r: Row) => ({ id: r.id, ...(r.data as Record<string, unknown>) });

// GET — all brand voices saved for this session (newest first).
export async function GET() {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    if (!dbEnabled()) return ok({ voices: [] }, requestId);
    const rows = await getPrisma().brandVoice.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, data: true },
    });
    return ok({ voices: rows.map(merge) }, requestId);
  } catch (e) {
    logError("brandVoice.list", requestId, e);
    return ok({ voices: [] }, requestId);
  }
}

// POST — create a new brand voice.
export async function POST(req: Request) {
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
      return ok({ voice: parsed.data, saved: false }, requestId);
    }
    const prisma = getPrisma();
    const count = await prisma.brandVoice.count({ where: { sessionId } });
    if (count >= MAX_VOICES) {
      return fail("VALIDATION_ERROR", `You can save up to ${MAX_VOICES} brand voices.`, requestId);
    }
    const data = JSON.parse(JSON.stringify(parsed.data));
    const row = await prisma.brandVoice.create({
      data: { sessionId, data },
      select: { id: true, data: true },
    });
    return ok({ voice: merge(row), saved: true }, requestId);
  } catch (e) {
    logError("brandVoice.create", requestId, e);
    return fail("INTERNAL_ERROR", "Could not save the brand voice.", requestId);
  }
}
