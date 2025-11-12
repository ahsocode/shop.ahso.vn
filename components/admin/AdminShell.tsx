"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package, Settings, Users, Shield, PanelsTopLeft, Code2, Home,
  Menu, X, ChevronRight, LogOut, User as UserIcon, Layers, Tag, Grid3x3
} from "lucide-react";

const navSections = [
  { title: "Dashboard", items: [{ href: "/admin", label: "Tổng quan", icon: PanelsTopLeft }] },
  {
    title: "Người dùng",
    items: [
      { href: "/admin/users", label: "Khách hàng", icon: Users },
      { href: "/admin/staff", label: "Nhân viên", icon: Shield },
    ],
  },
  {
    title: "Sản phẩm",
    items: [
      { href: "/admin/brands", label: "Thương hiệu", icon: Tag },
      { href: "/admin/categories", label: "Danh mục", icon: Grid3x3 },
      { href: "/admin/product-types", label: "Loại SP", icon: Layers },
      { href: "/admin/products", label: "Sản phẩm", icon: Package },
      { href: "/admin/specs", label: "Thông số", icon: Settings },
    ],
  },
  {
    title: "Nội dung",
    items: [
      { href: "/admin/software", label: "Phần mềm", icon: Code2 },
      { href: "/admin/solutions", label: "Giải pháp", icon: Settings },
    ],
  },
];

function isActive(href: string, pathname?: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin"; // chỉ sáng đúng trang tổng quan
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const flat = navSections.flatMap((s) => s.items);
  const currentTitle =
    flat.find((i) => isActive(i.href, pathname))?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-linear-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 z-50 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-700">
          {sidebarOpen ? (
            <>
              <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <img src="/logo.png" alt="AHSO" className="w-8 h-8" />
                <span>AHSO Admin</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-blue-700 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-blue-700 rounded-md mx-auto"
              aria-label="Mở sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="py-4 overflow-y-auto h-[calc(100vh-8rem)]">
          {navSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              {sidebarOpen && (
                <div className="px-4 mb-2">
                  <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
              )}
              <ul className="space-y-1 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          active
                            ? "bg-white text-blue-600 shadow-lg"
                            : "text-blue-100 hover:bg-blue-700 hover:text-white"
                        } ${!sidebarOpen ? "justify-center" : ""}`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 text-left font-medium">{item.label}</span>
                            {active && <ChevronRight className="w-4 h-4" />}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-blue-700 p-4">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-blue-700 hover:text-white transition-all mb-2 ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Về trang chủ</span>}
          </Link>
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-red-500 hover:text-white transition-all ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <h1 className="text-xl font-bold text-gray-800">{currentTitle}</h1>
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <UserIcon className="w-5 h-5 text-gray-600" />
            <div className="text-sm">
              <div className="font-semibold text-gray-800">Admin User</div>
              <div className="text-xs text-gray-500">admin@ahso.vn</div>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
