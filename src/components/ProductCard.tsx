import React from 'react';
import Image from 'next/image';
import PriceDisplay from './PriceDisplay'; // PriceDisplayコンポーネントをインポート

import { Product } from "@/types/product"; // Product型をインポート

interface ProductCardProps {
  product: Product;
  showLikeButton?: boolean; // いいねボタン表示の制御用props
}

const ProductCard = ({ product, showLikeButton = false }: ProductCardProps) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg">
      <div className="relative w-full h-89">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.title}
            layout="fill"
            objectFit="cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between w-full h-10 mb-2">
          <a href={`/products/${product.id}`} className="flex-grow overflow-hidden"
             style={{
               display: '-webkit-box',
               WebkitLineClamp: 2,
               WebkitBoxOrient: 'vertical',
             }}>
            <h3 className="font-medium line-clamp-2 hover:underline">
              {product.title}
            </h3>
          </a>
          {showLikeButton && (
            <button className="bg-white rounded-full p-1 shadow flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {product.tags.map((tag, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <PriceDisplay product={product} />
      </div>
    </div>
  );
};

export default ProductCard;