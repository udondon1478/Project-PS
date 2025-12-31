import { Suspense } from "react";
import ClientHome from "@/app/ClientHome";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";

export default function Home() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={24} />}>
      <ClientHome />
    </Suspense>
  );
}