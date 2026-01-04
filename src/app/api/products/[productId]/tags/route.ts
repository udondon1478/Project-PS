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

    // ユーザーのロールを取得（公式タグ編集権限の確認用）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = user?.role === 'ADMIN';

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 現在の商品のタグを取得（公式/独自の区分を含む）
      const currentProductTags = await tx.productTag.findMany({
        where: { productId: productId },
        include: { tag: true },
      });

      // 公式タグと独自タグを分離
      const officialProductTags = currentProductTags.filter(pt => pt.isOfficial);
      const manualProductTags = currentProductTags.filter(pt => !pt.isOfficial);

      const currentManualTagNames = new Set(
        manualProductTags.map((pt: { tag: { name: string } }) => pt.tag.name)
      );

      const newTagNames = new Set(sanitizedTags.map((t: { name: string }) => t.name));

      const addedTags: string[] = [];
      const removedTags: string[] = [];
      const keptTags: string[] = [];

      // 削除された独自タグを特定
      for (const currentTag of manualProductTags) {
        if (!newTagNames.has(currentTag.tag.name)) {
          removedTags.push(currentTag.tag.id);
        } else {
          keptTags.push(currentTag.tag.id);
        }
      }

      // 追加されたタグを特定
      for (const newTagData of sanitizedTags) {
        if (!currentManualTagNames.has(newTagData.name)) {
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

      // 独自タグ（isOfficial: false）のみを削除
      // 公式タグはADMIN以外は削除できない
      if (isAdmin) {
        // ADMINは全てのタグを削除可能
        await tx.productTag.deleteMany({
          where: {
            productId: productId,
          },
        });
      } else {
        // 一般ユーザーは独自タグのみ削除可能
        await tx.productTag.deleteMany({
          where: {
            productId: productId,
            isOfficial: false,
          },
        });
      }

      // 新しい独自タグを作成または既存のタグと関連付け
      for (const tagData of sanitizedTags) {
        let tag = await tx.tag.findUnique({
          where: { name: tagData.name },
        });

        if (!tag) {
          // タグが存在しない場合は新規作成
          tag = await tx.tag.create({
            data: {
              name: tagData.name,
              language: 'ja',
            },
          });
        }

        // ProductTagを作成（独自タグとして: isOfficial: false）
        await tx.productTag.create({
          data: {
            productId: productId,
            tagId: tag.id,
            userId: session.user.id!,
            isOfficial: false,
          },
        });
      }

      // ADMINでない場合は公式タグを再作成（保持）
      if (!isAdmin) {
        for (const officialTag of officialProductTags) {
          await tx.productTag.create({
            data: {
              productId: productId,
              tagId: officialTag.tagId,
              userId: officialTag.userId,
              isOfficial: true,
            },
          });
        }
      }

      // 最新のバージョン番号を取得
      const latestHistory = await tx.tagEditHistory.findFirst({
        where: { productId: productId },
        orderBy: { version: 'desc' },
      });
      const newVersion = (latestHistory?.version || 0) + 1;

      // TagEditHistoryを作成（独自タグの変更のみを記録）
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