// Runs at build time (before `next build`). Applies committed Prisma migrations
// when a database is configured, and no-ops cleanly when it isn't — so the very
// first Vercel deploy is green even before any env vars exist, and the schema is
// applied automatically the moment DATABASE_URL/DIRECT_URL are added.
import { execSync } from "node:child_process";

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
