"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import PriceDisplay from './PriceDisplay';
import { Product } from "@/types/product";
import { Heart, Archive } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  showLikeButton?: boolean;
  showOwnButton?: boolean;
}

const ProductCard = ({ product, showLikeButton = false, showOwnButton = false }: ProductCardProps) => {
  const [isLiked, setIsLiked] = useState(product.isLiked || false);
  const [isOwned, setIsOwned] = useState(product.isOwned || false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isProcessingOwn, setIsProcessingOwn] = useState(false);

  useEffect(() => {
    setIsLiked(product.isLiked || false);
  }, [product.isLiked]);

  useEffect(() => {
    setIsOwned(product.isOwned || false);
  }, [product.isOwned]);

  const handleLikeClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isProcessingLike) return;
    setIsProcessingLike(true);
    const originalIsLiked = isLiked;
    setIsLiked(!originalIsLiked);

    try {
      const method = !originalIsLiked ? 'POST' : 'DELETE';
      const response = await fetch(`/api/products/${product.id}/like`, { method });
      if (!response.ok) {
        setIsLiked(originalIsLiked);
        console.error('Failed to update like status');
      }
    } catch (error) {
      setIsLiked(originalIsLiked);
      console.error('An error occurred:', error);
    } finally {
      setIsProcessingLike(false);
    }
  };

  const handleOwnClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isProcessingOwn) return;
    setIsProcessingOwn(true);
    const originalIsOwned = isOwned;
    setIsOwned(!originalIsOwned);

    try {
      const method = !originalIsOwned ? 'POST' : 'DELETE';
      const response = await fetch(`/api/products/${product.id}/own`, { method });
      if (!response.ok) {
        setIsOwned(originalIsOwned);
        console.error('Failed to update own status');
      }
    } catch (error) {
      setIsOwned(originalIsOwned);
      console.error('An error occurred:', error);
    } finally {
      setIsProcessingOwn(false);
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
             style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            <h3 className="font-medium line-clamp-2 hover:underline">
              {product.title}
            </h3>
          </a>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {showOwnButton && (
              <button
                onClick={handleOwnClick}
                disabled={isProcessingOwn}
                className="bg-white rounded-full p-1 shadow disabled:opacity-50"
                aria-label={isOwned ? "Remove from owned" : "Add to owned"}
              >
                <Archive
                  className={`h-5 w-5 ${isOwned ? 'text-blue-500' : 'text-gray-400'}`}
                  fill={isOwned ? 'currentColor' : 'none'}
                />
              </button>
            )}
            {showLikeButton && (
              <button
                onClick={handleLikeClick}
                disabled={isProcessingLike}
                className="bg-white rounded-full p-1 shadow disabled:opacity-50"
                aria-label={isLiked ? "Unlike this product" : "Like this product"}
              >
                <Heart
                  className={`h-5 w-5 ${isLiked ? 'text-red-500' : 'text-gray-400'}`}
                  fill={isLiked ? 'currentColor' : 'none'}
                />
              </button>
            )}
          </div>
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