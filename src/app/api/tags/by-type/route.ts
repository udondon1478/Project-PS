import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AGE_RATING_WHITELIST,
  PRODUCT_CATEGORY_WHITELIST,
  FEATURE_TAG_WHITELIST
} from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryNamesParam = searchParams.get('categoryNames');
    const categoryNames = categoryNamesParam ? categoryNamesParam.split(',') : [];

    // カテゴリ名のマッピング（後方互換性と新旧IDの吸収）
    const categoryMapping: Record<string, string[]> = {
      'age_rating': ['rating', 'age_rating'],
      'rating': ['rating', 'age_rating'],
      'product_category': ['product_type', 'product_category'],
      'product_type': ['product_type', 'product_category'],
    };

    // カテゴリ名を展開
    const expandedCategoryNames = categoryNames.flatMap(
      name => categoryMapping[name] || [name]
    );

    // ホワイトリストによるサーバーサイドフィルタリングの準備
    let nameWhitelist: string[] | undefined = undefined;

    // リクエストが単一のカテゴリタイプに集中している場合、対応するホワイトリストを適用
    const isRatingRequest = categoryNames.some(n => ['rating', 'age_rating'].includes(n));
    const isProductTypeRequest = categoryNames.some(n => ['product_type', 'product_category'].includes(n));
    const isFeatureRequest = categoryNames.some(n => ['feature'].includes(n));

    if (isRatingRequest && !isProductTypeRequest && !isFeatureRequest) {
      nameWhitelist = [...AGE_RATING_WHITELIST];
    } else if (isProductTypeRequest && !isRatingRequest && !isFeatureRequest) {
      nameWhitelist = [...PRODUCT_CATEGORY_WHITELIST];
    } else if (isFeatureRequest && !isRatingRequest && !isProductTypeRequest) {
      nameWhitelist = [...FEATURE_TAG_WHITELIST];
    }

    // クエリ条件の構築
    const whereClause: any = expandedCategoryNames.length > 0 ? {
      tagCategory: {
        OR: [
          { name: { in: expandedCategoryNames } },
          { id: { in: expandedCategoryNames } },
        ],
      },
    } : {};

    // ホワイトリストがある場合は名前でフィルタリングを追加
    if (nameWhitelist) {
      whereClause.name = { in: nameWhitelist };
    }

    const tags = await prisma.tag.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        displayName: true,
        tagCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags by type:', error);
    return NextResponse.json({ message: 'Failed to fetch tags' }, { status: 500 });
  }
}
