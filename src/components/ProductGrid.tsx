import React from 'react';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import { Product } from "@/types/product";
import { GRID_COLS_CLASSES } from '@/constants/grid';

interface ProductGridProps {
  products: Product[];
  showLikeButton?: boolean;
  showOwnButton?: boolean;
  isLoading?: boolean;
  skeletonCount?: number;
  maxTags?: number;
  columns?: number;
}

const ProductGrid = ({
  products,
  showLikeButton = false,
  showOwnButton = false,
  isLoading = false,
  skeletonCount = 8,
  maxTags,
  columns = 4
}: ProductGridProps) => {
  if (isLoading) {
    return <ProductGridSkeleton count={skeletonCount} columns={columns} />;
  }

  const lgGridClass = (columns && GRID_COLS_CLASSES[columns]) || "lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${lgGridClass} gap-6`} data-testid="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showLikeButton={showLikeButton}
          showOwnButton={showOwnButton}
          maxTags={maxTags}
        />
      ))}
    </div>
  );
};

export default ProductGrid;