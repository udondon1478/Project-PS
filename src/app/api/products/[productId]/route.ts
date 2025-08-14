import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Prismaクライアントをインポート

export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;

  try {
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        images: { // 画像情報も取得
          orderBy: {
            order: 'asc', // 表示順でソート
          },
        },
        productTags: { // 商品に紐づくタグ情報も取得
          include: {
            tag: { // タグ情報
              include: {
                tagCategory: true, // タグカテゴリ情報
              },
            },
          },
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

    // --- Fetch tag names for history ---
    const tagIdToNameMap: { [key: string]: string } = {};
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
          },
        });

        tags.forEach(tag => {
          tagIdToNameMap[tag.id] = tag.name;
        });
      }
    }

    // Return the product data along with the tag name map
    return NextResponse.json({ product, tagIdToNameMap });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}