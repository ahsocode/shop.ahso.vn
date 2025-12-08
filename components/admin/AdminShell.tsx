"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Package, Settings, Users, Shield, PanelsTopLeft, Code2, Home,
  ChevronRight, LogOut, User, Layers, Tag, Grid3x3, 
  Building2, Inbox, FileText, ChevronDown, Menu, X
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const navSections = [
  { 
    id: "dashboard",
    title: "Dashboard", 
    icon: PanelsTopLeft,
    items: [{ href: "/admin", label: "Tổng quan", icon: PanelsTopLeft }] 
  },
  {
    id: "users",
    title: "Người dùng",
    icon: Users,
    items: [
      { href: "/admin/users", label: "Khách hàng", icon: Users },
      { href: "/admin/staff", label: "Nhân viên", icon: Shield },
    ],
  },
  {
    id: "orders",
    title: "Đơn hàng",
    icon: Package,
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: Package },
    ],
  },
  {
    id: "products",
    title: "Sản phẩm",
    icon: Package,
    items: [
      { href: "/admin/brands", label: "Thương hiệu", icon: Tag },
      { href: "/admin/categories", label: "Danh mục", icon: Grid3x3 },
      { href: "/admin/product-types", label: "Loại SP", icon: Layers },
      { href: "/admin/suppliers", label: "Nhà cung cấp", icon: Building2 },
      { href: "/admin/products", label: "Sản phẩm", icon: Package },
      { href: "/admin/specs", label: "Thông số", icon: Settings },
    ],
  },
  {
    id: "requests",
    title: "Yêu cầu",
    icon: Inbox,
    items: [
      { href: "/admin/contact-requests", label: "Liên hệ", icon: Inbox },
      { href: "/admin/quote-requests", label: "Báo giá", icon: FileText },
    ],
  },
  {
    id: "content",
    title: "Nội dung",
    icon: Code2,
    items: [
      { href: "/admin/software", label: "Phần mềm", icon: Code2 },
      { href: "/admin/solutions", label: "Giải pháp", icon: Settings },
    ],
  },
  {
    id: "system",
    title: "Hệ thống",
    icon: Settings,
    items: [{ href: "/admin/system", label: "Quản lý hệ thống", icon: Settings }],
  },
];

function isActive(href: string, pathname?: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

const sectionByPath: Record<string, string> = navSections.reduce<Record<string, string>>(
  (acc, section) => {
    section.items.forEach((item) => {
      acc[item.href] = section.id;
    });
    return acc;
  },
  {},
);

function findSectionId(pathname?: string | null): string | null {
  if (!pathname) return null;
  if (sectionByPath[pathname]) return sectionByPath[pathname];
  const match = Object.keys(sectionByPath).find((href) =>
    pathname.startsWith(href.endsWith("/") ? href : `${href}/`),
  );
  return match ? sectionByPath[match] : null;
}

function isSectionActive(section: typeof navSections[0], pathname?: string | null) {
  return section.id === findSectionId(pathname);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // thay mobileMenuOpen: lưu path tại lúc mở menu
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);

  // section expand
  const [expandedSection, setExpandedSection] = useState<string | null>(() =>
    findSectionId(typeof window !== "undefined" ? window.location.pathname : "/admin"),
  );

  // menu đang mở khi path hiện tại trùng với path lúc bấm mở
  const isMobileMenuOpen = mobileMenuPath !== null && mobileMenuPath === pathname;

  // Auto-toggle sidebar theo width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
        setMobileMenuPath(null); // đóng menu mobile khi lên desktop
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Không cần effect để đóng menu khi đổi route nữa.
  // Điều kiện isMobileMenuOpen đã phụ thuộc pathname nên tự false.

  // Sync expanded section theo pathname
  useEffect(() => {
    const next = findSectionId(pathname);
    const frame = requestAnimationFrame(() => {
      setExpandedSection((prev) => (next === prev ? prev : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const flat = navSections.flatMap((s) => s.items);
  const currentTitle =
    flat.find((i) => isActive(i.href, pathname))?.label || "Dashboard";

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex min-w-0">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuPath(null)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-linear-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 z-50 flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-700 shrink-0">
          {sidebarOpen ? (
            <>
              <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Image src="/logo.png" alt="AHSO" width={32} height={32} />
                <span>AHSO Admin</span>
              </Link>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="p-1.5 hover:bg-blue-700 rounded-md transition-colors hidden lg:block"
                aria-label="Thu gọn sidebar"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setMobileMenuPath(null)} 
                className="p-1.5 hover:bg-blue-700 rounded-md transition-colors lg:hidden"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-blue-700 rounded-md mx-auto transition-colors"
              aria-label="Mở sidebar"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isCurrent = isSectionActive(section, pathname);
            
            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => sidebarOpen && toggleSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isCurrent 
                      ? "bg-blue-700 text-white" 
                      : "text-blue-100 hover:bg-blue-700 hover:text-white"
                  } ${!sidebarOpen ? "justify-center" : ""}`}
                  title={section.title}
                >
                  <SectionIcon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-medium text-sm">
                        {section.title}
                      </span>
                      {section.items.length > 1 && (
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`} 
                        />
                      )}
                    </>
                  )}
                </button>

                {sidebarOpen && isExpanded && (
                  <ul className="mt-1 space-y-1 pl-3">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href, pathname);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                              active
                                ? "bg-white text-blue-600 shadow-lg font-medium"
                                : "text-blue-100 hover:bg-blue-700/50 hover:text-white"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {active && <ChevronRight className="w-3 h-3" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-blue-700 p-4 space-y-2 shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-blue-700 hover:text-white transition-all ${
              !sidebarOpen && "justify-center"
            }`}
            title="Về trang chủ"
          >
            <Home className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">Về trang chủ</span>}
          </Link>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-red-500 hover:text-white transition-all ${
              !sidebarOpen && "justify-center"
            }`}
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium text-sm">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuPath(pathname ?? "/admin")}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-gray-800 truncate">
              {currentTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 bg-gray-50 rounded-lg">
            <User className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 shrink-0" />
            <div className="text-sm hidden sm:block">
              <div className="font-semibold text-gray-800 text-xs lg:text-sm">
                {user?.fullName || "Admin User"}
              </div>
              <div className="text-xs text-gray-500">{user?.email || "admin@ahso.vn"}</div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-5 lg:p-6 w-full max-w-[1400px] xl:max-w-[96vw] mx-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
