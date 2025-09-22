import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const allowedKeys = [
      'tags', 'ageRatingTags', 'categoryTagId', 'featureTagIds',
      'negativeTags', 'minPrice', 'maxPrice', 'liked', 'owned', 'isHighPrice'
    ] as const satisfies readonly (keyof SearchParams)[];

    const params: SearchParams = {};
    const singleValueKeys = new Set<keyof SearchParams>([
      "minPrice", "maxPrice", "liked", "owned", "isHighPrice", "categoryTagId"
    ]);

    for (const key of allowedKeys) {
      const values = searchParams.getAll(key)
        .map(v => v.trim())
        .filter(v => v !== '');

      const uniqueValues = [...new Set(values)];

      if (uniqueValues.length === 0) {
        continue;
      }

      if (singleValueKeys.has(key)) {
        params[key] = uniqueValues[0];
      } else {
        if (uniqueValues.length === 1) {
          params[key] = uniqueValues[0];
        } else {
          params[key] = uniqueValues;
        }
      }
    }

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
