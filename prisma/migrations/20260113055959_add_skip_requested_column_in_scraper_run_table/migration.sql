-- AlterTable
ALTER TABLE "ScraperConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScraperRun" ADD COLUMN     "skipRequested" BOOLEAN NOT NULL DEFAULT false;
