import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import SoftwareSearchClient, {
  SoftwareCard,
  SoftwareCategoryOption,
} from "./software-search-client";

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: "Phần mềm công nghiệp & dịch vụ triển khai",
  description:
    "Lựa chọn giải pháp MES, ERP, CMMS, IoT công nghiệp cùng dịch vụ triển khai, đào tạo và bảo trì từ AHSO.",
  path: "/software",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toInt(value: string, def = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export default async function SoftwarePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = pickParam(params, "q").trim();
  const category = pickParam(params, "category").trim();
  const page = toInt(pickParam(params, "page"), 1);
  const pageSize = toInt(pickParam(params, "pageSize"), 12);

  const where: Prisma.softwareWhereInput = { status: "PUBLISHED" };
  if (category) where.softwarecategory = { is: { slug: category } };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { bodyHtml: { contains: q } },
    ];
  }

  const [total, rows, categories] = await Promise.all([
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
      },
    }),
    prisma.softwarecategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
  ]);

  const initialData: SoftwareCard[] = rows.map((r): SoftwareCard => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary ?? undefined,
    image: r.coverImage ?? null,
  }));

  const initialCategories: SoftwareCategoryOption[] = categories.map(
    (c): SoftwareCategoryOption => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <section className="mb-8 rounded-3xl bg-linear-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Phần mềm & dịch vụ
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold">
          Tối ưu vận hành với nền tảng số công nghiệp
        </h1>
        <p className="mt-3 max-w-2xl text-white/80">
          Sẵn sàng triển khai MES, ERP, CMMS, IoT công nghiệp và các dịch vụ tư
          vấn, đào tạo, bảo trì đi kèm.
        </p>
      </section>

      <SoftwareSearchClient
        initialData={initialData}
        initialTotal={total}
        initialQuery={{ q, category, page, pageSize }}
        initialCategories={initialCategories}
      />
    </div>
  );
}
