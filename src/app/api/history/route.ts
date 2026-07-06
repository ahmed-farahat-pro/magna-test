import { getSessionId } from "@/lib/session";
import { ok, fail, newRequestId } from "@/lib/http";
import { historyQuerySchema, zodDetails } from "@/lib/validation";
import { dbEnabled, getPrisma } from "@/lib/db";

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
    });
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid query.", requestId, { details });
    }
    const { page, pageSize } = parsed.data;

    // Before the DB is configured, history is simply empty (not an error).
    if (!dbEnabled()) {
      return ok({ items: [], page, pageSize, total: 0, hasMore: false }, requestId);
    }

    const prisma = getPrisma();
    const where = { sessionId };
    const [items, total] = await Promise.all([
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
          outputText: true,
          explanation: true,
          imageUrl: true,
          imageStyle: true,
          createdAt: true,
        },
      }),
      prisma.generation.count({ where }),
    ]);

    return ok(
      { items, page, pageSize, total, hasMore: page * pageSize < total },
      requestId,
    );
  } catch {
    return fail("INTERNAL_ERROR", "Could not load history.", requestId);
  }
}
