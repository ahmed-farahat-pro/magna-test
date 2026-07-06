// Health / readiness probe. Never throws — safe to hit before env vars exist,
// so the site is verifiably "live" from the very first deploy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    anthropic: process.env.ANTHROPIC_API_KEY ? "set" : "missing",
    openai: process.env.OPENAI_API_KEY ? "set" : "missing",
    blob: process.env.BLOB_READ_WRITE_TOKEN ? "set" : "missing",
    database: process.env.DATABASE_URL ? "set" : "missing",
  };

  let db: "connected" | "error" | "unconfigured" = "unconfigured";
  if (process.env.DATABASE_URL) {
    try {
      // Lazy import so a missing/invalid DB never breaks the build or the app shell.
      const { prisma } = await import("@/lib/db");
      await prisma.$queryRaw`SELECT 1`;
      db = "connected";
    } catch {
      db = "error";
    }
  }

  return Response.json({
    ok: true,
    service: "ai-content-marketing-suite",
    db,
    env,
    timestamp: new Date().toISOString(),
  });
}
