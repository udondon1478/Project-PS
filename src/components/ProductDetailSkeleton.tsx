import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProductDetailPageのスケルトンローディング状態を表示するコンポーネント
 * レスポンシブグリッドレイアウト: モバイル=単一カラム、大画面=8/12メイン + 4/12サイドバー
 */
const ProductDetailSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* メインエリア */}
        <main className="lg:col-span-8">
          {/* タイトルとセラー情報 */}
          <div className="mb-6">
            <Skeleton className="h-10 w-3/4 mb-3" />
            <div className="flex items-center space-x-2">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          {/* 画像カルーセル */}
          <section className="mb-8">
            {/* メイン画像 */}
            <Skeleton className="w-full aspect-video rounded-lg" />
            
            {/* サムネイル */}
            <div className="flex gap-2 mt-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="aspect-square rounded-md w-1/6" />
              ))}
            </div>
          </section>

          {/* Description */}
          <section className="mb-8">
            <Skeleton className="h-8 w-40 mb-4" />
            <div className="space-y-3 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-800">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </section>
        </main>

        {/* サイドバー */}
        <aside className="lg:col-span-4">
          <div className="sticky top-32 space-y-6">
            {/* アクションボタン */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>

            {/* タグセクション */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
              <div className="space-y-2">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-7 rounded" />
                      <Skeleton className="h-7 w-7 rounded" />
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-md mt-4" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;
