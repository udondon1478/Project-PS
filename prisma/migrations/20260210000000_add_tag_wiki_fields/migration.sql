-- AlterTable: Add Tag Wiki fields (Issue #252)
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "wikiContent" TEXT;
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "externalLinks" JSONB DEFAULT '[]';
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "distinguishingFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[];
