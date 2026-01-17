"use client";

import React, { useState, useMemo } from 'react';
import { Product } from '@/types/product';
import ProductGrid from '@/components/ProductGrid';
import { ReelsContainer, ReelsToggle } from './Reels';

interface SearchResultsProps {
  products: Product[];
  totalProducts: number;
  searchParamsString: string;
  showLikeButton?: boolean;
  showOwnButton?: boolean;
  maxTags?: number;
}

export function SearchResults({
  products,
  totalProducts,
  searchParamsString,
  showLikeButton = true,
  showOwnButton = true,
  maxTags,
}: SearchResultsProps) {
  const [isReelsMode, setIsReelsMode] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);

  const initialTags = useMemo(() => {
    const tagsParam = searchParams.get('tags');
    if (!tagsParam) return [];
    return tagsParam.split(',').filter(tag => tag.trim() !== '');
  }, [searchParams]);

  if (isReelsMode) {
    return (
      <ReelsContainer
        initialProducts={products}
        searchParams={searchParams}
        totalProducts={totalProducts}
        onClose={() => setIsReelsMode(false)}
        initialTags={initialTags}
      />
    );
  }

  return (
    <>
      <ProductGrid
        products={products}
        showLikeButton={showLikeButton}
        showOwnButton={showOwnButton}
        maxTags={maxTags}
      />

      {products.length > 0 && (
        <ReelsToggle onClick={() => setIsReelsMode(true)} />
      )}
    </>
  );
}
