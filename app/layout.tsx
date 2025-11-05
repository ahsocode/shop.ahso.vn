import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner"; // 👈 thêm dòng này

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
  description: "Cung cấp máy móc, thiết bị và linh kiện công nghiệp chất lượng cao",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />

        {/* ✅ Toaster toàn cục để hiển thị toast Sonner */}
        <Toaster
          richColors
          expand
          position="top-right"
          duration={3500}
        />
      </body>
    </html>
  );
}
