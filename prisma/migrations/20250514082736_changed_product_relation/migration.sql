-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sellerId_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "sellerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
