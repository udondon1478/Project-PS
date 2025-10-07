import { NextResponse } from 'next/server';
import { searchProducts, type SearchParams } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const params: SearchParams = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      tags: normalizeQueryParam(searchParams.getAll('tags')),
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined,
    };

    // Remove undefined properties
    Object.keys(params).forEach(key => {
      const typedKey = key as keyof SearchParams;
      if (params[typedKey] === undefined) {
        delete params[typedKey];
      }
    });

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}