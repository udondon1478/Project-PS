import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const ageRatingTagId = searchParams.get('ageRatingTagId'); // 対象年齢タグIDを取得
    const categoryTagId = searchParams.get('categoryTagId'); // カテゴリータグIDを取得
    const featureTagIdsParam = searchParams.get('featureTagIds'); // 主要機能タグIDを取得
 
    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const featureTagIds = featureTagIdsParam ? featureTagIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0) : [];
 
    const tagIdsToFilter = [...featureTagIds];
    if (ageRatingTagId) {
      tagIdsToFilter.push(ageRatingTagId);
    }
    if (categoryTagId) {
      tagIdsToFilter.push(categoryTagId);
    }
 
    const whereConditions: any[] = [];
 
    // タグ名によるフィルタリング (手動入力されたタグ)
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