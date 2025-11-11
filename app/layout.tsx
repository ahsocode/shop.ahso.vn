import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/app-shell";
import { Toaster } from "sonner";
import { CartProvider } from "@/lib/hooks/useCart";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AHSO Industrial - Máy móc & Thiết bị Công nghiệp",
  description:
    "Cung cấp máy móc, thiết bị và linh kiện công nghiệp chất lượng cao",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ✅ Bọc toàn app trong CartProvider */}
        <CartProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            richColors
            expand
            position="top-right"
            duration={3500}
          />
        </CartProvider>
      </body>
    </html>
  );
}
