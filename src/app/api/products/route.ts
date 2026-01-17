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

    const negativeTags = normalizeQueryParam(searchParams.getAll('negativeTags'));
    if (negativeTags) params.negativeTags = negativeTags;

    const sort = searchParams.get('sort');
    if (sort) params.sort = sort;

    const order = searchParams.get('order');
    if (order) params.order = order;

    const ageRatingTags = normalizeQueryParam(searchParams.getAll('ageRatingTags'));
    if (ageRatingTags) params.ageRatingTags = ageRatingTags;

    const minPrice = searchParams.get('minPrice');
    if (minPrice) params.minPrice = minPrice;

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) params.maxPrice = maxPrice;

    const page = searchParams.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      if (!isNaN(parsed) && parsed > 0) params.page = parsed;
    }

    const pageSize = searchParams.get('pageSize');
    if (pageSize) {
      const parsed = parseInt(pageSize, 10);
      if (!isNaN(parsed) && parsed > 0) params.pageSize = parsed;
    }

    const products = await searchProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}