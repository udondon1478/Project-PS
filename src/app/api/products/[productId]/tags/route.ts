import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role } from '@prisma/client';
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
    const isAdmin = user?.role === Role.ADMIN;

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
      // 公式タグは通常APIからは削除しない（ADMINでも誤削除防止のため）
      await tx.productTag.deleteMany({
        where: {
          productId: productId,
          isOfficial: false,
        },
      });

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

      // 公式タグは削除していないので再作成は不要 (ADMIN分岐削除に伴い修正)
      // ただし、以前のロジックでADMINが全削除していた場合は再作成が必要だったが、
      // 今回の変更で公式タグはタッチしなくなったため、ここの処理は不要になる可能性がある。
      // しかし念のため、現状のロジック構造を大きく変えすぎないように、
      // 独自タグの作成ループ（上記）とは別に、もし公式タグが消えている場合の復旧ロジックがあれば良いが、
      // ここでは「ADMINでない場合は公式タグを再作成（保持）」という元のロジックが、
      // 「ADMINでなく、かつdeleteManyでisOfficial:falseのみを消した」なら
      // 公式タグはDBに残っているはずなので、createで重複エラーになる可能性がある。
      // 既存コードの if (!isAdmin) ブロックは、以前は「ADMIN以外は公式タグを消せないので（そもそも消してない想定？いや、deleteManyはisOfficial:falseのみだった）」
      // いや、元のコードを確認すると:
      // if (isAdmin) { deleteMany(all) } else { deleteMany(false) }
      // その後: if (!isAdmin) { create official tags }
      // つまり、「ADMIN以外はdeleteManyで公式タグを消していないので、createすると重複する」はずだが...
      // Prismaのcreateは重複するとエラーになるのでは？
      // 元のコードの update: {} がない create なので、重複エラーになるはず。
      // ...あ、なるほど。 transaction内だからか？
      // いや、deleteManyの後にcreateしている。
      // 元のコードの if (!isAdmin) ブロックは、実はバグだった可能性があるか、
      // あるいは productTags.create のように親からのネスト作成ではなく直接 create なので
      // 重複エラーが出るはず。
      // 今回、deleteManyを isOfficial:false に限定したので、公式タグは残る。
      // したがって、公式タグを再登録する必要はない。
      // なので、このブロックは削除するのが正しい。

      // 元のコード:
      // if (!isAdmin) {
      //   for (const officialTag of officialProductTags) {
      //     await tx.productTag.create(...)
      //   }
      // }
      
      // 今回の変更で全員 isOfficial: false のみを消すようになったので、
      // 公式タグはDBに残存している。再作成しようとするとUnique制約違反になる。
      // したがって削除する。

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