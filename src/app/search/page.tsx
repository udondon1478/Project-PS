import React from "react";
import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import { Metadata } from 'next';
import { headers } from 'next/headers';

interface SearchPageProps {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const searchTerm = (searchParams?.tags as string) || "";
  const negativeSearchTerm = (searchParams?.negativeTags as string) || "";
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
  let products: Product[] = [];
  let error: string | null = null;

  try {
    // Convert searchParams to a query string for the API call
    const query = new URLSearchParams(searchParams as Record<string, string>).toString();
    // Use an absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/products?${query}`;

    // Forward cookies to the API route to maintain the user's session
    const cookie = headers().get('Cookie');
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: cookie ? { 'Cookie': cookie } : {},
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("API Error:", errorBody);
      throw new Error(`API call failed with status: ${response.status} - ${errorBody}`);
    }

    products = await response.json();

  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = 'An unknown error occurred while fetching products.';
    }
  }

  const searchTerm = (searchParams?.tags as string) || "";
  const ageRatingTags = ((searchParams?.ageRatingTags as string) || "").split(',').filter(t => t);
  const categoryTagId = (searchParams?.categoryTagId as string) || "";
  const featureTagIds = ((searchParams?.featureTagIds as string) || "").split(',').filter(t => t);

  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40">Error: {error}</div>;
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
