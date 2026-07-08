-- CreateTable
CREATE TABLE "brand_voices" (
    "sessionId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("sessionId")
);
