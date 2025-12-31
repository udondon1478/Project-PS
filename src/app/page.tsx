import { Suspense } from "react";
import ClientHome from "@/app/ClientHome";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientHome />
    </Suspense>
  );
}