import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Home, ArrowLeft, ShoppingCart, Star, StarHalf } from "lucide-react";
import AddToCartClient from "./AddToCartClient";
import QuoteRequestButton from "../QuoteRequestButton";
import { buildMetadata } from "@/lib/metadata";
import type { productInclude as ProductInclude, productGetPayload } from "@/lib/prisma-types";
import type { Decimal } from "@prisma/client/runtime/library";
import GallerySlider from "./GallerySlider";
import RelatedCarousel from "./RelatedCarousel";

export const revalidate = 60;

/* ================== Types ================== */
const productInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  productimage: {
    select: { id: true, url: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  },
  productspecvalue: {
    orderBy: { sortOrder: "asc" },
    include: { productspecdefinition: true },
  },
  productcategorylink: {
    select: {
      productId: true,
      categoryId: true,
      productcategory: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  producttype: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImage: true,
      productcategory: {
        select: { id: true, name: true, slug: true, description: true },
      },
    },
  },
} satisfies ProductInclude;

type ProductRecord = productGetPayload<{
  include: typeof productInclude;
}>;

function transformProduct(record: ProductRecord) {
  const {
    producttype,
    productimage,
    productspecvalue,
    productcategorylink,
    ...rest
  } = record;

  return {
    ...rest,
    type: producttype
      ? {
          ...producttype,
          category: producttype.productcategory,
        }
      : null,
    images: productimage,
    specs: productspecvalue.map(
      ({ productspecdefinition, ...spec }: ProductRecord["productspecvalue"][number]) => ({
        ...spec,
        specDefinition: productspecdefinition,
      }),
    ),
    categoryLinks: productcategorylink.map(
      ({ productcategory, ...link }: ProductRecord["productcategorylink"][number]) => ({
        ...link,
        category: productcategory,
      }),
    ),
  };
}

type ProductWithRelations = ReturnType<typeof transformProduct>;

type ProductWithMetrics = ProductWithRelations & {
  ratingAvg?: number | Decimal | null;
  ratingCount?: number | null;
  purchaseCount?: number | null;
};

type ReviewDTO = {
  id: string;
  rating: number;
  feedback: string | null;
  description: string | null;
  reply: string | null;
  createdAt: Date;
  user: { id: string; email: string | null } | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
};

/* ================== Data ================== */
async function getProduct(slug: string): Promise<ProductWithRelations | null> {
  if (!slug) return null;
  const record = await prisma.product.findUnique({
    where: { slug },
    include: productInclude, // Scalars như ratingAvg, ratingCount, purchaseCount có sẵn
  });
  return record ? transformProduct(record) : null;
}

async function getRelatedProducts(typeId: string, excludeId: string) {
  if (!typeId) return [];
  const rows = await prisma.product.findMany({
    where: { typeId, id: { not: excludeId } },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      coverImage: true,
      productimage: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
      producttype: { select: { name: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price ?? 0),
    image: p.coverImage || p.productimage[0]?.url || "/logo.png",
    typeName: p.producttype?.name || "",
  }));
}

