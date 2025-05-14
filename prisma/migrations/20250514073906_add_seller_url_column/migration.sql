/*
  Warnings:

  - A unique constraint covering the columns `[sellerUrl]` on the table `sellers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sellerUrl` to the `sellers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "sellerUrl" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sellers_sellerUrl_key" ON "sellers"("sellerUrl");
