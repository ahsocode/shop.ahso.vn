import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/shop/solutions", destination: "/solutions", permanent: true },
      { source: "/shop/solutions/:slug", destination: "/solutions/:slug", permanent: true },
      { source: "/shop/software", destination: "/software", permanent: true },
      { source: "/shop/software/:slug", destination: "/software/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
