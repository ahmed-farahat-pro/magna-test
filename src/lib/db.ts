import { PrismaClient } from "@prisma/client";

// Map Vercel's Neon-integration variable names onto the ones our Prisma schema
// expects, so connecting a Neon database from the Vercel Storage tab works with
// zero manual variable mapping. Runs once on import, before any client is built.
function normalizeDbEnv() {
  const e = process.env;
  if (!e.DATABASE_URL) {
    const v = e.POSTGRES_PRISMA_URL || e.POSTGRES_URL || e.DATABASE_URL_UNPOOLED;
    if (v) e.DATABASE_URL = v;
  }
  if (!e.DIRECT_URL) {
    const v = e.DATABASE_URL_UNPOOLED || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL;
    if (v) e.DIRECT_URL = v;
  }
}
normalizeDbEnv();

// Lazy singleton PrismaClient. Constructed only on first use (via getPrisma),
// so importing this module never throws when DATABASE_URL is absent — the app
// shell and non-DB routes keep working before the database is configured.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient();
  return globalForPrisma.prisma;
}

export const dbEnabled = (): boolean => Boolean(process.env.DATABASE_URL);
