-- Move brand_voices from one-per-session (sessionId PK) to many-per-session (id PK).
-- The table was introduced in the prior migration with no durable data yet.
DROP TABLE IF EXISTS "brand_voices";

CREATE TABLE "brand_voices" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_voices_sessionId_createdAt_idx" ON "brand_voices"("sessionId", "createdAt");
