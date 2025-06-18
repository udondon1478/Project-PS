"use client"; // Client Componentとしてマーク

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ProductDetail {
  id: string;
  // 他のプロパティは仮実装では不要
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
      <h1>商品詳細ページ (仮)</h1>
      <p>商品ID: {product.id}</p>
      {/* 他の商品情報は仮実装では表示しない */}
    </div>
  );
};

export default ProductDetailPage;