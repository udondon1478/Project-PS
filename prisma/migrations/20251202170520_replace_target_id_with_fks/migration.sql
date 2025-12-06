/*
  Warnings:

  - You are about to drop the column `targetId` on the `Report` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reporterId,tagId]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reporterId,productTagId]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reporterId,productId]` on the table `Report` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Report_reporterId_targetType_targetId_key";

-- DropIndex
DROP INDEX "Report_targetType_targetId_idx";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "targetId",
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "productTagId" TEXT,
ADD COLUMN     "tagId" TEXT;

-- AddCheckConstraint
ALTER TABLE "Report" ADD CONSTRAINT "Report_exactly_one_target_check" CHECK (
    ("tagId" IS NOT NULL)::integer + ("productTagId" IS NOT NULL)::integer + ("productId" IS NOT NULL)::integer = 1
);

-- CreateIndex
CREATE INDEX "Report_tagId_idx" ON "Report"("tagId");

-- CreateIndex
CREATE INDEX "Report_productTagId_idx" ON "Report"("productTagId");

-- CreateIndex
CREATE INDEX "Report_productId_idx" ON "Report"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_tagId_key" ON "Report"("reporterId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_productTagId_key" ON "Report"("reporterId", "productTagId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_productId_key" ON "Report"("reporterId", "productId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_productTagId_fkey" FOREIGN KEY ("productTagId") REFERENCES "ProductTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
