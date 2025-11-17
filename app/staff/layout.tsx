import type { Metadata } from "next";
import { StaffRoute } from "@/components/auth/staff-route";
import StaffShell from "@/components/staff/StaffShell";

export const metadata: Metadata = {
  title: "Staff | AHSO Industrial",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRoute>
      <StaffShell>{children}</StaffShell>
    </StaffRoute>
  );
}
