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
}

const ProductGrid = ({ 
  products, 
  showLikeButton = false, 
  showOwnButton = false,
  isLoading = false,
  skeletonCount = 8,
  maxTags
}: ProductGridProps) => {
  if (isLoading) {
    return <ProductGridSkeleton count={skeletonCount} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" data-testid="product-grid">
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