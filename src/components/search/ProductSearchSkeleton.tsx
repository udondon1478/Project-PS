import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProductSearchコンポーネントのスケルトンローディング状態
 * Suspenseフォールバックとして使用
 */
export function ProductSearchSkeleton() {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center gap-2 md:gap-4">
        {/* 検索入力エリア */}
        <div className="flex-1">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* クイックフィルター (デスクトップのみ) */}
        <div className="hidden md:flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        {/* フィルターボタン */}
        <Skeleton className="h-9 w-9 rounded-md" />

        {/* ソートセレクター (デスクトップのみ) */}
        <Skeleton className="hidden md:block h-9 w-28 rounded-md" />

        {/* 検索ボタン (デスクトップのみ) */}
        <Skeleton className="hidden md:block h-9 w-16 rounded-md" />
      </div>
    </div>
  );
}
