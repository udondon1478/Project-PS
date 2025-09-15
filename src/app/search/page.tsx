import React from "react";
import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import { Metadata } from 'next';

interface SearchPageProps {
  searchParams: {
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
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const searchTerm = searchParams?.tags || "";
  const negativeSearchTerm = searchParams?.negativeTags || "";
  let title = "Search Results";

  if (searchTerm && negativeSearchTerm) {
    title = `Search: ${searchTerm} -${negativeSearchTerm}`;
  } else if (searchTerm) {
    title = `Search: ${searchTerm}`;
  } else if (negativeSearchTerm) {
    title = `Search: -${negativeSearchTerm}`;
  }

  return {
    title: title,
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    // URLSearchParams needs an object of type Record<string, string>, but searchParams can have undefined values.
    // So we filter out the undefined values before creating the URLSearchParams object.
    const definedSearchParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') {
        definedSearchParams[key] = value;
      }
    }
    const query = new URLSearchParams(definedSearchParams).toString();

    const response = await fetch(`${baseUrl}/api/products?${query}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch products with status: ${response.status}`);
      } catch (e) {
         throw new Error(`Failed to fetch products with status: ${response.status}`);
      }
    }

    products = await response.json();

  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = 'An unknown error occurred';
    }
  }

  const {
    tags: searchTerm = "",
    ageRatingTags: ageRatingTagsParam,
    categoryTagId = "",
    featureTagIds: featureTagIdsParam,
  } = searchParams;

  const ageRatingTags = ageRatingTagsParam?.split(',') || [];
  const featureTagIds = featureTagIdsParam?.split(',') || [];


  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40">Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>Search term: {searchTerm}</p>
        {ageRatingTags.length > 0 && <p>Age rating tags: {ageRatingTags.join(',')}</p>}
        {categoryTagId && <p>Category tag ID: {categoryTagId}</p>}
        {featureTagIds.length > 0 && <p>Feature tag IDs: {featureTagIds.join(',')}</p>}
        <div>No products found matching your criteria.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>Search term: {searchTerm}</p>
      {ageRatingTags.length > 0 && <p>Age rating tags: {ageRatingTags.join(',')}</p>}
      {categoryTagId && <p>Category tag ID: {categoryTagId}</p>}
      {featureTagIds.length > 0 && <p>Feature tag IDs: {featureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;
