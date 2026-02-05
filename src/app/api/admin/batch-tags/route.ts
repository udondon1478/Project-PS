import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, productIds, tagsToAdd = [], tagsToRemove = [], dryRun } = body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: "No products selected" }, { status: 400 });
  }
  if (!["add", "remove", "replace"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Resolve tag names to IDs
      const resolvedTagsToAdd: string[] = [];
      for (const name of tagsToAdd) {
        let tag = await tx.tag.findUnique({ where: { name } });
        if (!tag && !dryRun) {
           tag = await tx.tag.create({ data: { name, language: "ja" } });
        } else if (!tag && dryRun) {
           // For dry run, mock an ID
           tag = { id: `new-${name}`, name } as any;
        }
        if (tag) resolvedTagsToAdd.push(tag.id);
      }

      const resolvedTagsToRemove: string[] = [];
      if (tagsToRemove.length > 0) {
        const tags = await tx.tag.findMany({ where: { name: { in: tagsToRemove } } });
        resolvedTagsToRemove.push(...tags.map((t) => t.id));
      }

      const changes = [];

      for (const productId of productIds) {
        // Logic depends on action
        let added: string[] = [];
        let removed: string[] = [];

        if (action === "add") {
          added = resolvedTagsToAdd;
        } else if (action === "remove") {
          removed = resolvedTagsToRemove;
        } else if (action === "replace") {
          // Replace means: remove all existing user tags, add new ones
          // Find current tags to record removal
          const current = await tx.productTag.findMany({
            where: { productId, isOfficial: false },
            select: { tagId: true }
          });
          removed = current.map(t => t.tagId);
          added = resolvedTagsToAdd;
        }

        changes.push({ productId, added, removed });

        if (!dryRun) {
            // Apply changes
            if (removed.length > 0) {
              await tx.productTag.deleteMany({
                where: { productId, tagId: { in: removed }, isOfficial: false }
              });
            }
            
            for (const tagId of added) {
               // Check existence to avoid unique constraint error
               const exists = await tx.productTag.findUnique({
                   where: { productId_tagId_isOfficial: { productId, tagId, isOfficial: false } }
               });
               if (!exists) {
                   await tx.productTag.create({
                      data: { productId, tagId, userId: session.user.id, isOfficial: false }
                   });
               }
            }

            // History
            // Calculate version
            const lastHistory = await tx.tagEditHistory.findFirst({
                where: { productId },
                orderBy: { version: 'desc' }
            });
            const version = (lastHistory?.version ?? 0) + 1;

            await tx.tagEditHistory.create({
                data: {
                    productId,
                    editorId: session.user.id,
                    version,
                    addedTags: added,
                    removedTags: removed,
                    keptTags: [], // Simplified
                    comment: `Batch ${action}`
                }
            });
        }
      }
      return changes;
    });

    return NextResponse.json({ success: true, dryRun, changes: result });
  } catch (error) {
    console.error("Batch tag error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
