import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const proposalSchema = z.object({
  type: z.enum(["ALIAS", "IMPLICATION", "HIERARCHY_PARENT", "HIERARCHY_CHILD"]),
  sourceTagId: z.string(),
  targetTagId: z.string(),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await proposalSchema.safeParseAsync(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const { type, sourceTagId, targetTagId, comment } = result.data;

  try {
    const proposal = await prisma.tagRelationProposal.create({
      data: {
        type,
        sourceTagId,
        targetTagId,
        comment,
        proposerId: session.user.id,
      },
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Error creating tag relation proposal:", error);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
