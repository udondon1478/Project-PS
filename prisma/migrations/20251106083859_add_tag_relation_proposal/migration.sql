-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('ALIAS', 'IMPLICATION', 'HIERARCHY_PARENT', 'HIERARCHY_CHILD');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TagRelationProposal" (
    "id" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "sourceTagId" TEXT NOT NULL,
    "targetTagId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "comment" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "moderatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagRelationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TagRelationProposal_sourceTagId_idx" ON "TagRelationProposal"("sourceTagId");

-- CreateIndex
CREATE INDEX "TagRelationProposal_targetTagId_idx" ON "TagRelationProposal"("targetTagId");

-- CreateIndex
CREATE INDEX "TagRelationProposal_proposerId_idx" ON "TagRelationProposal"("proposerId");

-- CreateIndex
CREATE INDEX "TagRelationProposal_status_idx" ON "TagRelationProposal"("status");

-- AddForeignKey
ALTER TABLE "TagRelationProposal" ADD CONSTRAINT "TagRelationProposal_sourceTagId_fkey" FOREIGN KEY ("sourceTagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRelationProposal" ADD CONSTRAINT "TagRelationProposal_targetTagId_fkey" FOREIGN KEY ("targetTagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRelationProposal" ADD CONSTRAINT "TagRelationProposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRelationProposal" ADD CONSTRAINT "TagRelationProposal_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
