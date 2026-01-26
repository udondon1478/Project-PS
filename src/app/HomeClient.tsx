"use client";

import ProductGrid from "@/components/ProductGrid";
import ServiceIntroSection from "@/components/ServiceIntroSection";
import { Product } from "@/types/product";
import { Pagination } from "@/components/ui/pagination";

interface HomeClientProps {
  products: Product[];
  totalPages: number;
  currentPage: number;
}

export default function HomeClient({
  products,
  totalPages,
  currentPage,
}: HomeClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ServiceIntroSection />
      <h1 className="text-2xl font-bold mb-6">
        データベースに登録された最新の商品
      </h1>
      <ProductGrid
        products={products}
        showLikeButton={true}
        showOwnButton={true}
        isLoading={false}
        maxTags={7}
      />

      {totalPages > 1 && (
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
