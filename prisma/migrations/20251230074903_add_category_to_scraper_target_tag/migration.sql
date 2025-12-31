/*
  Warnings:

  - A unique constraint covering the columns `[tag,category]` on the table `scraper_target_tags` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "scraper_target_tags_tag_key";

-- AlterTable
ALTER TABLE "scraper_target_tags" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "scraper_target_tags_tag_category_key" ON "scraper_target_tags"("tag", "category");
