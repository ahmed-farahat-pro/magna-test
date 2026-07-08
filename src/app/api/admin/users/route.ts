import { isAdmin } from "@/lib/admin";
import { ok, fail, newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List every registered user with their content + activity counts.
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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });
    const ids = users.map((u) => u.id);

    // One grouped query each for generations and activity, keyed by owner id.
    const [gens, acts] = await Promise.all([
      ids.length
        ? prisma.generation.groupBy({
            by: ["sessionId"],
            where: { sessionId: { in: ids } },
            _count: { _all: true },
          })
        : Promise.resolve([] as { sessionId: string; _count: { _all: number } }[]),
      ids.length
        ? prisma.activityEvent.groupBy({
            by: ["sessionId"],
            where: { sessionId: { in: ids } },
            _count: { _all: true },
          })
        : Promise.resolve([] as { sessionId: string; _count: { _all: number } }[]),
    ]);
    const genCount = new Map(gens.map((g) => [g.sessionId, g._count._all]));
    const actCount = new Map(acts.map((a) => [a.sessionId, a._count._all]));

    return ok(
      {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          createdAt: u.createdAt.toISOString(),
          generations: genCount.get(u.id) ?? 0,
          actions: actCount.get(u.id) ?? 0,
        })),
      },
      requestId,
    );
  } catch (e) {
    logError("admin.users.list", requestId, e);
    return fail("INTERNAL_ERROR", "Could not load users.", requestId);
  }
}
