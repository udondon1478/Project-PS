import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    if (tagNames.length === 0) {
      return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        AND: tagNames.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        }))
      },
      include: {
        productTags: {
          include: {
            tag: true
          }
        },
        images: {
          where: {
            isMain: true
          },
          take: 1
        },
        variations: { // バリエーション情報を含める
          orderBy: {
            order: 'asc',
          },
        },
      }
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice,
      highPrice: product.highPrice, // highPriceも追加
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map(pt => pt.tag.name),
      variations: product.variations.map(v => ({ // バリエーション情報を追加
        id: v.id,
        name: v.name,
        price: v.price,
      })),
    }));

    console.log(`検索タグ: ${tagNames.join(',')}, 検索結果数: ${formattedProducts.length}`);

    return NextResponse.json(formattedProducts);

  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}