import { NextRequest, NextResponse } from 'next/server';
import { PublishStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// ---------------- GET ----------------
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> } // Next 16: params là Promise
) {
  try {
    const { slug } = await ctx.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            summary: true,
          },
        },
        type: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            coverImage: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                coverImage: true,
              },
            },
          },
        },
        categoryLinks: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                coverImage: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            symbol: true,
            dimension: true,
          },
        },
        quantityUnit: {
          select: {
            id: true,
            name: true,
            symbol: true,
            dimension: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        specs: {
          include: { specDefinition: { select: { id: true, name: true, slug: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

   // Lấy reviews của sản phẩm (sửa 'name' -> bỏ, chỉ giữ id + email)
const reviewsRaw = await prisma.review.findMany({
  where: { productId: product.id },
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    rating: true,
    feedback: true,
    description: true,
    reply: true,
    createdAt: true,
    images: {
      select: { id: true, url: true, alt: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    },
    user: { select: { id: true, email: true } }, // ✅ KHÔNG còn 'name'
  },
});

// Chuẩn hóa dữ liệu user (tạo displayName từ email nếu cần)
const reviews = reviewsRaw.map((r) => ({
  id: r.id,
  rating: r.rating,
  feedback: r.feedback,
  description: r.description,
  reply: r.reply,
  createdAt: r.createdAt,
  images: r.images,
  user: r.user
    ? {
        id: r.user.id,
        email: r.user.email,
        displayName:
          (r.user.email?.split?.("@")[0] ?? "Khách") as string, // "tenhienthi" từ email
      }
    : null,
}));


    // Related products
    const relatedProducts = await prisma.product.findMany({
      where: {
        AND: [
          { id: { not: product.id } },
          { status: PublishStatus.PUBLISHED },
          { OR: [{ typeId: product.typeId }, { brandId: product.brandId }] },
        ],
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { name: true, slug: true } },
        type: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        ratingAvg: product.ratingAvg ?? 0,
        ratingCount: product.ratingCount ?? 0,
        purchaseCount: product.purchaseCount ?? 0,
        reviews,
        relatedProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


// ---------------- PATCH ----------------
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> } // ⬅️ Promise
) {
  try {
    const { slug } = await ctx.params; // ⬅️ await
    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // SKU conflict
    if (body.sku && body.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (skuConflict) {
        return NextResponse.json(
          { success: false, error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Slug conflict
    if (body.slug && body.slug !== existingProduct.slug) {
      const slugConflict = await prisma.product.findUnique({ where: { slug: body.slug } });
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'Product with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { slug },
      data: {
        name: body.name,
        slug: body.slug,
        sku: body.sku,
        description: body.description,
        coverImage: body.coverImage,
        price: body.price,
        listPrice: body.listPrice,
        currency: body.currency,
        taxIncluded: body.taxIncluded,
        stockOnHand: body.stockOnHand,
        stockReserved: body.stockReserved,
        weightGrams: body.weightGrams,
        lengthMm: body.lengthMm,
        widthMm: body.widthMm,
        heightMm: body.heightMm,
        typeId: body.typeId,
        brandId: body.brandId,
        unitId: body.unitId,
        quantityValue: body.quantityValue,
        quantityUnitId: body.quantityUnitId,
        quantityLabel: body.quantityLabel,
        minOrderQty: body.minOrderQty,
        stepQty: body.stepQty,
        status: body.status,
        publishAt: body.publishAt,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
      },
      include: {
        brand: true,
        type: { include: { category: true } },
        unit: true,
        quantityUnit: true,
        images: { orderBy: { sortOrder: 'asc' } },
        specs: { include: { specDefinition: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ---------------- DELETE ----------------
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> } // ⬅️ Promise
) {
  try {
    const { slug } = await ctx.params; // ⬅️ await

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const cartItemCount = await prisma.cartItem.count({
      where: {
        productId: existingProduct.id,
        cart: { status: { in: ['ACTIVE', 'CHECKOUT'] } },
      },
    });
    if (cartItemCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete product that is in active carts' },
        { status: 409 }
      );
    }

    await prisma.product.delete({ where: { slug } });
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
