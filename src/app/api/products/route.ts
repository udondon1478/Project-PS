import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const singleValueKeys = [
      "minPrice", "maxPrice", "liked", "owned", "isHighPrice", "categoryTagId"
    ] as const satisfies readonly (Extract<keyof SearchParams, string>)[];

    const multiValueKeys = [
      "tags", "ageRatingTags", "featureTagIds", "negativeTags"
    ] as const satisfies readonly (Extract<keyof SearchParams, string>)[];

    const params: SearchParams = {};

    for (const key of singleValueKeys) {
      const values = normalizeQueryParam(searchParams.get(key) ?? undefined);
      if (values.length > 0) {
        params[key] = values[0];
      }
    }

    for (const key of multiValueKeys) {
      const values = normalizeQueryParam(searchParams.getAll(key));
      if (values.length > 1) {
        params[key] = values;
      } else if (values.length === 1) {
        params[key] = values[0];
      }
    }

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
