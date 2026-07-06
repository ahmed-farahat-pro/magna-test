import { PrismaClient } from "@prisma/client";

// Lazy singleton PrismaClient. Constructed only on first use (via getPrisma),
// so importing this module never throws when DATABASE_URL is absent — the app
// shell and non-DB routes keep working before the database is configured.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient();
  return globalForPrisma.prisma;
}

export const dbEnabled = (): boolean => Boolean(process.env.DATABASE_URL);
