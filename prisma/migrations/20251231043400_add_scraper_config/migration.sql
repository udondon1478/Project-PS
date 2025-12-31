-- AlterEnum
ALTER TYPE "ScraperRunStatus" ADD VALUE 'STOPPING';

-- AlterTable
ALTER TABLE "scraper_target_tags" ADD COLUMN "lastBackfillPage" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ScraperLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperConfig" (
    "id" TEXT NOT NULL,
    "isSchedulerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newScanIntervalMin" INTEGER NOT NULL DEFAULT 10,
    "newScanPageLimit" INTEGER NOT NULL DEFAULT 3,
    "backfillIntervalMin" INTEGER NOT NULL DEFAULT 5,
    "backfillPageCount" INTEGER NOT NULL DEFAULT 3,
    "backfillProductLimit" INTEGER NOT NULL DEFAULT 9,
    "requestIntervalMs" INTEGER NOT NULL DEFAULT 5000,
    "lastUpdatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScraperLog_runId_idx" ON "ScraperLog"("runId");

-- CreateIndex
CREATE INDEX "ScraperLog_createdAt_idx" ON "ScraperLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ScraperLog" ADD CONSTRAINT "ScraperLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ScraperRun"("runId") ON DELETE CASCADE ON UPDATE CASCADE;
