import { isAdmin } from "@/lib/admin";
import { ok, fail, newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayRow = { day: Date; users: bigint; anon: bigint };

// Aggregate traffic + usage metrics for the admin dashboard.
export async function GET() {
  const requestId = newRequestId();
  try {
    if (!(await isAdmin())) {
      return fail("UNAUTHORIZED", "Admin sign-in required.", requestId);
    }
    if (!dbEnabled()) {
      return fail("CONFIG_ERROR", "Database is not configured.", requestId);
    }
    const prisma = getPrisma();

    const [
      users,
      byType,
      byActor,
      generations,
      images,
      brandVoices,
      recent,
      perDay,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.activityEvent.groupBy({ by: ["type"], _count: { _all: true } }),
      prisma.activityEvent.groupBy({ by: ["isUser"], _count: { _all: true } }),
      prisma.generation.count(),
      prisma.generation.count({ where: { imageStatus: "READY" } }),
      prisma.brandVoice.count(),
      prisma.activityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, type: true, isUser: true, sessionId: true, meta: true, createdAt: true },
      }),
      prisma.$queryRaw<DayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*) FILTER (WHERE "isUser")::bigint AS users,
               COUNT(*) FILTER (WHERE NOT "isUser")::bigint AS anon
        FROM "activity_events"
        WHERE "createdAt" > NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day ASC
      `,
    ]);

    const totalsByType: Record<string, number> = {};
    for (const r of byType) totalsByType[r.type] = r._count._all;

    const actionsByActor = { user: 0, anon: 0 };
    for (const r of byActor) {
      if (r.isUser) actionsByActor.user = r._count._all;
      else actionsByActor.anon = r._count._all;
    }

    const totalActions = Object.entries(totalsByType)
      .filter(([t]) => t !== "session_start")
      .reduce((s, [, n]) => s + n, 0);

    return ok(
      {
        overview: {
          users,
          anonymousSessions: totalsByType["session_start"] ?? 0,
          totalActions,
          textRequests: totalsByType["text_generate"] ?? 0,
          imageRequests: totalsByType["image_generate"] ?? 0,
          improveRequests: totalsByType["improve"] ?? 0,
          brandVoices,
          generationsStored: generations,
          imagesStored: images,
          logins: totalsByType["login"] ?? 0,
          signups: totalsByType["signup"] ?? 0,
        },
        totalsByType,
        actionsByActor,
        perDay: perDay.map((d) => ({
          day: d.day.toISOString().slice(0, 10),
          users: Number(d.users),
          anon: Number(d.anon),
          count: Number(d.users) + Number(d.anon),
        })),
        recent: recent.map((e) => ({
          id: e.id,
          type: e.type,
          isUser: e.isUser,
          actor: e.sessionId.slice(0, 8),
          meta: e.meta ?? null,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      requestId,
    );
  } catch (e) {
    logError("admin.stats", requestId, e);
    return fail("INTERNAL_ERROR", "Could not load stats.", requestId);
  }
}
