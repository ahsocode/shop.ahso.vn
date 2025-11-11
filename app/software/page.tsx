import { Suspense } from "react";
import SoftwareSearchClient from "./software-search-client";


export default function SoftwarePage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Đang tải...</div>}>
      <SoftwareSearchClient />
    </Suspense>
  );
}

