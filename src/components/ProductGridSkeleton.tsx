import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';
import { GRID_COLS_CLASSES } from '@/constants/grid';

interface ProductGridSkeletonProps {
  count?: number;
  columns?: number;
}

const ProductGridSkeleton = ({ count = 8, columns = 4 }: ProductGridSkeletonProps) => {
  const lgGridClass = (columns && GRID_COLS_CLASSES[columns]) || "lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${lgGridClass} gap-6`} data-testid="product-grid-skeleton">
      {[...Array(count)].map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
