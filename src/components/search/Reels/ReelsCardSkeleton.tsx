"use client";

import React from 'react';
import Image from 'next/image';
import { Product } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';

interface ReelsCardSkeletonProps {
  product: Product;
}

export function ReelsCardSkeleton({ product }: ReelsCardSkeletonProps) {
  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="relative flex-1 overflow-hidden">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.title}
            fill
            className="object-contain"
            priority
          />
        ) : (
          <Skeleton className="h-full w-full" />
        )}

        <div className="absolute bottom-24 right-4 flex flex-col gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>

      <div className="p-4 pb-6">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-2 h-5 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
