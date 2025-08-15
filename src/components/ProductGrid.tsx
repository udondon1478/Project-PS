import React from 'react';
import ProductCard from './ProductCard';
import { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  showLikeButton?: boolean;
  showOwnButton?: boolean;
}

const ProductGrid = ({ products, showLikeButton = false, showOwnButton = false }: ProductGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showLikeButton={showLikeButton}
          showOwnButton={showOwnButton}
        />
      ))}
    </div>
  );
};

export default ProductGrid;