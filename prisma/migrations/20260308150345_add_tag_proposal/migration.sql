-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('CATEGORY', 'TRANSLATION', 'IMPLICATION');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "tag_proposals" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "categoryId" TEXT,
    "existingTagId" TEXT,
    "newTagName" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tag_proposals_tagId_idx" ON "tag_proposals"("tagId");

-- CreateIndex
CREATE INDEX "tag_proposals_proposerId_idx" ON "tag_proposals"("proposerId");

-- CreateIndex
CREATE INDEX "tag_proposals_status_idx" ON "tag_proposals"("status");

-- CreateIndex
CREATE INDEX "tag_proposals_type_idx" ON "tag_proposals"("type");

-- AddForeignKey
ALTER TABLE "tag_proposals" ADD CONSTRAINT "tag_proposals_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_proposals" ADD CONSTRAINT "tag_proposals_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_proposals" ADD CONSTRAINT "tag_proposals_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tag_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_proposals" ADD CONSTRAINT "tag_proposals_existingTagId_fkey" FOREIGN KEY ("existingTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
