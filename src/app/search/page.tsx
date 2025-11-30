import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import type { Metadata } from 'next';
import { searchProducts } from '@/lib/searchProducts';
import type { SearchParams } from '@/lib/searchProducts';
import { normalizeTagsToString } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, SearchX } from "lucide-react";

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
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-6">
        <div className="bg-muted/30 p-4 rounded-full">
          <SearchX className="w-12 h-12 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">条件に一致する商品は見つかりませんでした</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            検索条件を変更して再度お試しください。
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 max-w-lg w-full text-left space-y-4 shadow-sm">
          <h3 className="font-medium flex items-center gap-2">
            <span className="text-primary">💡</span> 検索のヒント
          </h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
            <li>タグの数を減らしてみる</li>
            <li>マイナス検索（除外キーワード）を解除してみる</li>
            <li>キーワードの表記を変えてみる（例: &quot;アバター&quot; → &quot;Avatar&quot;）</li>
          </ul>
        </div>

        <div className="pt-4 space-y-3">
          <p className="text-sm font-medium">探している商品が見つかりませんか？</p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/register-item">
              <PlusCircle className="w-4 h-4" />
              商品登録ページから新しく追加する
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            「ないなら登録しよう」の精神で、コミュニティに貢献しましょう！
          </p>
        </div>
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