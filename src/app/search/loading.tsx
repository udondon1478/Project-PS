import ProductGridLoadingLayout from '@/components/ProductGridLoadingLayout';

/**
 * 検索ページのローディング状態を表示するコンポーネント
 * Next.jsのloading.tsx規約を使用してSuspense境界を自動的に設定
 */
export default function SearchLoading() {
  return <ProductGridLoadingLayout showTitle={true} />;
}
