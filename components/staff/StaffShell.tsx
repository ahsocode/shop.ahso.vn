"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, X, LogOut, Home, ChevronLeft, ChevronRight, MessageSquare, FileText } from "lucide-react";
import { useAuthStore, setUser } from "@/lib/auth-store";
import { toast } from "sonner";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  {
    href: "/staff/contacts",
    label: "Yêu cầu liên hệ",
    description: "Xử lý liên hệ từ khách hàng",
    icon: MessageSquare,
  },
  {
    href: "/staff/quote-requests",
    label: "Yêu cầu báo giá",
    description: "Nhận và xử lý yêu cầu báo giá",
    icon: FileText,
  },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore();

  const current = navItems.find((item) => isActive(pathname, item.href));
  const currentTitle = current?.label ?? "Bảng điều khiển";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      toast.success("Đã đăng xuất");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 z-50 flex-col shadow-2xl ${
          sidebarOpen ? "w-72" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10 backdrop-blur-sm bg-white/5">
          {sidebarOpen ? (
            <>
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                  <Image
                    src="/logo.png"
                    alt="AHSO"
                    width={40}
                    height={40}
                    className="rounded-xl relative shadow-lg"
                  />
                </div>
                <div className="text-left">
                  <div className="text-xs uppercase text-blue-300 font-semibold tracking-wider">AHSO</div>
                  <div className="text-lg font-bold tracking-tight">Staff Desk</div>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all hover:rotate-90"
                aria-label="Thu gọn menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-lg hover:bg-white/10 transition-all mx-auto hover:scale-110"
              aria-label="Mở rộng menu"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {sidebarOpen && (
            <div className="px-6 mb-4">
              <div className="text-xs font-bold uppercase text-white/40 tracking-wider">
                Vận hành
              </div>
              <div className="h-0.5 w-12 bg-linear-to-r from-blue-500 to-transparent mt-2" />
            </div>
          )}
          <ul className="space-y-2 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group relative flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      active
                        ? "bg-white text-slate-900 shadow-xl shadow-blue-500/20"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    } ${!sidebarOpen ? "justify-center" : ""}`}
                    title={item.label}
                  >
                    {active && sidebarOpen && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${
                      active ? "text-blue-600" : ""
                    }`} />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm ${active ? "text-slate-900" : ""}`}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className={`text-xs mt-0.5 ${
                            active ? "text-slate-600" : "text-white/50"
                          }`}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 backdrop-blur-sm bg-white/5 space-y-2">
          <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all group ${
              !sidebarOpen && "justify-center"
            }`}
            title="Quay về trang chủ"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="text-sm font-medium">Trang chủ</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-red-500/20 transition-all group ${
              !sidebarOpen && "justify-center"
            }`}
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white transition-transform duration-300 z-50 w-72 flex flex-col shadow-2xl ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            <Image src="/logo.png" alt="AHSO" width={40} height={40} className="rounded-xl shadow-lg" />
            <div>
              <div className="text-xs uppercase text-blue-300 font-semibold tracking-wider">AHSO</div>
              <div className="text-lg font-bold">Staff Desk</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto">
          <div className="px-6 mb-4">
            <div className="text-xs font-bold uppercase text-white/40 tracking-wider">Vận hành</div>
            <div className="h-0.5 w-12 bg-linear-to-r from-blue-500 to-transparent mt-2" />
          </div>
          <ul className="space-y-2 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      active
                        ? "bg-white text-slate-900 shadow-xl"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? "text-blue-600" : ""}`} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.label}</div>
                      {item.description && (
                        <div className={`text-xs mt-0.5 ${
                          active ? "text-slate-600" : "text-white/50"
                        }`}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Trang chủ</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-72" : "lg:ml-20"}`}>
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <p className="text-xs uppercase text-slate-400 tracking-widest font-semibold">
                Không gian nhân viên
              </p>
              <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
                {currentTitle}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3 bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl lg:rounded-2xl px-3 lg:px-4 py-2 lg:py-2.5 shadow-sm">
            <div className="hidden sm:flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg">
              {user?.fullName?.charAt(0) || "S"}
            </div>
            <div className="text-xs lg:text-sm">
              <div className="font-semibold text-slate-900 truncate max-w-[120px] lg:max-w-none">
                {user?.fullName || "Staff"}
              </div>
              <div className="text-[10px] lg:text-xs text-slate-500 truncate max-w-[120px] lg:max-w-none">
                {user?.email}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
