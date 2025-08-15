"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import PriceDisplay from './PriceDisplay';
import { Product } from "@/types/product";
import { Heart } from 'lucide-react'; // lucide-reactからHeartアイコンをインポート

interface ProductCardProps {
  product: Product;
  showLikeButton?: boolean;
}

const ProductCard = ({ product, showLikeButton = false }: ProductCardProps) => {
  const [isLiked, setIsLiked] = useState(product.isLiked || false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsLiked(product.isLiked || false);
  }, [product.isLiked]);

  const handleLikeClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // aタグの遷移を防ぐ
    if (isProcessing) return;

    setIsProcessing(true);
    const originalIsLiked = isLiked;
    setIsLiked(!originalIsLiked); // Optimistic update

    try {
      const method = !originalIsLiked ? 'POST' : 'DELETE';
      const response = await fetch(`/api/products/${product.id}/like`, {
        method: method,
      });

      if (!response.ok) {
        // If the API call fails, revert the state
        setIsLiked(originalIsLiked);
        console.error('Failed to update like status');
      }
    } catch (error) {
      setIsLiked(originalIsLiked);
      console.error('An error occurred:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-lg">
      <a href={`/products/${product.id}`} className="block relative w-full h-89">
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
      </a>
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
            <button
              onClick={handleLikeClick}
              disabled={isProcessing}
              className="bg-white rounded-full p-1 shadow flex-shrink-0 disabled:opacity-50"
              aria-label={isLiked ? "Unlike this product" : "Like this product"}
            >
              <Heart
                className={`h-5 w-5 ${isLiked ? 'text-red-500' : 'text-gray-400'}`}
                fill={isLiked ? 'currentColor' : 'none'}
              />
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