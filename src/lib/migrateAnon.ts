import { getPrisma } from "@/lib/db";

/**
 * Re-own a visitor's anonymous rows (generations + brand voices) to a user id,
 * so their work follows them onto the account. Used on signup and on login.
 * No-op when there's nothing to move.
 */
export async function claimAnonData(
  anonId: string,
  userId: string,
): Promise<void> {
  if (!anonId || anonId === userId) return;
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.generation.updateMany({
      where: { sessionId: anonId },
      data: { sessionId: userId },
    }),
    prisma.brandVoice.updateMany({
      where: { sessionId: anonId },
      data: { sessionId: userId },
    }),
  ]);
}
