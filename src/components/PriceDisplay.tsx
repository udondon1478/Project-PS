import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Product } from "@/types/product"; // Product型をインポート

const PriceDisplay = ({ product }: { product: Product }) => {
  const hasMultipleVariations = product.highPrice > product.lowPrice;

  if (!hasMultipleVariations || !product.variations || product.variations.length === 0) {
    return <p className="text-gray-700 font-bold">¥{product.lowPrice.toLocaleString()}</p>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-gray-700 font-bold flex items-center cursor-pointer">
          ¥{product.lowPrice.toLocaleString()}
          {' ~ '}¥{product.highPrice.toLocaleString()}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {product.variations.map((variation) => (
          <DropdownMenuItem key={variation.id}>
            <div className="flex flex-col">
              <div className="font-medium">{variation.name}</div>
              <div className="text-gray-700">¥{variation.price.toLocaleString()}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PriceDisplay;