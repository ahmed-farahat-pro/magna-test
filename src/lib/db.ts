import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — avoids exhausting Neon connections across warm
// serverless invocations / dev hot-reloads. Import this only from server code
// (route handlers), never from a client component.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
