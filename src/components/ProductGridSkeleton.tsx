import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  count?: number;
  columns?: number;
}

const gridColsClasses: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const ProductGridSkeleton = ({ count = 8, columns = 4 }: ProductGridSkeletonProps) => {
  const lgGridClass = (columns && gridColsClasses[columns]) || "lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${lgGridClass} gap-6`} data-testid="product-grid-skeleton">
      {[...Array(count)].map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
