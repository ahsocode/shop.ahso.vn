"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  FileText,
  Home,
  Info,
  Laptop,
  Layers,
  LogOut,
  Menu,
  Package,
  Phone,
  Settings,
  User,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getUser, setUser, useAuthStore } from "@/lib/auth-store";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  external?: boolean;
};

const SHOP_URL = "https://shop.ahso.vn";

const navItems: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/solutions", label: "Giải pháp", icon: Layers },
  { href: "/software", label: "Phần mềm", icon: Laptop },
  { href: SHOP_URL, label: "Shop AHSO", icon: Package, external: true },
  { href: "/about", label: "Về AHSO", icon: Info },
  { href: "/policy", label: "Chính sách", icon: FileText },
  { href: "/contact", label: "Liên hệ", icon: Phone },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    async function hydrate() {
      try {
        if (getUser()) {
          setHydrated(true);
          return;
        }

        const cookieResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!alive) return;

        if (cookieResponse.ok) {
          const { user: me } = await cookieResponse.json();
          setUser({
            id: me.id,
            email: me.email,
            fullName: me.fullName,
            avatarUrl: me.avatarUrl ?? "/logo.png",
            role: me.role,
          });
          setHydrated(true);
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        const bearerResponse = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!alive) return;

        if (bearerResponse.ok) {
          const { user: me } = await bearerResponse.json();
          setUser({
            id: me.id,
            email: me.email,
            fullName: me.fullName,
            avatarUrl: me.avatarUrl ?? "/logo.png",
            role: me.role,
          });
        } else if (bearerResponse.status === 401) {
          localStorage.removeItem("token");
          setUser(null);
        }
      } catch {
        // Auth hydration is best-effort; the public site remains usable.
      } finally {
        if (alive) setHydrated(true);
      }
    }

    hydrate();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function handleDown(event: MouseEvent) {
      if (!isUserMenuOpen) return;
      const button = userBtnRef.current;
      const menu = userMenuRef.current;
      const target = event.target as Node;
      if (menu && !menu.contains(target) && button && !button.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    }

    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Local logout still proceeds if the network request fails.
    }

    localStorage.removeItem("token");
    setUser(null);
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    toast.success("Đã đăng xuất");
    router.push("/");
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-bold text-slate-950"
          >
            <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={34}
              height={34}
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="truncate">AHSO Industrial</span>
          </Link>

          <div className="hidden items-center gap-5 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = !item.external && isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`relative inline-flex items-center gap-2 text-sm font-semibold transition ${
                    active ? "text-blue-700" : "text-slate-700 hover:text-blue-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-blue-700" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {hydrated ? (
              user ? (
                <div className="relative hidden lg:block">
                  <Button
                    ref={userBtnRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    aria-label="Mở menu người dùng"
                  >
                    {user.avatarUrl && user.avatarUrl !== "/logo.png" ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.fullName || "Người dùng"}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>

                  {isUserMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setIsUserMenuOpen(false)}
                        aria-label="Đóng menu người dùng"
                      />
                      <div
                        ref={userMenuRef}
                        className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 shadow-xl"
                      >
                        <div className="border-b border-slate-100 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-950">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          {user.role && user.role !== "USER" && (
                            <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {user.role}
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <UserCircle className="h-4 w-4" />
                            Tài khoản của tôi
                          </Link>
                          {(user.role === "STAFF" || user.role === "ADMIN") && (
                            <Link
                              href="/staff"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              <ClipboardList className="h-4 w-4" />
                              Nhân viên
                            </Link>
                          )}
                          {user.role === "ADMIN" && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              <Settings className="h-4 w-4" />
                              Quản trị
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-slate-100 py-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden h-9 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 lg:inline-flex"
                >
                  Đăng nhập
                </Link>
              )
            ) : (
              <div className="hidden h-9 w-9 animate-pulse rounded-full bg-slate-200 lg:block" />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="grid gap-1 border-t border-slate-200 py-4 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = !item.external && isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-base font-semibold transition ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {hydrated && user ? (
              <>
                <div className="mt-2 border-t border-slate-200 px-4 pt-4">
                  <p className="text-sm font-semibold text-slate-950">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Tài khoản
                </Link>
                {(user.role === "STAFF" || user.role === "ADMIN") && (
                  <Link
                    href="/staff"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Nhân viên
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Quản trị
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
