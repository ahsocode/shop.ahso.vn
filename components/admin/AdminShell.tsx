"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileText,
  Home,
  ImageIcon,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils";

type AdminIcon = typeof Home;

type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminIcon;
};

type AdminNavLookupItem = {
  href: string;
  label: string;
  entryId: string;
  match?: string[];
};

type AdminNavEntry =
  | {
      kind: "link";
      id: string;
      href: string;
      label: string;
      description: string;
      icon: AdminIcon;
      match?: string[];
    }
  | {
      kind: "group";
      id: string;
      title: string;
      description: string;
      icon: AdminIcon;
      items: AdminNavItem[];
    };

const navEntries: AdminNavEntry[] = [
  {
    kind: "link",
    id: "overview",
    href: "/admin",
    label: "Tổng quan",
    description: "Số liệu và thiết lập nhanh",
    icon: LayoutDashboard,
  },
  {
    kind: "group",
    id: "requests",
    title: "Yêu cầu",
    description: "Liên hệ và báo giá",
    icon: Inbox,
    items: [
      { href: "/admin/contact-requests", label: "Yêu cầu liên hệ", icon: Inbox },
      { href: "/admin/quote-requests", label: "Yêu cầu báo giá", icon: ClipboardList },
    ],
  },
  {
    kind: "link",
    id: "content",
    href: "/admin/software",
    label: "Nội dung",
    description: "Phần mềm và giải pháp",
    icon: Layers,
    match: ["/admin/software", "/admin/software-categories", "/admin/solutions", "/admin/solution-categories"],
  },
  {
    kind: "group",
    id: "display",
    title: "Hiển thị",
    description: "Banner và quảng cáo",
    icon: ImageIcon,
    items: [
      { href: "/admin/system/hero-banners", label: "Banner chính", icon: ImageIcon },
      { href: "/admin/system/announcements", label: "Banner quảng cáo", icon: Megaphone },
    ],
  },
  {
    kind: "link",
    id: "policies",
    href: "/admin/policies",
    label: "Chính sách",
    description: "Điều khoản và nội dung HTML",
    icon: FileText,
  },
  {
    kind: "group",
    id: "users",
    title: "Người dùng",
    description: "Tài khoản và phân quyền",
    icon: Users,
    items: [
      { href: "/admin/users", label: "Khách hàng", icon: Users },
      { href: "/admin/staff", label: "Nhân viên", icon: Shield },
    ],
  },
];

