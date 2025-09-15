import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import { Metadata } from 'next';
import { searchProducts } from '@/lib/searchProducts';

interface SearchPageProps {
  searchParams: {
    tags?: string | string[];
    ageRatingTags?: string | string[];
    categoryTagId?: string;
    featureTagIds?: string | string[];
    negativeTags?: string | string[];
    minPrice?: string;
    maxPrice?: string;
    liked?: string;
    owned?: string;
    isHighPrice?: string;
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const searchTerm = Array.isArray(searchParams.tags) ? searchParams.tags.join(', ') : searchParams.tags || "";
  const negativeSearchTerm = Array.isArray(searchParams.negativeTags) ? searchParams.negativeTags.join(', ') : searchParams.negativeTags || "";
  let title = "検索結果";

  if (searchTerm && negativeSearchTerm) {
    title = `検索: ${searchTerm} -${negativeSearchTerm}`;
  } else if (searchTerm) {
    title = `検索: ${searchTerm}`;
  } else if (negativeSearchTerm) {
    title = `検索: -${negativeSearchTerm}`;
  }

  return {
    title: title,
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = await searchProducts(searchParams);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = '不明なエラーが発生しました';
    }
  }

  const searchTerm = Array.isArray(searchParams.tags) ? searchParams.tags.join(', ') : searchParams.tags || "";
  const categoryTagId = searchParams.categoryTagId || "";

  const normalizeQueryParam = (param: string | string[] | undefined): string[] => {
    if (!param) return [];
    const arr = Array.isArray(param) ? param : param.split(',');
    return arr.map(s => s.trim()).filter(Boolean);
  };

  const ageRatingTags = normalizeQueryParam(searchParams.ageRatingTags);
  const featureTagIds = normalizeQueryParam(searchParams.featureTagIds);


  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40">Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>検索キーワード: {searchTerm}</p>
        {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
        {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
        {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>検索キーワード: {searchTerm}</p>
      {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
      {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
      {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;
