"use client"; // Client Componentとしてマーク

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ProductDetail {
  id: string;
  boothJpUrl: string;
  boothEnUrl: string;
  title: string;
  description: string | null;
  images: {
    imageUrl: string;
    caption: string | null;
    order: number;
    isMain: boolean;
  }[];
}

const ProductDetailPage = () => {
  const params = useParams();
  const productId = params.productId as string; // URLからproductIdを取得

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        // 仮のAPIエンドポイントからデータを取得
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data: ProductDetail = await response.json();
        setProduct(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]); // productIdが変更されたら再フェッチ

  useEffect(() => {
    if (!api) {
      return;
    }
    setSlideCount(api.scrollSnapList().length);
    setCurrentSlide(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <h1 className="text-2xl font-bold mb-4">{product.title}</h1>
      <p className="mb-2">商品ID: {product.id}</p>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Booth URL</h2>
        <p>日本語版: <a href={product.boothJpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothJpUrl}</a></p>
        <p>英語版: <a href={product.boothEnUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothEnUrl}</a></p>
      </div>

      {product.images && product.images.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">商品画像</h2>
          <Carousel setApi={setApi} opts={{ loop: true }}>
            <CarouselContent>
              {product.images.map((image, index) => (
                <CarouselItem key={index} className="flex justify-center items-center">
                  <img src={image.imageUrl} alt={image.caption || `商品画像 ${index + 1}`} className="max-w-full h-auto max-h-96 object-contain"/>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentSlide - 1 ? "bg-blue-500" : "bg-gray-300"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Description (仮表示)</h2>
        {product.description ? (
          <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded">{product.description}</pre>
        ) : (
          <p>Descriptionはありません。</p>
        )}
      </div>

    </div>
  );
};

export default ProductDetailPage;