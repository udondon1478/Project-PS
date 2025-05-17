import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const ageRatingId = searchParams.get('ageRatingId');
    const categoryName = searchParams.get('categoryName'); // カテゴリー名を検索
    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    const whereConditions: any[] = [];

    // タグによるフィルタリング
    if (tagNames.length > 0) {
      whereConditions.push({
        AND: tagNames.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        }))
      });
    }

    // 対象年齢によるフィルタリング
    if (ageRatingId) {
      whereConditions.push({
        ageRatingId: ageRatingId
      });
    }

    // カテゴリーによるフィルタリング (カテゴリー名からIDを検索)
    if (categoryName) {
      const category = await prisma.category.findUnique({
        where: { name: categoryName },
        select: { id: true }, // IDのみ取得
      });

      if (category) {
        whereConditions.push({
          categoryId: category.id
        });
      } else {
        // 指定されたカテゴリー名が見つからない場合は、その条件ではフィルタリングしない
        console.warn(`Category with name "${categoryName}" not found.`);
      }
    }

    // 検索条件が何も指定されていない場合は空の結果を返す
    if (whereConditions.length === 0) {
       return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        AND: whereConditions
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