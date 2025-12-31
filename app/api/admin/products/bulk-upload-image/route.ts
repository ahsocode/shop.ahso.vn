import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadProductImageToCloudinary } from "@/lib/cloudinary";
import { randomUUID } from "crypto";
import { jsonError, toHttpError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const formData = await req.formData();
    const productIdsRaw = formData.getAll("productIds").filter(Boolean);
    const filesRaw = formData.getAll("files");
    const singleFile = formData.get("file");
    const alt = formData.get("alt")?.toString() ?? null;
    const coverIndexRaw = formData.get("coverIndex")?.toString();
    const coverMode =
      formData.get("coverMode")?.toString() === "overwrite" ? "overwrite" : "missing";
    const skipCover = formData.get("skipCover")?.toString() === "1";

    if (!productIdsRaw.length) {
      return jsonError("Missing productIds", 400);
    }
    const files =
      filesRaw.length > 0
        ? filesRaw.filter((item): item is File => item instanceof File)
        : singleFile instanceof File
          ? [singleFile]
          : [];

    if (!files.length) return jsonError("Missing file", 400);

    const uniqueIds = Array.from(new Set(productIdsRaw.map((id) => String(id))));
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        sku: true,
        coverImage: true,
        producttype: {
          select: {
            slug: true,
            productcategory: { select: { slug: true } },
          },
        },
      },
    });

    if (!products.length) {
      return jsonError("No matching products found", 404);
    }

    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        file,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );
    const coverIndex =
      coverIndexRaw !== undefined && coverIndexRaw !== null
        ? Number(coverIndexRaw)
        : null;
    const coverSelected =
      coverIndex !== null &&
      Number.isInteger(coverIndex) &&
      coverIndex >= 0 &&
      coverIndex < fileBuffers.length;

    const uploads = await Promise.all(
      products.map(async (product) => {
        const maxExistingOrder = await prisma.productimage.aggregate({
          where: { productId: product.id },
          _max: { sortOrder: true },
        });
        const nextSortOrder = (maxExistingOrder._max.sortOrder ?? 0) + 1;

        const now = new Date();
        const createdImages: Awaited<
          ReturnType<typeof prisma.productimage.create>
        >[] = [];

        for (const [idx, entry] of fileBuffers.entries()) {
          const sortOrder = nextSortOrder + idx;
          const { secureUrl } = await uploadProductImageToCloudinary({
            buffer: entry.buffer,
            productId: product.id,
            sku: product.sku,
            categorySlug: product.producttype?.productcategory?.slug,
            productTypeSlug: product.producttype?.slug,
            fileName: entry.file.name,
            type: "gallery",
            sequence: sortOrder,
          });

          const img = await prisma.productimage.create({
            data: {
              id: randomUUID(),
              productId: product.id,
              url: secureUrl,
              alt,
              sortOrder,
              createdAt: now,
              updatedAt: now,
            },
          });
          createdImages.push(img);
        }

        if (!skipCover) {
          const coverCandidate = coverSelected ? createdImages[coverIndex] : createdImages[0];
          if (coverCandidate) {
            const shouldOverwrite = coverMode === "overwrite";
            if (shouldOverwrite || !product.coverImage) {
              await prisma.product.update({
                where: { id: product.id },
                data: {
                  coverImage: coverCandidate.url,
                  updatedAt: now,
                },
              });
            }
          }
        }

        return createdImages;
      }),
    );

    const flattened = uploads.flat();
    return NextResponse.json(
      {
        success: true,
        uploadedProducts: products.length,
        uploadedImages: flattened.length,
        images: flattened,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
