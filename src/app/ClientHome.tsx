"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import ServiceIntroSection from "@/components/ServiceIntroSection";
import { Product } from "@/types/product";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 24;

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ClientHome() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/products/latest?page=${currentPage}&limit=${PAGE_SIZE}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data: ProductsResponse = await response.json();
        setProducts(data.products);
        setTotal(data.total);
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
  }, [currentPage]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
        maxTags={7}
      />
      
      {!loading && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/"
          />
        </div>
      )}
    </div>
  );
}
