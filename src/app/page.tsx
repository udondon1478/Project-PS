"use client";
import { useEffect, useState } from "react";
import ProductGrid from "@/components/ProductGrid"; // ProductGridコンポーネントをインポート
import { Product } from "@/types/product"; // Product型をインポート (後で作成)
import { OnboardingTour } from "@/components/OnboardingTour";
import { homepageSteps } from "@/lib/onboarding/homepageSteps";

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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <OnboardingTour tourKey="homepage" steps={homepageSteps} />
      <div className="container mx-auto px-4 py-8 pt-40">
        <h1 className="text-2xl font-bold mb-6">最新の商品</h1>
        <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
      </div>
    </>
  );
}