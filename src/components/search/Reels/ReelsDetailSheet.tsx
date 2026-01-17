"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CategoryTag } from '@/components/ui/category-tag';
import { Product, ProductDetail } from '@/types/product';
import PriceDisplay from '@/components/PriceDisplay';

interface ReelsDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  detail: ProductDetail;
}

export function ReelsDetailSheet({
  isOpen,
  onClose,
  product,
  detail,
}: ReelsDetailSheetProps) {
  const tags = detail.productTags.map(pt => ({
    name: pt.tag.displayName || pt.tag.name,
    categoryColor: pt.tag.tagCategory?.color || null,
  }));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="line-clamp-2 pr-8">{product.title}</SheetTitle>
          <SheetDescription className="sr-only">商品の詳細情報</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {detail.seller && (
            <a
              href={detail.seller.sellerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
            >
              {detail.seller.iconUrl ? (
                <Image
                  src={detail.seller.iconUrl}
                  alt={detail.seller.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted" />
              )}
              <span className="truncate">{detail.seller.name}</span>
            </a>
          )}

          <div>
            <PriceDisplay product={product} />
          </div>

          {detail.description && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">商品説明</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {detail.description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">タグ</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <CategoryTag
                  key={index}
                  name={tag.name}
                  categoryColor={tag.categoryColor}
                  size="sm"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="w-full">
              <Link href={`/products/${product.id}`}>
                詳細ページを見る
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <a
                href={detail.boothJpUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                BOOTHで見る
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
