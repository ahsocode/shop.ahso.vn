"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const items = [
  { href: "/shop/products", label: "Sản phẩm & Linh kiện Công Nghiệp" },
];

export function ShopTabs() {
  const pathname = usePathname();
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector(`[aria-current="page"]`);
      if (activeTab) {
        gsap.fromTo(
          activeTab,
          { scale: 0.95, opacity: 0.8 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }
        );
      }
    }
  }, [pathname]);

  return (
    <nav ref={tabsRef} className="flex gap-4 border-b border-gray-200" aria-label="Danh mục shop">
      {items.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`px-5 py-3 -mb-px border-b-2 text-base font-semibold transition-all duration-300
              ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300"}`}
            aria-current={active ? "page" : undefined}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

