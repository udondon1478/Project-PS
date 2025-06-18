"use client"; // Client Componentとしてマーク

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
          <div className="flex flex-wrap gap-4">
            {product.images.map((image, index) => (
              <div key={index} className="border p-2">
                <img src={image.imageUrl} alt={image.caption || `商品画像 ${index + 1}`} className="max-w-xs h-auto"/>
                {image.caption && <p className="text-sm mt-1">{image.caption}</p>}
              </div>
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