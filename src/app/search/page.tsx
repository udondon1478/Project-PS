import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import type { Metadata } from 'next';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeTagsToString } from '@/lib/utils';

type SearchPageProps = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q;
  const tags = normalizeTagsToString(resolvedSearchParams.tags);
  const negativeTags = normalizeTagsToString(resolvedSearchParams.negativeTags);

  let title = "検索結果";
  if (q) {
    title = `検索キーワード: ${q}`;
  } else if (tags) {
    title = `タグ: ${tags} -${negativeTags}`;
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
    if (err instanceof Error && (
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
  /*const tags = normalizeTagsToString(resolvedSearchParams.tags);*/

  if (error) {
    return <div className="container mx-auto px-4 py-8">Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        {q && <p>Search query: {q}</p>}
        {category && <p>Category: {category}</p>}
        {/*{tags && <p>Tags: {tags}</p>}*/}
        <div>条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="product-grid">
      {q && <p>Search query: {q}</p>}
      {category && <p>Category: {category}</p>}
      {/*tags && <p>Tags: {tags}</p>*/}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;