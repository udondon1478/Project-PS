import ProductCardSkeleton from '@/components/ProductCardSkeleton';

/**
 * 検索ページのローディング状態を表示するコンポーネント
 * Next.jsのloading.tsx規約を使用してSuspense境界を自動的に設定
 */
export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 検索情報のプレースホルダー */}
      <div className="mb-4 space-y-2">
        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
      </div>

      {/* ProductGridと同じレスポンシブグリッドレイアウト */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
        data-testid="product-grid-skeleton"
      >
        {[...Array(8)].map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
