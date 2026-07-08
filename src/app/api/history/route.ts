import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId } from "@/lib/http";
import { historyQuerySchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();

    const sp = new URL(req.url).searchParams;
    const parsed = historyQuerySchema.safeParse({
      page: sp.get("page") ?? undefined,
      pageSize: sp.get("pageSize") ?? undefined,
      kind: sp.get("kind") ?? undefined,
    });
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid query.", requestId, { details });
    }
    const { page, pageSize, kind } = parsed.data;

    // Before the DB is configured, history is simply empty (not an error).
    if (!dbEnabled()) {
      return ok({ items: [], page, pageSize, total: 0, hasMore: false }, requestId);
    }

    const prisma = getPrisma();
    // Scope to the session, and optionally to one kind (e.g. only IMPROVE rows
    // for the in-context history on the Improve page).
    const where = kind ? { sessionId, kind } : { sessionId };
    const [items, total, spend] = await Promise.all([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          kind: true,
          contentType: true,
          topic: true,
          improveGoal: true,
          sourceText: true,
          outputText: true,
          explanation: true,
          imageUrl: true,
          imageStyle: true,
          model: true,
          tokensUsed: true,
          costUsd: true,
          createdAt: true,
        },
      }),
      prisma.generation.count({ where }),
      // Your lifetime spend across every piece (not just this page).
      prisma.generation.aggregate({
        where,
        _sum: { costUsd: true, tokensUsed: true },
      }),
    ]);

    return ok(
      {
        items,
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
        spend: {
          costUsd: spend._sum.costUsd ?? 0,
          tokensUsed: spend._sum.tokensUsed ?? 0,
        },
      },
      requestId,
    );
  } catch (e) {
    logError("history.list", requestId, e);
    return fail("INTERNAL_ERROR", "Could not load history.", requestId);
  }
}
