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

  let title = "Search Results";
  if (q) {
    title = `Search for: ${q}`;
  } else if (tags) {
    title = `Tagged with: ${tags}`;
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

  const q = resolvedSearchParams.q || "";
  const category = resolvedSearchParams.category || "";
  const tags = normalizeTagsToString(resolvedSearchParams.tags);

  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40">Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        {q && <p>Search query: {q}</p>}
        {category && <p>Category: {category}</p>}
        {tags && <p>Tags: {tags}</p>}
        <div>No products found matching your criteria.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      {q && <p>Search query: {q}</p>}
      {category && <p>Category: {category}</p>}
      {tags && <p>Tags: {tags}</p>}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;