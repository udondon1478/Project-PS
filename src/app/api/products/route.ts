import { NextResponse } from 'next/server';
import { searchProducts, SearchParams } from '@/lib/searchProducts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params: SearchParams = Object.fromEntries(searchParams.entries());

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
