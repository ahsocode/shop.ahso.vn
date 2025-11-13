"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  UserCircle,
  Package,
  Settings,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore, getUser, setUser } from "@/lib/auth-store";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Refs để đóng menu khi click ra ngoài
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

        const rCookie = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!alive) return;

        if (rCookie.ok) {
          const { user: me } = await rCookie.json();
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
        if (token) {
          const rBearer = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!alive) return;

          if (rBearer.ok) {
            const { user: me } = await rBearer.json();
            setUser({
              id: me.id,
              email: me.email,
              fullName: me.fullName,
              avatarUrl: me.avatarUrl ?? "/logo.png",
              role: me.role,
            });
          } else if (rBearer.status === 401) {
            localStorage.removeItem("token");
            setUser(null);
          }
        }
      } catch {
        // ignore
      } finally {
        if (alive) setHydrated(true);
      }
    }

    hydrate();
    return () => {
      alive = false;
    };
  }, []);

  // Đóng menu user khi click ra ngoài hoặc nhấn Escape
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (!isUserMenuOpen) return;
      const btn = userBtnRef.current;
      const menu = userMenuRef.current;
      const target = e.target as Node;
      if (menu && !menu.contains(target) && btn && !btn.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isUserMenuOpen]);

  // Đổi route thì đóng menu user & mobile
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    } catch {}
    localStorage.removeItem("token");
    setUser(null);
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    router.push("/");
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: "/", label: "Trang chủ" },
    { href: "/shop/products", label: "Sản phẩm" },
    { href: "/about", label: "Về chúng tôi" },
    { href: "/policy", label: "Chính sách" },
    { href: "/contact", label: "Liên hệ" },
    { href: "/solutions", label: "Giải pháp" },
    { href: "/software", label: "Phần mềm" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <span>AHSO Industrial</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "text-blue-600 font-bold"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
                )}
              </Link>
            ))}
           
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Link href="/cart">
              <Button id="site-cart-icon" variant="ghost" size="icon" aria-label="Giỏ hàng">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>

            {/* User State */}
            {hydrated ? (
              user ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="hidden md:flex"
                    aria-label="Mở menu người dùng"
                    ref={userBtnRef}
                  >
                    {user.avatarUrl && user.avatarUrl !== "/logo.png" ? (
                      <img
                        src={user.avatarUrl!}
                        alt={user.fullName || "User"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>

                  {isUserMenuOpen && (
                    <>
                      {/* Backdrop (có thể bỏ, đã có click-outside; giữ lại cho UX) */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                        aria-hidden
                      />
                      <div
                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        ref={userMenuRef}
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.role && user.role !== "USER" && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserCircle className="h-4 w-4" /> Tài khoản của tôi
                          </Link>
                          <Link
                            href="/order"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Package className="h-4 w-4" /> Đơn hàng
                          </Link>
                          {(user.role === "STAFF" || user.role === "ADMIN") && (
                            <Link
                              href="/staff"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <ClipboardList className="h-4 w-4" /> Không gian Staff
                            </Link>
                          )}
                          {user.role === "ADMIN" && (
                            <Link
                              href="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Settings className="h-4 w-4" /> Quản trị
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-gray-100 py-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" /> Đăng xuất
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link href="/login">
                  <Button className="hidden md:inline-flex" size="sm">
                    Đăng nhập
                  </Button>
                </Link>
              )
            ) : (
              <div className="hidden md:inline-flex h-9 w-9 animate-pulse rounded-full bg-gray-200" />
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/solutions"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive("/solutions")
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Giải pháp Công Nghiệp
            </Link>
            <Link
              href="/software"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive("/software")
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Phần mềm & Dịch vụ
            </Link>

            {hydrated && user ? (
              <>
                <div className="border-top border-gray-200 pt-3 mt-2 px-4">
                  <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  Tài khoản
                </Link>
                <Link
                  href="/order"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  Đơn hàng
                </Link>
                {(user.role === "STAFF" || user.role === "ADMIN") && (
                  <Link
                    href="/staff"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Nhân viên
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Quản trị
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className="px-4 pt-2">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full" size="sm">
                    Đăng nhập
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

