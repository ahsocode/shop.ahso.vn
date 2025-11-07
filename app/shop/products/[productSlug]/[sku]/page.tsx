import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Home, PackageCheck } from "lucide-react";

export const revalidate = 60;

async function getVariantBySku(variantSku: string) {
  return prisma.productVariant.findUnique({
    where: { variantSku },
    select: {
      variantSku: true,
      mpn: true,
      barcode: true,
      price: true,
      listPrice: true,
      currency: true,
      taxIncluded: true,
      stockOnHand: true,
      stockReserved: true,
      brand: { select: { name: true, slug: true } },
      specs: {
        select: { id: true, keySlug: true, label: true, valueText: true, valueNumber: true, unit: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      product: {
        select: {
          title: true,
          slug: true,
          summary: true,
          descriptionHtml: true,
          imagesCover: true,
          brand: { select: { name: true, slug: true } },
          images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
          docs: { select: { id: true, title: true, fileUrl: true, type: true } },
          categoryLinks: { select: { category: { select: { name: true, slug: true, fullSlug: true } } } },
        },
      },
    },
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ productSlug: string; sku: string }> }
): Promise<Metadata> {
  const { sku } = await params;
  const v = await getVariantBySku(decodeURIComponent(sku));
  if (!v) return { title: "Sản phẩm - Không tìm thấy" };
  const name = v.product?.title ?? v.variantSku;
  const cover = v.product?.imagesCover ?? "/logo.png";
  const brand = v.brand?.name ?? v.product?.brand?.name ?? "";
  return {
    title: `${name}${brand ? ` | ${brand}` : ""}`,
    description: `${brand} - ${v.variantSku}`,
    openGraph: { title: name, images: [{ url: cover }] },
  };
}

export default async function ProductDetailPage(
  { params }: { params: Promise<{ productSlug: string; sku: string }> }
) {
  const { sku } = await params;
  const v = await getVariantBySku(decodeURIComponent(sku));
  if (!v) notFound();

  const name = v.product?.title ?? v.variantSku;
  const coverSrc = v.product?.imagesCover ?? "/logo.png";
  const images = v.product?.images ?? [];
  const docs = v.product?.docs ?? [];
  const inStock = (v.stockOnHand ?? 0) - (v.stockReserved ?? 0) > 0;
  const price = Number(v.price ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-900">
          <Home className="h-4 w-4" /> Trang chủ
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/shop/products" className="hover:text-gray-900">
          Sản phẩm
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900 line-clamp-1">{name}</span>

        <div className="ml-auto">
          <Link href="/shop/products" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
            <Image src={coverSrc} alt={name} fill className="object-cover" />
          </div>
          {Array.isArray(images) && images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img: any, idx: number) => (
                <div key={`${img.url}-${idx}`} className="overflow-hidden rounded-xl border bg-white">
                  <img src={img.url} alt={img.alt ?? name} className="h-40 w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          <article className="prose prose-blue max-w-none mt-6">
            <div dangerouslySetInnerHTML={{ __html: v.product?.descriptionHtml || "" }} />
          </article>
        </div>

        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Thông tin</h3>
            <dl className="mt-3 text-sm text-gray-700 space-y-1">
              <div className="flex gap-2"><dt className="text-gray-500 min-w-20">Mã hàng</dt><dd className="flex-1 truncate">{v.variantSku}</dd></div>
              {v.mpn && (<div className="flex gap-2"><dt className="text-gray-500 min-w-20">MPN</dt><dd className="flex-1 truncate">{v.mpn}</dd></div>)}
              <div className="flex gap-2"><dt className="text-gray-500 min-w-20">Thương hiệu</dt><dd className="flex-1 truncate">{v.brand?.name ?? v.product?.brand?.name ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 min-w-20">Tình trạng</dt><dd className={`flex-1 truncate ${inStock ? 'text-emerald-600' : 'text-rose-600'}`}>{inStock ? 'Còn hàng' : 'Hết hàng'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 min-w-20">Giá</dt><dd className="flex-1 font-semibold">{price.toLocaleString()} {v.currency}</dd></div>
            </dl>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"><PackageCheck className="inline h-4 w-4 mr-2"/>Thêm vào giỏ</button>
              <Link href="/contact" className="rounded-md border px-4 py-2 text-sm">Liên hệ</Link>
            </div>
          </div>

          {Array.isArray(v.specs) && v.specs.length > 0 && (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Thông số kỹ thuật</h3>
              <dl className="mt-3 text-sm text-gray-700 space-y-1">
                {v.specs.map((s: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <dt className="text-gray-500 min-w-28">{s.label || s.keySlug}</dt>
                    <dd className="flex-1">{s.valueText ?? (s.valueNumber != null ? Number(s.valueNumber) : '')} {s.unit ?? ''}</dd>
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

