import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client'; // Prismaをインポート

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // クエリログを有効化
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    console.log('All searchParams entries:'); // searchParamsの全エントリーをログ出力
    for (const [key, value] of searchParams.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const tagsParam = searchParams.get('tags');
    const negativeTagsParam = searchParams.get('negativeTags'); // マイナス検索タグを取得
    console.log('Raw negativeTagsParam (get):', negativeTagsParam); // get()で取得したRaw値をログ出力

    const ageRatingTagId = searchParams.get('ageRatingTagId'); // 対象年齢タグIDを取得
    const categoryTagId = searchParams.get('categoryTagId'); // カテゴリータグIDを取得
    const featureTagIdsParam = searchParams.get('featureTagIds'); // 主要機能タグIDを取得
    const minPriceParam = searchParams.get('minPrice'); // 最小価格を取得
    const maxPriceParam = searchParams.get('maxPrice'); // 最大価格を取得
    const isHighPriceParam = searchParams.get('isHighPrice'); // 高額商品フラグを取得

    let minPrice = minPriceParam ? parseInt(minPriceParam) : undefined; // 数値に変換、無効な場合はundefined
    let maxPrice = maxPriceParam ? parseInt(maxPriceParam) : undefined; // 数値に変換、無効な場合はundefined

    // 高額商品フィルタリングが有効な場合、価格範囲を上書き
    if (isHighPriceParam === 'true') {
      minPrice = 10000;
      maxPrice = 100000; // 100000+ を示す値として設定
    }

    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const negativeTagNames = negativeTagsParam ? negativeTagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []; // マイナス検索タグ名をパース
    const featureTagIds = featureTagIdsParam ? featureTagIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0) : [];

    const tagIdsToFilter = [...featureTagIds];
    if (ageRatingTagId) {
      tagIdsToFilter.push(ageRatingTagId);
    }
    if (categoryTagId) {
      tagIdsToFilter.push(categoryTagId);
    }

    const whereConditions: Prisma.ProductWhereInput[] = []; // 型を修正

    // 通常タグ名によるフィルタリング (手動入力されたタグ)
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

    // マイナス検索タグ名によるフィルタリング
    if (negativeTagNames.length > 0) {
      whereConditions.push({
        AND: negativeTagNames.map(negativeTagName => ({
          productTags: {
            none: { // noneを使用して指定タグを含まない商品を検索
              tag: {
                name: negativeTagName
              }
            }
          }
        }))
      });
    }

    // タグIDによるフィルタリング (対象年齢、カテゴリー、主要機能)
    if (tagIdsToFilter.length > 0) {
       whereConditions.push({
         AND: tagIdsToFilter.map(tagId => ({
           productTags: {
             some: {
               tagId: tagId
             }
           }
         }))
       });
    }

    // 価格帯によるフィルタリング
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCondition: Prisma.ProductWhereInput = {};
      if (minPrice !== undefined) {
        priceCondition.highPrice = { gte: minPrice }; // highPriceが最小価格以上
      }
      if (maxPrice !== undefined) {
        if (maxPrice === 100000) { // 100000+ の場合
          // 上限なし
        } else {
          priceCondition.lowPrice = { lte: maxPrice }; // lowPriceが最大価格以下
        }
      }
      whereConditions.push(priceCondition);
    }


    const products = await prisma.product.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      orderBy: { // 並び順を追加
        createdAt: 'desc', // 作成日時の降順
      },
      include: {
        productTags: {
          include: {
            tag: true,
          },
        },
        images: {
          where: {
            isMain: true,
          },
          take: 1,
        },
        variations: {
          orderBy: {
            order: 'asc',
          },
        },
      },
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

    console.log(`検索タグ: ${tagNames.join(',')}, マイナス検索タグ: ${negativeTagNames.join(',')}, 検索結果数: ${formattedProducts.length}`); // ログにマイナス検索タグを追加

    return NextResponse.json(formattedProducts);

  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