async function getReviews(productId: string): Promise<ReviewDTO[]> {
  const raw = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      feedback: true,
      description: true,
      reply: true,
      createdAt: true,
      user: { select: { id: true, email: true } }, // tránh dùng 'name' nếu User không có field này
      reviewimage: {
        select: { id: true, url: true, alt: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return raw.map(({ reviewimage, ...rest }: (typeof raw)[number]) => ({
    ...rest,
    images: reviewimage,
  }));
}

/* ================== Metadata ================== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) {
    return buildMetadata({
      title: "Sản phẩm không tồn tại",
      description: "Không tìm thấy sản phẩm bạn yêu cầu trên AHSO Shop.",
      path: `/shop/products/${slug}`,
    });
  }

  const title = p.metaTitle || `${p.name}${p.brand ? ` | ${p.brand.name}` : ""}`;
  const description = p.metaDescription || p.description || "";
  const image = p.coverImage || p.images[0]?.url || "/logo.png";
  const keywords = [
    p.name,
    p.brand?.name,
    p.sku,
    p.categoryLinks[0]?.category.name,
  ].filter(Boolean) as string[];

  return buildMetadata({
    title,
    description,
    path: `/shop/products/${slug}`,
    image,
    keywords: keywords.length > 0 ? keywords : undefined,
  });
}

/* ================== Helpers ================== */
type ProductSpec = ProductWithRelations["specs"][number];

function fmtSpec(spec: ProductSpec): string | null {
  const unit =
    spec.unitOverride && spec.unitOverride.trim()
      ? ` ${spec.unitOverride.trim()}`
      : "";

  // Ưu tiên valueString
  if (spec.valueString && spec.valueString.trim() !== "") {
    return `${spec.valueString.trim()}${unit}`;
  }

  // Nếu không có valueString thì fallback sang valueNumber
  if (spec.valueNumber != null) {
    const n = Number(spec.valueNumber);
    return Number.isFinite(n) ? `${n}${unit}` : null;
  }

  if (typeof spec.valueBoolean === "boolean") {
    return spec.valueBoolean ? `Có${unit}` : `Không${unit}`;
  }

  return null;
}


function StarRating({
  value = 0,
  size = 16,
  className = "text-amber-500",
}: {
  value?: number;
  size?: number;
  className?: string;
}) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const frac = v - full;
  const hasHalf = frac >= 0.25 && frac < 0.75;
  const rest = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`Đánh giá ${v.toFixed(1)} / 5`}>
      {Array.from({ length: full }).map((_, i: number) => (
        <Star key={`f-${i}`} width={size} height={size} />
      ))}
      {hasHalf && <StarHalf width={size} height={size} />}
      {Array.from({ length: rest }).map((_, i: number) => (
        <Star key={`e-${i}`} width={size} height={size} className="opacity-25" />
      ))}
    </div>
  );
}

function fmtDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(d));
  } catch {
    return "";
  }
}

