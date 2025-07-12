import React from "react";
import ProductGrid from "@/components/ProductGrid"; // ProductGridコンポーネントをインポート
import { Product } from "@/types/product"; // Product型をインポート

interface SearchPageProps {
  searchParams?: Promise<{
    tags?: string;
    ageRatingTags?: string;
    categoryTagId?: string;
    featureTagIds?: string;
    negativeTags?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams?.tags || "";
  const ageRatingTags = resolvedSearchParams?.ageRatingTags?.split(',') || [];
  const categoryTagId = resolvedSearchParams?.categoryTagId || "";
  const featureTagIds = resolvedSearchParams?.featureTagIds?.split(',') || [];
  const negativeTags = resolvedSearchParams?.negativeTags?.split(',') || [];
  const minPrice = resolvedSearchParams?.minPrice;
  const maxPrice = resolvedSearchParams?.maxPrice;

  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.append("tags", searchTerm);
  if (ageRatingTags.length > 0) queryParams.append("ageRatingTags", ageRatingTags.join(','));
  if (categoryTagId) queryParams.append("categoryTagId", categoryTagId);
  if (featureTagIds.length > 0) queryParams.append("featureTagIds", featureTagIds.join(','));
  if (negativeTags.length > 0) queryParams.append("negativeTags", negativeTags.join(','));
  if (minPrice) queryParams.append("minPrice", minPrice);
  if (maxPrice) queryParams.append("maxPrice", maxPrice);

  let products: Product[] = [];
  let error: string | null = null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products?${queryParams.toString()}`, {
      cache: 'no-store', // 常に最新のデータを取得
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    products = await response.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = 'An unknown error occurred';
    }
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>検索キーワード: {searchTerm}</p>
        {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
        {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
        {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>検索キーワード: {searchTerm}</p>
      {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
      {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
      {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={false} />
    </div>
  );
};

export default SearchPage;