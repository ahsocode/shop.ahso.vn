import { Suspense } from "react";
import SoftwareSearchClient from "@/app/shop/software/software-search-client";

export default function SoftwarePage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Đang tải...</div>}>
      <SoftwareSearchClient />
    </Suspense>
  );
}

