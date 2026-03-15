import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN" || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { action, productIds, tagsToAdd = [], tagsToRemove = [], dryRun } = body;

  // Input validation
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: "No products selected" }, { status: 400 });
  }
  if (!["add", "remove", "replace"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!Array.isArray(tagsToAdd)) {
    return NextResponse.json({ error: "tagsToAdd must be an array" }, { status: 400 });
  }
  if (!Array.isArray(tagsToRemove)) {
    return NextResponse.json({ error: "tagsToRemove must be an array" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Resolve tag names to IDs - batch processing to avoid N+1
      const resolvedTagsToAdd: string[] = [];

      if (tagsToAdd.length > 0) {
        // Find existing tags in one query
        const existingTags = await tx.tag.findMany({
          where: { name: { in: tagsToAdd } }
        });
        const existingTagMap = new Map(existingTags.map(t => [t.name, t.id]));

        // Identify tags that need to be created
        const tagsToCreate = tagsToAdd.filter(name => !existingTagMap.has(name));

        if (tagsToCreate.length > 0 && !dryRun) {
          // Create new tags in bulk
          await tx.tag.createMany({
            data: tagsToCreate.map(name => ({ name, language: "ja" as const })),
            skipDuplicates: true
          });

          // Fetch newly created tags
          const newTags = await tx.tag.findMany({
            where: { name: { in: tagsToCreate } }
          });
          newTags.forEach(t => existingTagMap.set(t.name, t.id));
        } else if (tagsToCreate.length > 0 && dryRun) {
          // For dry run, mock IDs for new tags
          tagsToCreate.forEach(name => existingTagMap.set(name, `new-${name}`));
        }

        resolvedTagsToAdd.push(...tagsToAdd.map(name => existingTagMap.get(name)!).filter(Boolean));
      }

      const resolvedTagsToRemove: string[] = [];
      if (tagsToRemove.length > 0) {
        const tags = await tx.tag.findMany({ where: { name: { in: tagsToRemove } } });
        resolvedTagsToRemove.push(...tags.map((t) => t.id));
      }

      const changes = [];

      // Fetch current tags for all products at once (for replace action)
      const currentTagsMap = new Map<string, string[]>();
      if (action === "replace") {
        const allCurrentTags = await tx.productTag.findMany({
          where: {
            productId: { in: productIds },
            isOfficial: false
          },
          select: { productId: true, tagId: true }
        });

        for (const pt of allCurrentTags) {
          if (!currentTagsMap.has(pt.productId)) {
            currentTagsMap.set(pt.productId, []);
          }
          currentTagsMap.get(pt.productId)!.push(pt.tagId);
        }
      }

      // Prepare changes for all products
      for (const productId of productIds) {
        let added: string[] = [];
        let removed: string[] = [];

        if (action === "add") {
          added = resolvedTagsToAdd;
        } else if (action === "remove") {
          removed = resolvedTagsToRemove;
        } else if (action === "replace") {
          removed = currentTagsMap.get(productId) || [];
          added = resolvedTagsToAdd;
        }

        changes.push({ productId, added, removed });
      }

      if (!dryRun) {
        // Batch delete operations
        const deleteOperations = changes
          .filter(c => c.removed.length > 0)
          .map(c => ({
            productId: c.productId,
            tagId: { in: c.removed },
            isOfficial: false as const
          }));

        if (deleteOperations.length > 0) {
          await tx.productTag.deleteMany({
            where: {
              OR: deleteOperations
            }
          });
        }

        // Batch create operations - first check existing to avoid duplicates
        const tagsToCreate: Array<{ productId: string; tagId: string }> = [];
        for (const change of changes) {
          if (change.added.length > 0) {
            for (const tagId of change.added) {
              tagsToCreate.push({ productId: change.productId, tagId });
            }
          }
        }

        if (tagsToCreate.length > 0) {
          // Check which product-tag combinations already exist
          const existing = await tx.productTag.findMany({
            where: {
              OR: tagsToCreate.map(({ productId, tagId }) => ({
                productId,
                tagId,
                isOfficial: false
              }))
            },
            select: { productId: true, tagId: true }
          });

          const existingSet = new Set(
            existing.map(e => `${e.productId}:${e.tagId}`)
          );

          // Filter out existing combinations
          const newProductTags = tagsToCreate.filter(
            ({ productId, tagId }) => !existingSet.has(`${productId}:${tagId}`)
          );

          // Bulk create new product tags
          if (newProductTags.length > 0) {
            await tx.productTag.createMany({
              data: newProductTags.map(({ productId, tagId }) => ({
                productId,
                tagId,
                userId: session.user.id,
                isOfficial: false
              })),
              skipDuplicates: true
            });
          }
        }

        // Batch create history records
        // First, get last versions for all products
        const lastHistories = await tx.tagEditHistory.findMany({
          where: { productId: { in: productIds } },
          orderBy: { version: 'desc' },
          distinct: ['productId']
        });

        const versionMap = new Map(
          lastHistories.map(h => [h.productId, h.version])
        );

        const historyRecords = changes.map(({ productId, added, removed }) => ({
          productId,
          editorId: session.user.id,
          version: (versionMap.get(productId) ?? 0) + 1,
          addedTags: added,
          removedTags: removed,
          keptTags: [], // Simplified
          comment: `Batch ${action}`
        }));

        await tx.tagEditHistory.createMany({
          data: historyRecords
        });
      }

      return changes;
    });

    return NextResponse.json({ success: true, dryRun, changes: result });
  } catch (error) {
    console.error("Batch tag error:", error);

    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown };
      if (prismaError.code === 'P2002') {
        return NextResponse.json({ error: "Duplicate entry detected" }, { status: 409 });
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
