-- CreateEnum
CREATE TYPE "ScraperRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "ScraperRunStatus" NOT NULL DEFAULT 'RUNNING',
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "productsCreated" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "lastProcessedPage" INTEGER,
    "metadata" JSONB,
    "processedPages" INTEGER NOT NULL DEFAULT 0,
    "failedUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScraperRun_runId_key" ON "ScraperRun"("runId");

-- CreateIndex
CREATE INDEX "ScraperRun_startTime_idx" ON "ScraperRun"("startTime");

-- CreateIndex
CREATE INDEX "ScraperRun_status_idx" ON "ScraperRun"("status");
