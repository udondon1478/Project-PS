import React from 'react';
import ProductCard from './ProductCard'; // ProductCardコンポーネントをインポート

import { Product } from "@/types/product"; // Product型をインポート

interface ProductGridProps {
  products: Product[];
  showLikeButton?: boolean; // ProductCardに渡すいいねボタン表示の制御用props
}

const ProductGrid = ({ products, showLikeButton = false }: ProductGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} showLikeButton={showLikeButton} />
      ))}
    </div>
  );
};

export default ProductGrid;