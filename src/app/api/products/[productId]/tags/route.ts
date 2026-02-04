import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth'; // authをインポート
import { sanitizeAndValidate } from '@/lib/sanitize';
import { resolveImplications } from '@/lib/tagImplication';

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
      // 現在の商品の独自タグを取得
      const currentManualProductTags = await tx.productTag.findMany({
        where: { productId: productId, isOfficial: false },
        include: { tag: true },
      });

      const currentManualTagIds = new Set(currentManualProductTags.map(pt => pt.tagId));

      // 1. ユーザー入力タグの解決（名前 -> ID）
      const userIntentTagIds: string[] = [];
      
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
        // 重複を除外してリストに追加
        if (!userIntentTagIds.includes(tag.id)) {
            userIntentTagIds.push(tag.id);
        }
      }

      // 2. 含意タグの解決 (Expansion)
      // ユーザーが選択したタグから含意されるすべてのタグを取得
      const allTagIdsIncludingImplied = await resolveImplications(userIntentTagIds, tx);
      
      // 含意によって追加されたタグIDのみのセット（isImpliedフラグ用）
      // ユーザーが明示的に指定したタグは、たとえ含意関係にあっても isImplied=false とする
      const impliedTagIdsSet = new Set(
          allTagIdsIncludingImplied.filter(id => !userIntentTagIds.includes(id))
      );

      const finalTagIds = new Set(allTagIdsIncludingImplied);

      // 3. 差分計算（履歴用）
      // 最終的な状態（含意含む）と現在の状態を比較する
      const addedTags: string[] = [];
      const removedTags: string[] = [];
      const keptTags: string[] = [];

      for (const id of finalTagIds) {
        if (!currentManualTagIds.has(id)) {
          addedTags.push(id);
        } else {
          keptTags.push(id);
        }
      }

      for (const id of currentManualTagIds) {
        if (!finalTagIds.has(id)) {
          removedTags.push(id);
        }
      }

      // 4. タグの更新
      // 既存の独自タグを削除
      await tx.productTag.deleteMany({
        where: {
          productId: productId,
          isOfficial: false,
        },
      });

      // 新しいタグを一括作成
      // createManyを使用 (PostgreSQL)
      const dataToCreate = allTagIdsIncludingImplied.map(tagId => ({
          productId: productId,
          tagId: tagId,
          userId: session.user.id!,
          isOfficial: false,
          isImplied: impliedTagIdsSet.has(tagId)
      }));

      if (dataToCreate.length > 0) {
          await tx.productTag.createMany({
              data: dataToCreate,
              skipDuplicates: true, // 安全のため
          });
      }

      // 5. 履歴の保存
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
