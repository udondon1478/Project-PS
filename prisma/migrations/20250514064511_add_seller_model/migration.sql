/*
  Warnings:

  - You are about to drop the column `sellerIconUrl` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sellerName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sellerUrl` on the `Product` table. All the data in the column will be lost.
  - Added the required column `sellerId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sellerIconUrl",
DROP COLUMN "sellerName",
DROP COLUMN "sellerUrl",
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "sellers" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("_id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
