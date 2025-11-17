import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/metadata";

const BASE_URL = SITE_URL.replace(/\/$/, "");

const staticRoutes = [
  "/",
  "/about",
  "/contact",
  "/policy",
  "/shop/products",
  "/solutions",
  "/software",
  "/login",
  "/register",
  "/cart",
  "/checkout",
];

function absolute(path: string) {
  if (path === "/") return BASE_URL || SITE_URL;
  return `${BASE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, solutions, softwares] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishAt: true },
    }),
    prisma.solution.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
    prisma.software.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...staticRoutes.map((path) => ({
      url: absolute(path),
      lastModified: new Date(),
    })),
    ...products.map((p) => ({
      url: absolute(`/shop/products/${p.slug}`),
      lastModified: p.updatedAt ?? p.publishAt ?? new Date(),
    })),
    ...solutions.map((s) => ({
      url: absolute(`/solutions/${s.slug}`),
      lastModified: s.updatedAt ?? s.publishedAt ?? new Date(),
    })),
    ...softwares.map((s) => ({
      url: absolute(`/software/${s.slug}`),
      lastModified: s.updatedAt ?? s.publishedAt ?? new Date(),
    })),
  ];

  return entries;
}
