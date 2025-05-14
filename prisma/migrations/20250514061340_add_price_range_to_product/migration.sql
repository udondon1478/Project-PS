/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Added the required column `highPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lowPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "price",
ADD COLUMN     "highPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lowPrice" DOUBLE PRECISION NOT NULL;
