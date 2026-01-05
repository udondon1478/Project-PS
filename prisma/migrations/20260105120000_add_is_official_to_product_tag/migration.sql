-- AlterTable: Add isOfficial column with default value false
-- This is a non-breaking change - existing records will get isOfficial = false
ALTER TABLE "ProductTag" ADD COLUMN "isOfficial" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex: Remove the old unique constraint
DROP INDEX "ProductTag_productId_tagId_key";

-- CreateIndex: Add new unique constraint including isOfficial
-- This is a relaxation of the constraint (less strict), so existing data will remain valid
CREATE UNIQUE INDEX "ProductTag_productId_tagId_isOfficial_key" ON "ProductTag"("productId", "tagId", "isOfficial");

-- CreateIndex: Add index for isOfficial column for query performance
CREATE INDEX "ProductTag_isOfficial_idx" ON "ProductTag"("isOfficial");
