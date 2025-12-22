"use client";
import { useEffect, useState } from "react";
import ProductGrid from "@/components/ProductGrid"; // ProductGridコンポーネントをインポート
import ServiceIntroSection from "@/components/ServiceIntroSection";
import { Product } from "@/types/product"; // Product型をインポート (後で作成)

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
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ServiceIntroSection />
      <h1 className="text-2xl font-bold mb-6">データベースに登録された最新の商品</h1>
      <ProductGrid 
        products={products} 
        showLikeButton={true} 
        showOwnButton={true} 
        isLoading={loading}
      />
    </div>
  );
}