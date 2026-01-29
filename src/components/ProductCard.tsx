"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import PriceDisplay from './PriceDisplay';
import { Product } from "@/types/product";
import { Heart, Archive } from 'lucide-react';
import { CategoryTag } from '@/components/ui/category-tag';

interface ProductCardProps {
  product: Product;
  showLikeButton?: boolean;
  showOwnButton?: boolean;
  maxTags?: number;
}

const ProductCard = ({ product, showLikeButton = false, showOwnButton = false, maxTags }: ProductCardProps) => {
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
      const response = await fetch(`/api/products/${product.id}/like`, { 
        method,
      });

      if (response.status === 401 || response.redirected) {
        setIsLiked(originalIsLiked);
        if (response.status === 401) {
          alert('この操作を行うにはログインが必要です。');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const response = await fetch(`/api/products/${product.id}/own`, { 
        method,
      });

      if (response.status === 401 || response.redirected) {
        setIsOwned(originalIsOwned);
        if (response.status === 401) {
          alert('この操作を行うにはログインが必要です。');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setIsOwned(originalIsOwned);
      console.error('An error occurred:', error);
    } finally {
      setIsProcessingOwn(false);
    }
  };

  const isValidMaxTags = typeof maxTags === 'number' && Number.isFinite(maxTags) && maxTags >= 0;
  const displayedTags = isValidMaxTags ? product.tags.slice(0, maxTags) : product.tags;

  return (
    <div className="border rounded-lg overflow-hidden shadow-lg" data-testid="product-card">
      <a href={`/products/${product.id}`} className="block relative w-full aspect-square bg-gray-100">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.title}
            layout="fill"
            objectFit="contain"
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
                  className={`h-5 w-5 ${isOwned ? 'text-blue-600 fill-blue-200' : 'text-gray-400'}`}
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
        {product.seller && (
          <a
            href={product.seller.sellerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center mt-1 mb-2 text-base text-gray-600 hover:underline"
          >
            {product.seller.iconUrl ? (
              <Image
                src={product.seller.iconUrl}
                alt={product.seller.name}
                width={28}
                height={28}
                className="rounded-full mr-2"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 mr-2" />
            )}
            <span className="truncate">{product.seller.name}</span>
          </a>
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {displayedTags.map((tag, index) => (
            <CategoryTag
              key={index}
              name={tag.name}
              categoryColor={tag.categoryColor}
              size="sm"
            />
          ))}
        </div>
        <PriceDisplay product={product} />
      </div>
    </div>
  );
};

export default ProductCard;