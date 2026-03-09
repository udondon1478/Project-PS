import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { sanitizeAndValidate } from '@/lib/sanitize';
import { resolveImplications } from '@/lib/tagImplication';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await context.params;
  const { tags, comment } = await req.json();

  if (!productId || !tags || !Array.isArray(tags)) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const sanitizedTags = tags.map((tag: { name: string }) => {
      try {
        const sanitizedName = sanitizeAndValidate(tag.name);
        return { ...tag, name: sanitizedName };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Invalid tag "${tag.name}": ${error.message}`);
        }
        throw new Error(`Invalid tag "${tag.name}"`);
      }
    });


    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currentProductTags = await tx.productTag.findMany({
        where: { productId: productId },
        include: { tag: true },
      });

      const manualProductTags = currentProductTags.filter(pt => !pt.isOfficial && !pt.isImplied);

      const currentManualTagNames = new Set(
        manualProductTags.map((pt: { tag: { name: string } }) => pt.tag.name)
      );

      const newTagNames = new Set(sanitizedTags.map((t: { name: string }) => t.name));

      const addedTags: string[] = [];
      const removedTags: string[] = [];
      const keptTags: string[] = [];

      for (const currentTag of manualProductTags) {
        if (!newTagNames.has(currentTag.tag.name)) {
          removedTags.push(currentTag.tag.id);
        } else {
          keptTags.push(currentTag.tag.id);
        }
      }

      for (const newTagData of sanitizedTags) {
        if (!currentManualTagNames.has(newTagData.name)) {
          let tag = await tx.tag.findUnique({
            where: { name: newTagData.name },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                name: newTagData.name,
                language: 'ja',
              },
            });
          }
          addedTags.push(tag.id);
        }
      }

      // 独自タグ（isOfficial: false）のみを削除
      // 公式タグは通常APIからは削除しない（ADMINでも誤削除防止のため）
      await tx.productTag.deleteMany({
        where: {
          productId: productId,
          isOfficial: false,
        },
      });

      for (const tagData of sanitizedTags) {
        let tag = await tx.tag.findUnique({
          where: { name: tagData.name },
        });

        if (!tag) {
          tag = await tx.tag.create({
            data: {
              name: tagData.name,
              language: 'ja',
            },
          });
        }

        await tx.productTag.create({
          data: {
            productId: productId,
            tagId: tag.id,
            userId: session.user.id!,
            isOfficial: false,
          },
        });
      }

      const manualTagIds = await tx.productTag
        .findMany({
          where: { productId, isOfficial: false, isImplied: false },
          select: { tagId: true },
        })
        .then((pts) => pts.map((pt) => pt.tagId));

      const impliedTagIds = await resolveImplications(manualTagIds, tx);

      const existingTagIds = new Set(
        (
          await tx.productTag.findMany({
            where: { productId },
            select: { tagId: true },
          })
        ).map((pt) => pt.tagId)
      );

      for (const impliedTagId of impliedTagIds) {
        if (!existingTagIds.has(impliedTagId)) {
          await tx.productTag.create({
            data: {
              productId,
              tagId: impliedTagId,
              userId: session.user.id!,
              isOfficial: false,
              isImplied: true,
            },
          });
        }
      }

      const latestHistory = await tx.tagEditHistory.findFirst({
        where: { productId: productId },
        orderBy: { version: 'desc' },
      });
      const newVersion = (latestHistory?.version || 0) + 1;

      await tx.tagEditHistory.create({
        data: {
          productId: productId,
          editorId: session.user.id!,
          version: newVersion,
          addedTags: addedTags,
          removedTags: removedTags,
          keptTags: keptTags,
          comment: comment && comment.trim() !== '' ? comment.trim() : null,
        },
      });
    });

    return NextResponse.json({ message: 'Tags updated successfully' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Invalid tag')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error updating tags:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}