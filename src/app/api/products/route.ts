import { NextResponse } from 'next/server';
import { searchProducts, type SearchParams } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Partial<SearchParams> = {};

    const q = searchParams.get('q');
    if (q) params.q = q;

    const category = searchParams.get('category');
    if (category) params.category = category;

    const tags = normalizeQueryParam(searchParams.getAll('tags'));
    if (tags) params.tags = tags;

    const sort = searchParams.get('sort');
    if (sort) params.sort = sort;

    const order = searchParams.get('order');
    if (order) params.order = order;

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}