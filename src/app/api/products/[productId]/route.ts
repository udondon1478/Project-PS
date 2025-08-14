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

    // 取得した商品データをJSON形式で返す
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}