/* ================== Page ================== */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const cover = p.coverImage || p.images[0]?.url || "/logo.png";
  const related = p.type?.id ? (await getRelatedProducts(p.type.id, p.id)).slice(0, 10) : [];
  const price = Number(p.price ?? 0);
  const listPrice = Number(p.listPrice ?? 0);
  const requiresQuote = Boolean(p.requiresQuote);
  const inStock = requiresQuote
    ? false
    : (p.stockOnHand ?? 0) - (p.stockReserved ?? 0) > 0;
  const outOfStock = requiresQuote ? false : !inStock;
  const showSavings = !requiresQuote && listPrice > price && price > 0;
  const savings = showSavings ? listPrice - price : 0;
  const savingsPercent = showSavings ? Math.round((savings / listPrice) * 100) : 0;

  // counters (đã có trong Product, không cần include riêng)
  const metrics = p as ProductWithMetrics;
  const ratingAvg = Number(metrics.ratingAvg ?? 0);
  const ratingCount = Number(metrics.ratingCount ?? 0);
  const purchaseCount = Number(metrics.purchaseCount ?? 0);

  // reviews + images
  const reviews = await getReviews(p.id);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-900">
          <Home className="h-4 w-4" /> Trang chủ
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/shop/products" className="hover:text-gray-900">
          Sản phẩm
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900 line-clamp-1">{p.name}</span>
        <div className="ml-auto">
          <Link
            href="/shop/products"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
        {p.name}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gallery + description + reviews */}
        <div className="lg:col-span-2">
          {/* Gallery */}
          <div className="relative">
            <GallerySlider images={p.images} fallback={cover} />
            {outOfStock && (
              <>
                <div className="absolute inset-0 rounded-xl bg-black/30" aria-hidden />
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center rounded-full bg-gray-900/80 px-4 py-1.5 text-sm font-semibold text-white">
                    Hết hàng
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {p.description && (
            <article className="prose prose-blue max-w-none mt-6">
              <p>{p.description}</p>
            </article>
          )}

          {/* Related carousel pinned near footer */}
          <div className="mt-8">
            <RelatedCarousel
              items={related}
              viewAllHref={`/shop/products?type=${p.type?.slug ?? ""}`}
            />
          </div>

          {/* Reviews */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Đánh giá ({ratingCount})</h3>
              {purchaseCount > 0 && (
                <div className="text-sm text-gray-500 inline-flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  {purchaseCount.toLocaleString()} lượt mua
                </div>
              )}
            </div>

            {/* summary rating */}
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={ratingAvg} />
              <div className="text-sm text-gray-700">
                {ratingAvg ? ratingAvg.toFixed(1) : "0.0"} / 5
                <span className="text-gray-400"> ({ratingCount} lượt đánh giá)</span>
              </div>
            </div>

            {/* list reviews */}
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((rv: ReviewDTO) => {
                  const displayName =
                    rv.user?.email?.split?.("@")?.[0] ?? "Khách hàng";
                  return (
                    <li key={rv.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StarRating value={rv.rating} size={14} />
                          <span className="text-sm font-medium">{displayName}</span>
                        </div>
                        <span className="text-xs text-gray-500">{fmtDate(rv.createdAt)}</span>
                      </div>

                      {/* content */}
                      {(rv.feedback || rv.description) && (
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                          {rv.feedback || rv.description}
                        </p>
                      )}

                      {/* images */}
                      {rv.images?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {rv.images.map((im: ReviewDTO["images"][number]) => (
                            <a
                              key={im.id}
                              href={im.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-lg border"
                              title={im.alt ?? ""}
                            >
                              <Image
                                src={im.url}
                                alt={im.alt ?? ""}
                                width={300}
                                height={200}
                                className="h-28 w-full object-contain bg-white"
                                loading="lazy"
                                unoptimized
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* reply */}
                      {rv.reply && (
                        <div className="mt-3 rounded-lg bg-gray-50 border p-3 text-sm">
                          <div className="font-medium text-gray-700">Phản hồi từ AHSO</div>
                          <div className="mt-1 text-gray-700 whitespace-pre-line">{rv.reply}</div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar info */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Thông tin</h3>
            <dl className="mt-3 text-sm text-gray-700 space-y-1">
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-24">SKU</dt>
                <dd className="flex-1 truncate">{p.sku}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-24">Thương hiệu</dt>
                <dd className="flex-1 truncate">{p.brand?.name ?? "—"}</dd>
              </div>
              {!requiresQuote && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 min-w-24">Tình trạng</dt>
                  <dd className={`flex-1 ${inStock ? "text-emerald-600" : "text-rose-600"}`}>
                    {inStock ? "Còn hàng" : "Hết hàng"}
                  </dd>
                </div>
              )}

              {/* rating summary ngắn trong sidebar */}
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-24">Đánh giá</dt>
                <dd className="flex-1 flex items-center gap-2">
                  <StarRating value={ratingAvg} size={14} />
                  <span className="text-xs text-gray-600">
                    {ratingAvg ? ratingAvg.toFixed(1) : "0.0"} ({ratingCount})
                  </span>
                </dd>
              </div>

              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-24">Lượt mua</dt>
                <dd className="flex-1 text-gray-700">
                  {purchaseCount.toLocaleString()}
                </dd>
              </div>

              <div className="flex flex-col gap-1 text-gray-700">
                <dt className="text-gray-500 text-sm">Giá</dt>
                <dd>
                  {requiresQuote ? (
                    <span className="text-base font-semibold text-amber-700">
                      Liên hệ báo giá
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {showSavings && (
                        <div className="text-sm text-gray-400 line-through">
                          {listPrice.toLocaleString()} {p.currency ?? ""}
                        </div>
                      )}
                      <div className="text-2xl font-bold text-gray-900">
                        {price.toLocaleString()} {p.currency ?? "VND"}
                      </div>
                      {showSavings && (
                        <div className="text-xs text-rose-600">
                          Tiết kiệm {savingsPercent}% (
                          {savings.toLocaleString()} {p.currency ?? "VND"})
                        </div>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex gap-2">
              {requiresQuote ? (
                <QuoteRequestButton
                  productId={p.id}
                  productName={p.name}
                  productSku={p.sku}
                  productSlug={p.slug}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
                />
              ) : (
                <>
                  <AddToCartClient
                    sku={p.sku}
                    name={p.name}
                    image={cover}
                    disabled={outOfStock}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold shadow ${
                      outOfStock
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  />
                  <Link href="/contact" className="rounded-md border px-4 py-2 text-sm">
                    Liên hệ
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Specs */}
          {p.specs.length > 0 && (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Thông số kỹ thuật</h3>
              <dl className="mt-3 text-sm text-gray-700 space-y-1">
                {p.specs
                  .map((spec: ProductWithRelations["specs"][number]) => {
                    const label =
                      spec.specDefinition?.name || spec.specDefinition?.slug || "—";
                    const value = fmtSpec(spec);
                    return value ? { label, value } : null;
                  })
                  .filter(
                    (
                      row: { label: string; value: string } | null
                    ): row is { label: string; value: string } => Boolean(row)
                  )
                  .map((row: { label: string; value: string }, i: number) => (
                    <div key={i} className="flex gap-2">
                      <dt className="text-gray-500 min-w-28">{row.label}</dt>
                      <dd className="flex-1">{row.value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
