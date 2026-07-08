import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { brandVoiceSchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PUT — update one brand voice (ownership-scoped).
export async function PUT(req: Request, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    const { id } = await ctx.params;
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
      return fail("NOT_FOUND", "That brand voice could not be found.", requestId);
    }
    const data = JSON.parse(JSON.stringify(parsed.data));
    const r = await getPrisma().brandVoice.updateMany({
      where: { id, sessionId },
      data: { data },
    });
    if (r.count === 0) {
      return fail("NOT_FOUND", "That brand voice could not be found.", requestId);
    }
    return ok({ voice: { id, ...parsed.data } }, requestId);
  } catch (e) {
    logError("brandVoice.update", requestId, e);
    return fail("INTERNAL_ERROR", "Could not update the brand voice.", requestId);
  }
}

// DELETE — remove one brand voice (ownership-scoped).
export async function DELETE(req: Request, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    const { id } = await ctx.params;
    if (!dbEnabled()) {
      return fail("NOT_FOUND", "That brand voice could not be found.", requestId);
    }
    const r = await getPrisma().brandVoice.deleteMany({ where: { id, sessionId } });
    if (r.count === 0) {
      return fail("NOT_FOUND", "That brand voice could not be found.", requestId);
    }
    return ok({ deleted: { id } }, requestId);
  } catch (e) {
    logError("brandVoice.delete", requestId, e);
    return fail("INTERNAL_ERROR", "Could not delete the brand voice.", requestId);
  }
}
