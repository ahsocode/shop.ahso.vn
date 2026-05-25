"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { IndustrialMotionBackground } from "@/components/industrial-motion-background";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith("/admin") || pathname.startsWith("/staff");

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-[oklch(0.985_0.006_248)]">
      <IndustrialMotionBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
