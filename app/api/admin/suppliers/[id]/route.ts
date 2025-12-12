import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import {
  SupplierUpdateSchema,
  supplierSelect,
  mapSupplierRow,
} from "../utils";

const hasOwn = <T extends object, K extends keyof T>(obj: T, key: K): obj is T & Required<Pick<T, K>> =>
  Object.prototype.hasOwnProperty.call(obj, key);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const row = await prisma.supplier.findUnique({ where: { id }, select: supplierSelect });
    if (!row) return jsonError("Not Found", 404);
    return jsonOk({ data: mapSupplierRow(row) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const sanitized = { ...body };
    for (const key of ["contactPerson", "email", "phone", "address", "paymentTerms", "notes"]) {
      if (sanitized[key] === null) sanitized[key] = undefined;
    }
    const parsed = SupplierUpdateSchema.safeParse(sanitized);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) return jsonError("Không có dữ liệu cần cập nhật", 400);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return jsonError("Not Found", 404);

    const data: Prisma.supplierUpdateInput = {};

    if (updates.name) data.name = updates.name;

    const slugProvided = hasOwn(updates, "slug");
    const explicitSlug = slugProvided ? (updates.slug ?? "").trim() : undefined;
    let slugCandidate: string | undefined;
    if (explicitSlug && explicitSlug !== existing.slug) {
      slugCandidate = explicitSlug;
    } else {
      let baseName: string | undefined;
      if (typeof updates.name === "string") {
        baseName = updates.name;
      } else if (slugProvided && !explicitSlug) {
        baseName = existing.name ?? undefined;
      }
      if (baseName) {
        const auto = slugify(baseName);
        if (auto && auto !== existing.slug) slugCandidate = auto;
      }
    }

    if (slugCandidate && slugCandidate !== existing.slug) {
      const dup = await prisma.supplier.findFirst({ where: { slug: slugCandidate, id: { not: id } }, select: { id: true } });
      if (dup) return jsonError("Slug đã tồn tại", 409);
      data.slug = slugCandidate;
    }

    if (hasOwn(updates, "code")) {
      const finalCode = updates.code ? updates.code : null;
      if (finalCode !== existing.code) {
        if (finalCode) {
          const dup = await prisma.supplier.findFirst({ where: { code: finalCode, id: { not: id } }, select: { id: true } });
          if (dup) return jsonError("Mã nhà cung cấp đã tồn tại", 409);
        }
      }
      data.code = finalCode;
    }

    if (hasOwn(updates, "contactPerson")) data.contactPerson = updates.contactPerson ?? null;
    if (hasOwn(updates, "email")) data.email = updates.email ?? null;
    if (hasOwn(updates, "phone")) data.phone = updates.phone ?? null;
    if (hasOwn(updates, "address")) data.address = updates.address ?? null;
    if (hasOwn(updates, "taxCode")) data.taxCode = updates.taxCode ?? null;
    if (hasOwn(updates, "paymentTerms")) data.paymentTerms = updates.paymentTerms ?? null;
    if (hasOwn(updates, "minOrderValue")) data.minOrderValue = updates.minOrderValue ?? null;
    if (hasOwn(updates, "shippingFee")) data.shippingFee = updates.shippingFee ?? null;
    if (hasOwn(updates, "rating")) data.rating = updates.rating;
    if (hasOwn(updates, "notes")) data.notes = updates.notes ?? null;
    if (hasOwn(updates, "isActive")) data.isActive = updates.isActive ?? true;

    const updated = await prisma.supplier.update({
      where: { id },
      data,
      select: supplierSelect,
    });

    return jsonOk({ data: mapSupplierRow(updated) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    await prisma.supplier.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
