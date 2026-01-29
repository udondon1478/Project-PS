"use client";

import ProductGrid from "@/components/ProductGrid";
import ServiceIntroSection from "@/components/ServiceIntroSection";
import { Product } from "@/types/product";
import { Pagination } from "@/components/ui/pagination";
import { useColumnSettings } from "@/hooks/useColumnSettings";
import { ColumnSelector } from "@/components/ColumnSelector";

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
  const { columns, setColumns, isLoaded } = useColumnSettings();

  return (
    <div className="container mx-auto px-4 py-8">
      <ServiceIntroSection />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">
          データベースに登録された最新の商品
        </h1>
        {isLoaded && (
          <ColumnSelector columns={columns} onColumnsChange={setColumns} />
        )}
      </div>
      <ProductGrid
        products={products}
        showLikeButton={true}
        showOwnButton={true}
        isLoading={!isLoaded}
        maxTags={7}
        columns={columns}
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
