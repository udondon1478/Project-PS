/*
  Warnings:

  - You are about to drop the column `ageRatingId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `AgeRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_ageRatingId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "ageRatingId",
DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'general';

-- DropTable
DROP TABLE "AgeRating";

-- DropTable
DROP TABLE "Category";
