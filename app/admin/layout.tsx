import type { Metadata } from "next";
import { AdminRoute } from "@/components/auth/admin-route";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Admin | AHSO" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AdminShell>{children}</AdminShell>
    </AdminRoute>
  );
}
