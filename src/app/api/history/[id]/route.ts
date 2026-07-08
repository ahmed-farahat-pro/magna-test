import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { blobEnabled, deleteBlob } from "@/lib/blob";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    const { id } = await ctx.params;

    if (!dbEnabled()) {
      return fail("NOT_FOUND", "That entry could not be found.", requestId);
    }

    const item = await getPrisma().generation.findFirst({
      where: { id, sessionId },
      select: {
        id: true,
        kind: true,
        contentType: true,
        topic: true,
        tone: true,
        targetAudience: true,
        improveGoal: true,
        sourceText: true,
        outputText: true,
        explanation: true,
        imageUrl: true,
        imageStyle: true,
        imagePrompt: true,
        createdAt: true,
      },
    });

    // Same response for missing and foreign ids — no enumeration signal.
    if (!item) return fail("NOT_FOUND", "That entry could not be found.", requestId);

    return ok({ item }, requestId);
  } catch (e) {
    logError("history.get", requestId, e);
    return fail("INTERNAL_ERROR", "Could not load the entry.", requestId);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();
    const { id } = await ctx.params;

    if (!dbEnabled()) {
      return fail("NOT_FOUND", "That entry could not be found.", requestId);
    }

    const prisma = getPrisma();
    const row = await prisma.generation.findFirst({
      where: { id, sessionId },
      select: { imageUrl: true },
    });
    if (!row) return fail("NOT_FOUND", "That entry could not be found.", requestId);

    // Best-effort blob cleanup so the store doesn't accumulate orphans.
    if (row.imageUrl && blobEnabled()) {
      try {
        await deleteBlob(row.imageUrl);
      } catch {
        // ignore — proceed to delete the row regardless
      }
    }

    await prisma.generation.deleteMany({ where: { id, sessionId } });
    return ok({ deleted: { id } }, requestId);
  } catch (e) {
    logError("history.delete", requestId, e);
    return fail("INTERNAL_ERROR", "Could not delete the entry.", requestId);
  }
}
