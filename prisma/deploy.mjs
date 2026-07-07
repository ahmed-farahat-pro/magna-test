// Runs at build time (before `next build`). Applies committed Prisma migrations
// when a database is configured, and no-ops cleanly when it isn't — so the very
// first Vercel deploy is green even before any env vars exist, and the schema is
// applied automatically the moment DATABASE_URL/DIRECT_URL are added.
import { execSync } from "node:child_process";

// Same Vercel-Neon variable mapping as src/lib/db.ts, so `prisma migrate deploy`
// finds DATABASE_URL / DIRECT_URL when the DB was connected via the Vercel Storage
// tab (which injects DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING instead).
const e = process.env;
if (!e.DATABASE_URL) {
  const v = e.POSTGRES_PRISMA_URL || e.POSTGRES_URL || e.DATABASE_URL_UNPOOLED;
  if (v) e.DATABASE_URL = v;
}
if (!e.DIRECT_URL) {
  const v = e.DATABASE_URL_UNPOOLED || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL;
  if (v) e.DIRECT_URL = v;
}

if (!process.env.DATABASE_URL) {
  console.log("[deploy] No DATABASE_URL — skipping `prisma migrate deploy`.");
  process.exit(0);
}

try {
  console.log("[deploy] Applying migrations: prisma migrate deploy");
  execSync("npx --no-install prisma migrate deploy", { stdio: "inherit" });
} catch (err) {
  // Non-fatal: keep the build green. Generation degrades gracefully (best-effort
  // persistence) if the tables aren't present.
  console.warn(
    "[deploy] migrate deploy failed — continuing build:",
    err?.message ?? err,
  );
}
