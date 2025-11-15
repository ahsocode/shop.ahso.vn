"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Package, Menu, X, LogOut, Home, BadgeCheck } from "lucide-react";
import { useAuthStore, setUser } from "@/lib/auth-store";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  {
    href: "/staff/orders",
    label: "Quản lý đơn hàng",
    description: "Theo dõi và xử lý yêu cầu khách",
    icon: Package,
  },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`fixed top-0 left-0 h-full bg-linear-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-50 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen ? (
            <>
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <Image src="/logo.png" alt="AHSO" width={32} height={32} className="rounded" />
                <div className="text-left">
                  <span className="text-xs uppercase text-white/60">AHSO</span>
                  <div className="leading-tight">Staff Desk</div>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-white/10 transition-colors mx-auto"
              aria-label="Mở điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="py-5 h-[calc(100vh-8rem)] overflow-y-auto text-sm tracking-tight">
          <div className="px-4 mb-3 text-xs font-semibold uppercase text-white/50">
            Vận hành đơn hàng
          </div>
          <ul className="space-y-2 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl transition-all ${
                      active ? "bg-white text-slate-900 shadow-lg" : "text-white/80 hover:bg-white/10"
                    } ${!sidebarOpen ? "justify-center" : ""}`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                    {sidebarOpen && (
                      <div className="flex-1">
                        <div className="font-semibold">{item.label}</div>
                        {item.description && (
                          <div className="text-[0.72rem] text-white/70">{item.description}</div>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-4 border-t border-white/10 space-y-3">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:bg-white/10 ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <Home className="w-5 h-5" />
            {sidebarOpen && <span>Quay về trang chủ</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:bg-red-500/90 hover:text-white transition ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <div>
            <p className="text-xs uppercase text-slate-400 tracking-widest">Không gian nhân viên</p>
            <h1 className="text-xl font-bold text-slate-900">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <BadgeCheck className="w-5 h-5 text-slate-500" />
            <div className="text-sm">
              <div className="font-semibold text-slate-900">{user?.fullName || "Staff"}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
