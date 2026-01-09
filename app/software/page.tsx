import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import type { softwareWhereInput } from "@/lib/prisma-types";
import SoftwareSearchClient, {
  SoftwareCard,
  SoftwareCategoryOption,
} from "./software-search-client";

// Tránh prerender khi không có DB
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Phần mềm công nghiệp & dịch vụ triển khai",
  description:
    "Lựa chọn giải pháp MES, ERP, CMMS, IoT công nghiệp cùng dịch vụ triển khai, đào tạo và bảo trì từ AHSO.",
  path: "/software",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toInt(value: string, def = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

function SoftwareFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Phần mềm & dịch vụ
          </h1>
          <p className="mt-2 text-gray-600">
            Dữ liệu sẽ được tải ở môi trường chạy thật. (CI skip DB khi build.)
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SoftwarePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";
  if (SKIP_BUILD_DB) return <SoftwareFallback />;

  const params = await searchParams;
  const q = pickParam(params, "q").trim();
  const category = pickParam(params, "category").trim();
  const page = toInt(pickParam(params, "page"), 1);
  const pageSize = toInt(pickParam(params, "pageSize"), 20);

  const where: softwareWhereInput = { status: "PUBLISHED" };

  if (category) {
    // quan hệ 1-n: software -> softwarecategory
    where.softwarecategory = { is: { slug: category } };
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { bodyHtml: { contains: q } },
    ];
  }

  const result = await Promise.all([
    prisma.software.count({ where }),
    prisma.software.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverImage: true,
          isFeatured: true,

          // ✅ thêm relation để TS có r.softwarecategory
          softwarecategory: {
            select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    }),
    prisma.softwarecategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
  ]).catch((err) => {
    console.error("[software] DB error, fallback UI:", err);
    return null;
  });

  if (!result) return <SoftwareFallback />;

  const [total, rows, categories] = result;

  const initialData: SoftwareCard[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary ?? undefined,
    image: r.coverImage || "/logo.png",
    isFeatured: r.isFeatured ?? false,
    category: r.softwarecategory
      ? {
          id: r.softwarecategory.id,
          slug: r.softwarecategory.slug,
          name: r.softwarecategory.name,
        }
      : null,
  }));

  const initialCategories: SoftwareCategoryOption[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }));

  return (
    <SoftwareSearchClient
      initialData={initialData}
      initialTotal={total}
      initialQuery={{ q, category, page, pageSize }}
      initialCategories={initialCategories}
    />
  );
}
