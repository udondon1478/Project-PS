import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * いいねページのローディング状態を表示するコンポーネント
 * Next.jsのloading.tsx規約を使用してSuspense境界を自動的に設定
 */
export default function LikesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* ページタイトルのプレースホルダー */}
      <Skeleton className="h-8 w-48 mb-6" />

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
