import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client'; // Prismaをインポート

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const negativeTagsParam = searchParams.get('negativeTags'); // マイナス検索タグを取得
    console.log('Raw negativeTagsParam:', negativeTagsParam); // Raw値をログ出力
    const ageRatingTagId = searchParams.get('ageRatingTagId'); // 対象年齢タグIDを取得
    const categoryTagId = searchParams.get('categoryTagId'); // カテゴリータグIDを取得
    const featureTagIdsParam = searchParams.get('featureTagIds'); // 主要機能タグIDを取得

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

    // 検索条件が何も指定されていない場合は空の結果を返す
    // ただし、マイナス検索タグのみが指定された場合は検索を実行する
    if (whereConditions.length === 0 && negativeTagNames.length === 0) {
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

    console.log(`検索タグ: ${tagNames.join(',')}, マイナス検索タグ: ${negativeTagNames.join(',')}, 検索結果数: ${formattedProducts.length}`); // ログにマイナス検索タグを追加

    return NextResponse.json(formattedProducts);

  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}