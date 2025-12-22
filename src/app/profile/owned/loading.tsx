import ProductGridLoadingLayout from '@/components/ProductGridLoadingLayout';

/**
 * 所有済みページのローディング状態を表示するコンポーネント
 * Next.jsのloading.tsx規約を使用してSuspense境界を自動的に設定
 */
export default function OwnedLoading() {
  return <ProductGridLoadingLayout showTitle={true} />;
}
