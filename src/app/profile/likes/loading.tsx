import ProductGridLoadingLayout from '@/components/ProductGridLoadingLayout';

/**
 * いいねページのローディング状態を表示するコンポーネント
 * Next.jsのloading.tsx規約を使用してSuspense境界を自動的に設定
 */
export default function LikesLoading() {
  return <ProductGridLoadingLayout showTitle={true} />;
}
