import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductGridLoadingLayoutProps {
  showTitle?: boolean;
  itemCount?: number;
}

/**
 * 商品グリッド一覧のローディング状態を表示する共通コンポーネント
 * 検索結果、いいね一覧、所有済み一覧などで使用
 */
export default function ProductGridLoadingLayout({
  showTitle = false,
  itemCount = 8,
}: ProductGridLoadingLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {showTitle && (
        <Skeleton className="h-8 w-48 mb-6" />
      )}

      <div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
        data-testid="product-grid-skeleton"
      >
        {[...Array(itemCount)].map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
