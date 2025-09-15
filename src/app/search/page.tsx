import React from "react";
import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import { Metadata } from 'next';

interface SearchPageProps {
  searchParams?: Promise<{
    tags?: string;
    ageRatingTags?: string;
    categoryTagId?: string;
    featureTagIds?: string;
    negativeTags?: string;
    minPrice?: string;
    maxPrice?: string;
    liked?: string;
    owned?: string;
    isHighPrice?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams?.tags || "";
  const negativeSearchTerm = resolvedSearchParams?.negativeTags || "";
  let title = "検索結果";

  if (searchTerm && negativeSearchTerm) {
    title = `検索: ${searchTerm} -${negativeSearchTerm}`;
  } else if (searchTerm) {
    title = `検索: ${searchTerm}`;
  } else if (negativeSearchTerm) {
    title = `検索: -${negativeSearchTerm}`;
  }

  return {
    title: title,
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams(resolvedSearchParams as any).toString();
  
  let products: Product[] = [];
  let error: string | null = null;

  try {
    // APIから商品情報を取得
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products?${query}`, {
      cache: 'no-store', // サーバーサイドでのキャッシュ戦略に応じて変更
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'APIからの商品情報の取得に失敗しました');
    }

    products = await response.json();

  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = '商品情報の取得中に不明なエラーが発生しました';
    }
  }

  const searchTerm = resolvedSearchParams?.tags || "";
  const ageRatingTags = resolvedSearchParams?.ageRatingTags?.split(',') || [];
  const categoryTagId = resolvedSearchParams?.categoryTagId || "";
  const featureTagIds = resolvedSearchParams?.featureTagIds?.split(',') || [];

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

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;