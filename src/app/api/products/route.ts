import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';

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
    const singleValueKeys = [
      "minPrice", "maxPrice", "liked", "owned", "isHighPrice", "categoryTagId"
    ] as const;
    const multiValueKeys = ['tags', 'ageRatingTags', 'featureTagIds', 'negativeTags'] as const;

    const params: Partial<SearchParams> = {};

    for (const key of singleValueKeys) {
      const value = searchParams.get(key);
      if (value) {
        params[key] = value;
      }
    }

    for (const key of multiValueKeys) {
      const values = searchParams.getAll(key);
      if (values.length === 1) {
        params[key] = values[0];
      } else if (values.length > 1) {
        params[key] = values;
      }
    }

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
