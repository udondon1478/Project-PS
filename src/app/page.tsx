"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Product {
  id: string;
  title: string;
  lowPrice: number; // price を lowPrice に変更
  highPrice: number; // highPriceを追加
  mainImageUrl: string | null;
  tags: string[];
  variations?: { // variationsを追加
    id: string;
    name: string;
    price: number;
  }[];
}

// 価格表示コンポーネント
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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products/latest');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (err: unknown) {
        // エラーがErrorオブジェクトの場合、messageプロパティを使用
        if (err instanceof Error) {
          setError(err.message);
        } else {
          // それ以外の不明なエラーの場合
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []); // コンポーネントのマウント時に一度だけ実行

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <h1 className="text-2xl font-bold mb-6">最新の商品</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg overflow-hidden shadow-lg">
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
  <h3
    className="flex-grow overflow-hidden"
    style={{
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
    }}
  >
    {product.title}
  </h3>
  <button className="bg-white rounded-full p-1 shadow flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </button>
</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {product.tags.map((tag, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <PriceDisplay product={product} /> {/* PriceDisplayコンポーネントを使用 */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}