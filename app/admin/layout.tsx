import type { Metadata } from "next";
import Link from "next/link";
import { AdminRoute } from "@/components/auth/admin-route";
import { Package, Settings, Users, Shield, PanelsTopLeft, Code2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin | AHSO",
};

const nav = [
  { href: "/admin", label: "Dashboard", icon: PanelsTopLeft },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/staff", label: "Staff", icon: Shield },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/software", label: "Software", icon: Code2 },
  { href: "/admin/solutions", label: "Solutions", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <nav className="rounded-xl border bg-white shadow-sm divide-y">
              <div className="p-4 font-bold text-lg">AHSO Admin</div>
              <ul className="p-2">
                {nav.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-50">
                      <i.icon className="h-4 w-4 text-gray-500" />
                      <span>{i.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <div className="rounded-xl border bg-white shadow-sm p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}
