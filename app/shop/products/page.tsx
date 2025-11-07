import { Suspense } from "react";
import ProductsSearchClient from "./products-search-client";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Đang tải...</div>}>
      <ProductsSearchClient />
    </Suspense>
  );
}