-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isUser" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_type_createdAt_idx" ON "activity_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_sessionId_idx" ON "activity_events"("sessionId");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");
