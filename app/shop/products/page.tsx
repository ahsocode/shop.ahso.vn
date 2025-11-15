// app/shop/products/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsSearchClient from "./products-search-client";

// SEO Metadata
export const metadata: Metadata = {
  title: "Sản phẩm công nghiệp - Thiết bị tự động hóa & Giải pháp công nghệ | AHSO Industrial",
  description: "Khám phá hàng ngàn sản phẩm công nghiệp chất lượng cao: PLC, cảm biến, biến tần, động cơ servo, HMI từ Siemens, Omron, Schneider, Mitsubishi. Giá tốt, giao hàng nhanh toàn quốc.",
  keywords: [
    "sản phẩm công nghiệp",
    "thiết bị tự động hóa",
    "PLC Siemens",
    "cảm biến công nghiệp",
    "biến tần Schneider",
    "động cơ servo",
    "thiết bị điều khiển",
    "giải pháp tự động hóa",
    "Omron",
    "Mitsubishi",
    "ABB",
    "Delta",
  ].join(", "),
  openGraph: {
    title: "Sản phẩm công nghiệp - AHSO Industrial",
    description: "Hàng ngàn sản phẩm công nghiệp chính hãng, giá cạnh tranh",
    type: "website",
    locale: "vi_VN",
    siteName: "AHSO Industrial",
    images: [
      {
        url: "/og-products.jpg",
        width: 1200,
        height: 630,
        alt: "AHSO Industrial Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sản phẩm công nghiệp - AHSO Industrial",
    description: "Hàng ngàn sản phẩm công nghiệp chính hãng",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://shop.ahso.vn/shop/products",
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Sản phẩm công nghiệp",
  description: "Danh mục sản phẩm công nghiệp và thiết bị tự động hóa",
  url: "https://shop.ahso.vn/shop/products",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: "https://shop.ahso.vn",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sản phẩm",
        item: "https://shop.ahso.vn/shop/products",
      },
    ],
  },
  mainEntity: {
    "@type": "ItemList",
    name: "Sản phẩm công nghiệp",
    description: "Danh sách sản phẩm công nghiệp",
  },
};

// Loading Skeleton
function ProductsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg w-64 mb-2" />
          <div className="h-5 bg-gray-200 rounded-lg w-96" />
        </div>

        {/* Search Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 animate-pulse">
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>

        <div className="flex gap-6">
          {/* Sidebar Skeleton - Desktop */}
          <div className="hidden lg:block w-64">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 animate-pulse">
              <div className="h-10 bg-gray-100 rounded" />
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border bg-white overflow-hidden">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="h-6 w-1/2 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Content */}
      <Suspense fallback={<ProductsLoadingSkeleton />}>
        <ProductsSearchClient />
      </Suspense>
    </>
  );
}