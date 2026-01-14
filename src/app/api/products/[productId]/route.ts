import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Prismaクライアントをインポート
import { auth } from '@/auth'; // authをインポート

export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const session = await auth(); // セッション情報を取得
  const userId = session?.user?.id;

  try {
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        seller: true, // 販売者情報を追加
        images: { // 画像情報も取得
          orderBy: {
            order: 'asc', // 表示順でソート
          },
        },
        productTags: { // 商品に紐づくタグ情報も取得
          select: {
            isOfficial: true, // 公式タグかどうかのフラグ
            tag: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                tagCategoryId: true,
                tagCategory: {
                  select: {
                    id: true,
                    name: true,
                    color: true, // カテゴリ色を追加
                  },
                },
              },
            },
          },
        },
        likes: {
          where: { userId: userId ?? '' },
        },
        productOwners: {
          where: { userId: userId ?? '' },
        },
        tagEditHistory: {
          include: {
            editor: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            version: 'desc',
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // --- Fetch user's votes for the history items ---
    const userVotesMap: { [key: string]: { score: number } } = {};
    if (userId && product.tagEditHistory.length > 0) {
      const historyIds = product.tagEditHistory.map(h => h.id);
      const votes = await prisma.tagEditVote.findMany({
        where: {
          userId: userId,
          historyId: {
            in: historyIds,
          },
        },
        select: {
          historyId: true,
          score: true,
        },
      });
      votes.forEach(vote => {
        userVotesMap[vote.historyId] = { score: vote.score };
      });
    }

    // --- Augment history with user's vote ---
    const tagEditHistoryWithVotes = product.tagEditHistory.map(history => ({
      ...history,
      userVote: userVotesMap[history.id] || null,
    }));

    const productData = {
      ...product,
      isLiked: product.likes.length > 0,
      isOwned: product.productOwners.length > 0,
      tagEditHistory: tagEditHistoryWithVotes,
    };

    // --- Fetch tag names for history ---
    const tagIdToNameMap: { [key: string]: { name: string; displayName: string | null } } = {};
    if (product.tagEditHistory && product.tagEditHistory.length > 0) {
      const tagIds = new Set<string>();
      product.tagEditHistory.forEach(history => {
        history.addedTags.forEach(id => tagIds.add(id));
        history.removedTags.forEach(id => tagIds.add(id));
        history.keptTags.forEach(id => tagIds.add(id));
      });

      if (tagIds.size > 0) {
        const tags = await prisma.tag.findMany({
          where: {
            id: {
              in: Array.from(tagIds),
            },
          },
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        });

        tags.forEach(tag => {
          tagIdToNameMap[tag.id] = { name: tag.name, displayName: tag.displayName };
        });
      }
    }

    // Return the product data along with the tag name map
    return NextResponse.json({ product: productData, tagIdToNameMap });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
