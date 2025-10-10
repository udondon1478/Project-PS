import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth'; // authをインポート
import { sanitizeAndValidate } from '@/lib/sanitize';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const session = await auth(); // セッション情報を取得

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
      // 現在の商品のタグを取得
      const currentProductTags = await tx.productTag.findMany({
        where: { productId: productId },
        include: { tag: true },
      });
      const currentTagNames = new Set(
        currentProductTags.map((pt: { tag: { name: string } }) => pt.tag.name)
      );

      const newTagNames = new Set(sanitizedTags.map((t: { name: string }) => t.name));

      const addedTags: string[] = [];
      const removedTags: string[] = [];
      const keptTags: string[] = [];

      // 削除されたタグを特定
      for (const currentTag of currentProductTags) {
        if (!newTagNames.has(currentTag.tag.name)) {
          removedTags.push(currentTag.tag.id);
        } else {
          keptTags.push(currentTag.tag.id);
        }
      }

      // 追加されたタグを特定
      for (const newTagData of sanitizedTags) {
        if (!currentTagNames.has(newTagData.name)) {
          // 新規タグの場合は、まずTagモデルに存在するか確認し、なければ作成
          let tag = await tx.tag.findUnique({
            where: { name: newTagData.name },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                name: newTagData.name,
                language: 'ja', // デフォルト言語を日本語に設定
              },
            });
          }
          addedTags.push(tag.id);
        }
      }

      // 既存のProductTagを削除
      await tx.productTag.deleteMany({
        where: {
          productId: productId,
        },
      });

      // 新しいタグを作成または既存のタグと関連付け
      for (const tagData of sanitizedTags) {
        let tag = await tx.tag.findUnique({
          where: { name: tagData.name },
        });

        if (!tag) {
          // タグが存在しない場合は新規作成 (addedTagsの計算で既に作成されている可能性もあるが、念のため)
          tag = await tx.tag.create({
            data: {
              name: tagData.name,
              language: 'ja',
            },
          });
        }

        // ProductTagを作成
        await tx.productTag.create({
          data: {
            productId: productId,
            tagId: tag.id,
            userId: session.user.id!,
          },
        });
      }

      // 最新のバージョン番号を取得
      const latestHistory = await tx.tagEditHistory.findFirst({
        where: { productId: productId },
        orderBy: { version: 'desc' },
      });
      const newVersion = (latestHistory?.version || 0) + 1;

      // TagEditHistoryを作成
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