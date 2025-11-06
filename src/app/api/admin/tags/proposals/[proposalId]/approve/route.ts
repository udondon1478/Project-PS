import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { proposalId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { proposalId } = params;

  try {
    const proposal = await prisma.tagRelationProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status !== "PENDING") {
      return NextResponse.json({ error: "Proposal has already been processed" }, { status: 400 });
    }

    switch (proposal.type) {
      case "ALIAS":
        await prisma.tag.update({
          where: { id: proposal.sourceTagId },
          data: { canonicalId: proposal.targetTagId, isAlias: true },
        });
        break;
      case "IMPLICATION":
        await prisma.tagImplication.create({
          data: {
            implyingTagId: proposal.sourceTagId,
            impliedTagId: proposal.targetTagId,
          },
        });
        break;
      case "HIERARCHY_PARENT":
        await prisma.tagHierarchy.create({
          data: {
            parentId: proposal.sourceTagId,
            childId: proposal.targetTagId,
          },
        });
        break;
      case "HIERARCHY_CHILD":
        await prisma.tagHierarchy.create({
          data: {
            parentId: proposal.targetTagId,
            childId: proposal.sourceTagId,
          },
        });
        break;
    }

    const updatedProposal = await prisma.tagRelationProposal.update({
      where: { id: proposalId },
      data: { status: "APPROVED", moderatorId: session.user.id },
    });

    return NextResponse.json(updatedProposal);
  } catch (error) {
    console.error("Error approving tag relation proposal:", error);
    return NextResponse.json({ error: "Failed to approve proposal" }, { status: 500 });
  }
}
