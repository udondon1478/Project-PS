/*
  Warnings:

  - A unique constraint covering the columns `[tagId]` on the table `sellers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "tagId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sellers_tagId_key" ON "sellers"("tagId");

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
