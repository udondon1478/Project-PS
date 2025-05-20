/*
  Warnings:

  - You are about to drop the column `category` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `Tag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "category",
DROP COLUMN "color",
ADD COLUMN     "tagCategoryId" TEXT;

-- CreateTable
CREATE TABLE "tag_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "tag_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_categories_name_key" ON "tag_categories"("name");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tagCategoryId_fkey" FOREIGN KEY ("tagCategoryId") REFERENCES "tag_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
