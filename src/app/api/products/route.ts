import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

/**
 * Handles GET requests for product search.
 *
 * Parses the request URL's query parameters into a SearchParams object (accepting the keys:
 * `tags`, `ageRatingTags`, `categoryTagId`, `featureTagIds`, `negativeTags`, `minPrice`, `maxPrice`,
 * `liked`, `owned`, `isHighPrice`). Single-value keys (`minPrice`, `maxPrice`, `liked`, `owned`,
 * `isHighPrice`, `categoryTagId`) are collapsed to a scalar; other keys become a single string or an
 * array depending on how many values are provided. Delegates the search to `searchProducts`
 * and returns the result as a JSON response.
 *
 * @returns A JSON NextResponse containing the found products on success, or a 500 JSON response
 *          with an error message on failure.
 */
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
      const values = searchParams.getAll(key);
      const normalizedValues = normalizeQueryParam(values);

      if (normalizedValues.length === 0) {
        continue;
      }

      if (singleValueKeys.has(key)) {
        params[key] = normalizedValues[0];
      } else {
        if (normalizedValues.length === 1) {
          params[key] = normalizedValues[0];
        } else {
          params[key] = normalizedValues;
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
