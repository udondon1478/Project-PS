import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params: SearchParams = {};
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      if (values.length > 1) {
        params[key as keyof SearchParams] = values;
      } else {
        params[key as keyof SearchParams] = values[0];
      }
    }

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