function isActive(href: string, pathname?: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isEntryActive(entry: AdminNavEntry, pathname?: string | null) {
  if (entry.kind === "link") {
    return isActive(entry.href, pathname) || Boolean(entry.match?.some((href) => isActive(href, pathname)));
  }

  return entry.items.some((item) => isActive(item.href, pathname));
}

const navItems = navEntries.reduce<AdminNavLookupItem[]>((acc, entry) => {
  if (entry.kind === "link") {
    acc.push({ href: entry.href, label: entry.label, entryId: entry.id, match: entry.match });
    return acc;
  }

  entry.items.forEach((item) => {
    acc.push({ href: item.href, label: item.label, entryId: entry.id });
  });
  return acc;
}, []);

function findEntryId(pathname?: string | null): string | null {
  if (!pathname) return null;
  const match = navItems.find(
    (item) => isActive(item.href, pathname) || item.match?.some((href) => isActive(href, pathname)),
  );
  return match?.entryId ?? null;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(() =>
    findEntryId(typeof window !== "undefined" ? window.location.pathname : "/admin"),
  );

  const isMobileMenuOpen = mobileMenuPath !== null && mobileMenuPath === pathname;
  const currentTitle = useMemo(
    () =>
      navItems.find((item) => isActive(item.href, pathname) || item.match?.some((href) => isActive(href, pathname)))
        ?.label || "Tổng quan",
    [pathname],
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
        setMobileMenuPath(null);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const next = findEntryId(pathname);
    const frame = requestAnimationFrame(() => {
      if (next) setExpandedEntry((prev) => (prev === next ? prev : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const toggleGroup = (entryId: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setExpandedEntry(entryId);
      return;
    }
    setExpandedEntry((prev) => (prev === entryId ? null : entryId));
  };

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-50 text-slate-950">
      {isMobileMenuOpen ? (
        <button
          aria-label="Đóng menu quản trị"
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={() => setMobileMenuPath(null)}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-slate-200 bg-slate-950 text-slate-100 transition-[width,transform] duration-200",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarOpen ? "w-72" : "w-20",
          "lg:translate-x-0",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          {sidebarOpen ? (
            <>
              <Link className="flex min-w-0 items-center gap-3" href="/admin">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100">
                  <Image alt="AHSO" className="h-7 w-7 object-contain" height={28} src="/logo.png" width={28} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">AHSO Admin</span>
                  <span className="block truncate text-xs text-slate-400">Quản trị nội dung</span>
                </span>
              </Link>

              <div className="flex items-center gap-1">
                <button
                  aria-label="Thu gọn thanh quản trị"
                  className="hidden h-9 w-9 place-items-center rounded-md text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:grid"
                  onClick={() => setSidebarOpen(false)}
                  type="button"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <button
                  aria-label="Đóng menu quản trị"
                  className="grid h-9 w-9 place-items-center rounded-md text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:hidden"
                  onClick={() => setMobileMenuPath(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              aria-label="Mở rộng thanh quản trị"
              className="mx-auto grid h-10 w-10 place-items-center rounded-md text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav aria-label="Điều hướng quản trị" className="flex-1 overflow-y-auto px-3 py-4">
          <div className="grid gap-1.5">
            {navEntries.map((entry) => {
              const EntryIcon = entry.icon;

              if (entry.kind === "link") {
                const active = isEntryActive(entry, pathname);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                      active ? "bg-slate-100 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      !sidebarOpen && "justify-center px-0",
                    )}
                    href={entry.href}
                    key={entry.id}
                    title={!sidebarOpen ? entry.label : undefined}
                  >
                    <EntryIcon className="h-5 w-5 shrink-0" />
                    {sidebarOpen ? (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{entry.label}</span>
                        <span className={cn("block truncate text-xs", active ? "text-slate-600" : "text-slate-500")}>
                          {entry.description}
                        </span>
                      </span>
                    ) : null}
                  </Link>
                );
              }

              const isExpanded = expandedEntry === entry.id;
              const isCurrent = isEntryActive(entry, pathname);

              return (
                <section className="min-w-0" key={entry.id}>
                  <button
                    aria-expanded={sidebarOpen ? isExpanded : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                      isCurrent ? "bg-slate-100 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      !sidebarOpen && "justify-center px-0",
                    )}
                    onClick={() => toggleGroup(entry.id)}
                    title={!sidebarOpen ? entry.title : undefined}
                    type="button"
                  >
                    <EntryIcon className="h-5 w-5 shrink-0" />
                    {sidebarOpen ? (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{entry.title}</span>
                          <span className={cn("block truncate text-xs", isCurrent ? "text-slate-600" : "text-slate-500")}>
                            {entry.description}
                          </span>
                        </span>
                        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
                      </>
                    ) : null}
                  </button>

                  {sidebarOpen && isExpanded ? (
                    <ul className="mt-1 grid gap-1 pl-4">
                      {entry.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href, pathname);

                        return (
                          <li key={item.href}>
                            <Link
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                              )}
                              href={item.href}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {active ? <ChevronLeft className="h-3.5 w-3.5 shrink-0" /> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </section>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <Link
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              !sidebarOpen && "justify-center px-0",
            )}
            href="/"
            title="Về trang chủ"
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen ? <span>Về trang chủ</span> : null}
          </Link>

          <button
            className={cn(
              "mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
              !sidebarOpen && "justify-center px-0",
            )}
            onClick={logout}
            title="Đăng xuất"
            type="button"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen ? <span>Đăng xuất</span> : null}
          </button>
        </div>
      </aside>

      <main className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-200", sidebarOpen ? "lg:ml-72" : "lg:ml-20")}>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Mở menu quản trị"
              className="grid h-9 w-9 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
              onClick={() => setMobileMenuPath(pathname ?? "/admin")}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Quản trị</p>
              <h1 className="truncate text-lg font-semibold text-slate-950 lg:text-xl">{currentTitle}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
            <User className="h-4 w-4 shrink-0 text-slate-500" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-slate-950">{user?.fullName || "Admin User"}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || "admin@ahso.vn"}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[min(1500px,96vw)] min-w-0 px-4 py-5 sm:px-5 lg:px-6">{children}</div>
      </main>
    </div>
  );
}
