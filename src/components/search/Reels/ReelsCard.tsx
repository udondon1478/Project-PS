"use client";

import React, { useState } from 'react';
import { Product, ProductDetail } from '@/types/product';
import { ReelsImageCarousel } from './ReelsImageCarousel';
import { ReelsProductInfo } from './ReelsProductInfo';
import { ReelsActionButtons } from './ReelsActionButtons';
import { ReelsTagSheet } from './ReelsTagSheet';

interface ReelsCardProps {
  product: Product;
  detail: ProductDetail;
  currentTags: string[];
  onAddTag: (tagName: string) => void;
}

export function ReelsCard({ product, detail, currentTags, onAddTag }: ReelsCardProps) {
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);

  const images = detail.images.length > 0
    ? detail.images.map(img => img.imageUrl)
    : product.mainImageUrl
      ? [product.mainImageUrl]
      : [];

  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="relative flex-1 overflow-hidden">
        <ReelsImageCarousel images={images} title={product.title} />
        <ReelsActionButtons
          productId={product.id}
          boothUrl={detail.boothJpUrl}
          isLiked={detail.isLiked}
          onTagsClick={() => setIsTagSheetOpen(true)}
        />
      </div>

      <ReelsProductInfo
        product={product}
        detail={detail}
      />

      <ReelsTagSheet
        isOpen={isTagSheetOpen}
        onClose={() => setIsTagSheetOpen(false)}
        detail={detail}
        currentTags={currentTags}
        onAddTag={onAddTag}
      />
    </div>
  );
}
