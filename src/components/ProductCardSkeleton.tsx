
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProductCardのスケルトンローディング状態を表示するコンポーネント
 * ProductCardと同じレイアウト構造を再現
 */
const ProductCardSkeleton = () => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg" data-testid="product-card-skeleton">
      {/* 画像プレースホルダー: h-[356px]はProductCardのh-89(約356px)と同じ高さ */}
      <Skeleton className="w-full h-[356px]" />
      
      <div className="p-4">
        {/* タイトルプレースホルダー: 2行分の高さ */}
        <div className="flex items-start justify-between w-full h-10 mb-2">
          <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* セラー情報プレースホルダー: 円形アイコン + テキスト */}
        <div className="flex items-center mt-1 mb-2">
          <Skeleton className="w-7 h-7 rounded-full mr-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* タグプレースホルダー: バッジサイズの矩形 */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* 価格プレースホルダー */}
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
