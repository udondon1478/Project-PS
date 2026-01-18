"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Product, ProductDetail } from '@/types/product';
import { CategoryTag } from '@/components/ui/category-tag';
import { ReelsDetailSheet } from './ReelsDetailSheet';

interface ReelsProductInfoProps {
  product: Product;
  detail: ProductDetail;
}

export function ReelsProductInfo({ product, detail }: ReelsProductInfoProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const hasMultipleVariations = product.highPrice > product.lowPrice;
  const displayedTags = product.tags.slice(0, 3);
  const hasMoreTags = product.tags.length > 3;

  const priceDisplay = hasMultipleVariations
    ? `¥${product.lowPrice.toLocaleString()} ~ ¥${product.highPrice.toLocaleString()}`
    : `¥${product.lowPrice.toLocaleString()}`;

  return (
    <>
      <button
        type="button"
        className="w-full p-4 pb-6 text-left"
        onClick={() => setIsSheetOpen(true)}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <h2 className="mb-1 line-clamp-2 text-base font-semibold">
          {product.title}
        </h2>

        <p className="mb-2 text-lg font-bold text-primary">
          {priceDisplay}
        </p>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {displayedTags.map((tag, index) => (
              <CategoryTag
                key={index}
                name={tag.name}
                categoryColor={tag.categoryColor}
                size="sm"
              />
            ))}
          </div>
          {hasMoreTags && (
            <span className="flex items-center text-xs text-muted-foreground">
              <ChevronDown className="h-4 w-4" />
            </span>
          )}
        </div>
      </button>

      <ReelsDetailSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        product={product}
        detail={detail}
      />
    </>
  );
}
