import { isAdmin } from "@/lib/admin";
import { ok, fail, newRequestId } from "@/lib/http";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Delete a user and ALL of their owned data (generations, brand voices, activity)
// in one transaction. Everything is scoped by the user's id, which is also the
// owner id used across the app.
export async function DELETE(_req: Request, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    if (!(await isAdmin())) {
      return fail("UNAUTHORIZED", "Admin sign-in required.", requestId);
    }
    if (!dbEnabled()) {
      return fail("CONFIG_ERROR", "Database is not configured.", requestId);
    }
    const { id } = await ctx.params;
    if (!id) return fail("VALIDATION_ERROR", "Missing user id.", requestId);

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return fail("NOT_FOUND", "That user could not be found.", requestId);

    // All-or-nothing: the user row and every owned row are deleted atomically, so
    // a mid-way failure can't leave an account with its data already gone.
    const [gens, voices, events] = await prisma.$transaction([
      prisma.generation.deleteMany({ where: { sessionId: id } }),
      prisma.brandVoice.deleteMany({ where: { sessionId: id } }),
      prisma.activityEvent.deleteMany({ where: { sessionId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return ok(
      {
        deleted: {
          id,
          generations: gens.count,
          brandVoices: voices.count,
          activityEvents: events.count,
        },
      },
      requestId,
    );
  } catch (e) {
    logError("admin.users.delete", requestId, e);
    return fail("INTERNAL_ERROR", "Could not delete the user.", requestId);
  }
}
