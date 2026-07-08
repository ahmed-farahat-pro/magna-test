import { dbEnabled, getPrisma } from "@/lib/db";
import { sessionSecretConfigured } from "@/lib/sessionSecret";
import { rateLimitBackend } from "@/lib/rateLimit";

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
    sessionSecret: sessionSecretConfigured() ? "set" : "missing",
  };

  let db: "connected" | "error" | "unconfigured" = "unconfigured";
  if (dbEnabled()) {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      db = "connected";
    } catch {
      db = "error";
    }
  }

  return Response.json({
    ok: true,
    service: "ai-content-marketing-suite",
    db,
    rateLimit: rateLimitBackend(),
    env,
    timestamp: new Date().toISOString(),
  });
}
