"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Laptop, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const contentGroups = [
  {
    label: "Quản lý phần mềm",
    description: "Bài viết và danh mục phần mềm",
    href: "/admin/software",
    icon: Laptop,
    match: ["/admin/software", "/admin/software-categories"],
    links: [
      { href: "/admin/software", label: "Bài viết" },
      { href: "/admin/software-categories", label: "Danh mục" },
    ],
  },
  {
    label: "Quản lý giải pháp",
    description: "Bài viết và danh mục giải pháp",
    href: "/admin/solutions",
    icon: Settings,
    match: ["/admin/solutions", "/admin/solution-categories"],
    links: [
      { href: "/admin/solutions", label: "Bài viết" },
      { href: "/admin/solution-categories", label: "Danh mục" },
    ],
  },
];

function isPathActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ContentManagementNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-3 md:grid-cols-2" aria-label="Chuyển khu vực quản lý nội dung">
      {contentGroups.map((group) => {
        const Icon = group.icon;
        const groupActive = group.match.some((href) => isPathActive(pathname, href));

        return (
          <section
            key={group.href}
            className={cn(
              "rounded-md border p-3 transition",
              groupActive ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white",
            )}
          >
            <Link
              href={group.href}
              className="flex items-start gap-3 rounded-md p-2 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                  groupActive ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">{group.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{group.description}</span>
              </span>
            </Link>

            <div className="mt-2 flex flex-wrap gap-2 px-2">
              {group.links.map((link) => {
                const active = isPathActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      active
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
