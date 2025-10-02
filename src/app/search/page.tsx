import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import type { Metadata } from 'next';
import { searchProducts } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const searchTerm = Array.isArray(resolvedSearchParams.tags) ? resolvedSearchParams.tags.join(', ') : resolvedSearchParams.tags || "";
  const negativeSearchTerm = Array.isArray(resolvedSearchParams.negativeTags) ? resolvedSearchParams.negativeTags.join(', ') : resolvedSearchParams.negativeTags || "";
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

  const resolvedSearchParams = await searchParams;

  try {
    products = await searchProducts(resolvedSearchParams);
  } catch (err: unknown) {
    console.error("Search page failed to fetch products:", err);
    error = "エラーが発生しました。しばらくしてから再度お試しください。";
  }

  const searchTerm = Array.isArray(resolvedSearchParams.tags) ? resolvedSearchParams.tags.join(', ') : resolvedSearchParams.tags || "";
  const categoryTagId = resolvedSearchParams.categoryTagId || "";

  const ageRatingTags = normalizeQueryParam(resolvedSearchParams.ageRatingTags);
  const featureTagIds = normalizeQueryParam(resolvedSearchParams.featureTagIds);


  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40">Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        {searchTerm && <p>検索キーワード: {searchTerm}</p>}
        {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(', ')}</p>}
        {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
        {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(', ')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      {searchTerm && <p>検索キーワード: {searchTerm}</p>}
      {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(', ')}</p>}
      {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
      {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(', ')}</p>}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;
