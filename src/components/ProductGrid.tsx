import React from 'react';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './ProductGridSkeleton';
import { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  showLikeButton?: boolean;
  showOwnButton?: boolean;
  isLoading?: boolean;
  skeletonCount?: number;
  maxTags?: number;
  columns?: number;
}

const gridColsClasses: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

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

  const lgGridClass = (columns && gridColsClasses[columns]) || "lg:grid-cols-4";

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