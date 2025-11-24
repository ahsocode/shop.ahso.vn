import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc*",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // 👇 Quan trọng: bỏ TS check khi build nếu có env NEXT_IGNORE_BUILD_ERRORS=1
  typescript: {
    ignoreBuildErrors: process.env.NEXT_IGNORE_BUILD_ERRORS === "1",
  },

  async redirects() {
    return [
      { source: "/shop/solutions", destination: "/solutions", permanent: true },
      { source: "/shop/solutions/:slug", destination: "/solutions", permanent: true },
      { source: "/shop/software", destination: "/software", permanent: true },
      { source: "/shop/software/:slug", destination: "/software/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
