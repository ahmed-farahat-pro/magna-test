-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GenerationKind" AS ENUM ('GENERATE', 'IMPROVE');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG_POST', 'LINKEDIN_POST', 'AD_COPY', 'EMAIL');

-- CreateEnum
CREATE TYPE "ImproveGoal" AS ENUM ('SHORTER', 'MORE_PERSUASIVE', 'MORE_FORMAL', 'SEO_OPTIMIZED', 'REWRITE_FOR_AUDIENCE');

-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('NONE', 'PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "generations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" "GenerationKind" NOT NULL,
    "contentType" "ContentType",
    "topic" TEXT,
    "tone" TEXT,
    "targetAudience" TEXT,
    "improveGoal" "ImproveGoal",
    "sourceText" TEXT,
    "outputText" TEXT NOT NULL,
    "explanation" TEXT,
    "model" TEXT,
    "promptStrategy" TEXT,
    "tokensUsed" INTEGER,
    "imageStatus" "ImageStatus" NOT NULL DEFAULT 'NONE',
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "imageStyle" TEXT,
    "imageError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generations_sessionId_createdAt_id_idx" ON "generations"("sessionId", "createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "generations_sessionId_contentType_idx" ON "generations"("sessionId", "contentType");

-- CreateIndex
CREATE INDEX "generations_sessionId_kind_idx" ON "generations"("sessionId", "kind");

