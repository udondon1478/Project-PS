import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import type { Metadata } from 'next';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeQueryParam } from '@/lib/utils';

type SearchPageProps = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<SearchParams>;
};

/**
 * Build page metadata for search results, primarily setting the page title.
 *
 * The title is derived from `searchParams.tags` and `searchParams.negativeTags`.
 * - If both positive and negative terms exist: "検索: {tags} -{negativeTags}"
 * - If only positive terms exist: "検索: {tags}"
 * - If only negative terms exist: "検索: -{negativeTags}"
 * - Otherwise: "検索結果"
 *
 * `searchParams.tags` and `searchParams.negativeTags` may be a string or string[]; arrays are joined with ", ".
 *
 * @param searchParams - Search query parameters used to compose the title (supports `tags` and `negativeTags` as string | string[]).
 * @returns Metadata object with a `title` field.
 */
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
  const resolvedSearchParams = await searchParams;
  let products: Product[] = [];
  let error: string | null = null;

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