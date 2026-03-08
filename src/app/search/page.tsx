import { Product } from "@/types/product";
import type { Metadata } from 'next';
import { searchProducts, AuthRequiredError } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeTagsToString } from '@/lib/utils';
import { Pagination } from "@/components/ui/pagination";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";

/** 1ページあたりの商品件数 */
const PAGE_SIZE = 24;

/** 検索結果でのタグ表示上限 */
const MAX_TAGS_IN_SEARCH = 7;

type SearchPageProps = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<SearchParams & { page?: string }>;
};

/**
 * ページ番号を抽出・バリデーション
 */
function parsePageParam(pageParam: string | string[] | undefined): number {
  if (!pageParam) return 1;
  const pageStr = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const parsed = parseInt(pageStr, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

/**
 * 現在のページパラメータを除いたbaseURLを構築
 */
function buildBaseUrl(searchParams: SearchParams & { page?: string }): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page') continue; // pageパラメータは除外
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // URLを短く保つため、配列はカンマ区切り文字列としてシリアライズする
      // normalizeQueryParamで自動的に配列に戻されるため安全
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

/**
 * 検索パラメータを文字列に変換（Reelsモード用）
 */
function buildSearchParamsString(searchParams: SearchParams & { page?: string }): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page') continue;
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // URLを短く保つため、配列はカンマ区切り文字列としてシリアライズする
      // SearchResultsでget('tags').split(',')として解析されるため一貫性を保つ
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q;
  const tags = normalizeTagsToString(resolvedSearchParams.tags);
  const negativeTags = normalizeTagsToString(resolvedSearchParams.negativeTags);
  const page = parsePageParam(resolvedSearchParams.page);

  let title = "検索結果";
  if (q) {
    title = `検索キーワード: ${q}`;
  } else if (tags) {
    title = `タグ: ${tags}`;
    if (negativeTags) {
      title += ` -${negativeTags}`;
    }
  }

  // ページ番号が2以上の場合はタイトルに追加
  if (page > 1) {
    title += ` - ページ ${page}`;
  }

  return {
    title: title,
    description: page > 1 
      ? `${title}の検索結果（${page}ページ目）`
      : undefined,
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const page = parsePageParam(resolvedSearchParams.page);
  const searchPolySeekTagsOnly = String(resolvedSearchParams.searchPolySeekTagsOnly) === 'true';
  let products: Product[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const result = await searchProducts({
      ...resolvedSearchParams,
      searchPolySeekTagsOnly,
      page,
      pageSize: PAGE_SIZE,
    });
    products = result.products;
    total = result.total;
  } catch (err: unknown) {
    console.error("Search page failed to fetch products:", err);
    if (err instanceof AuthRequiredError) {
      error = err.message;
    } else if (err instanceof Error && (
      err.message.startsWith('セーフサーチが有効なため') ||
      err.message.startsWith('検索条件エラー')
    )) {
      error = err.message;
    } else {
      error = "エラーが発生しました。しばらくしてから再度お試しください。";
    }
  }

  const q = resolvedSearchParams.q || "";
  const category = resolvedSearchParams.category || "";
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const baseUrl = buildBaseUrl(resolvedSearchParams);

  if (error) {
    return <div className="container mx-auto px-4 py-8">Error: {error}</div>;
  }

  if (products.length === 0) {
    return <SearchEmptyState />;
  }

  // 検索パラメータを文字列に変換（Reelsモード用）
  const searchParamsString = buildSearchParamsString(resolvedSearchParams);

  return (
    <div className="container mx-auto px-4 py-8">
      {q && <p>Search query: {q}</p>}
      {category && <p>Category: {category}</p>}

      <SearchResults
        products={products}
        totalProducts={total}
        searchParamsString={searchParamsString}
        showLikeButton={true}
        showOwnButton={true}
        maxTags={MAX_TAGS_IN_SEARCH}
      />

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={baseUrl}
          />
        </div>
      )}
    </div>
  );
};

export default SearchPage;