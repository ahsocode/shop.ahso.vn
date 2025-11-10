import { Suspense } from "react";
import SolutionsSearchClient from "@/app/shop/solutions/solutions-search-client";

export default function SolutionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Đang tải...</div>}>
      <SolutionsSearchClient />
    </Suspense>
  );
}

