import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging, getQueryParam } from "@/lib/http";
import { slugify } from "@/lib/slug";
import type { Prisma } from "@prisma/client";
import {
  SupplierCreateSchema,
  mapSupplierRow,
  supplierSelect,
  buildSupplierData,
} from "./utils";

const toNumber = (value: string | null) => {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const { page, pageSize, skip, take } = parsePaging(req, { defaultPageSize: 20, maxPageSize: 100 });
    const url = new URL(req.url);
    const q = getQueryParam(req, "q");
    const statusParam = getQueryParam(req, "status", "active").toLowerCase();
    const sortByParam = getQueryParam(req, "sortBy", "createdAt").toLowerCase();
    const sortOrderParam = getQueryParam(req, "sortOrder", "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const ratingMin = toNumber(url.searchParams.get("ratingMin"));
    const ratingMax = toNumber(url.searchParams.get("ratingMax"));

    const where: Prisma.supplierWhereInput = {
      ...(q && {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { code: { contains: q } },
          { contactPerson: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { address: { contains: q } },
        ],
      }),
      ...(statusParam === "active"
        ? { isActive: true }
        : statusParam === "inactive"
        ? { isActive: false }
        : {}),
      ...((ratingMin !== null || ratingMax !== null) && {
        rating: {
          ...(ratingMin !== null ? { gte: ratingMin } : {}),
          ...(ratingMax !== null ? { lte: ratingMax } : {}),
        },
      }),
    };

    const orderByField = (() => {
      switch (sortByParam) {
        case "name":
          return "name" as const;
        case "rating":
          return "rating" as const;
        case "totalorders":
        case "orders":
          return "totalOrders" as const;
        default:
          return "createdAt" as const;
      }
    })();

    const orderBy: Prisma.supplierOrderByWithRelationInput = { [orderByField]: sortOrderParam };

    const [total, rows] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        orderBy,
        skip,
        take,
        select: supplierSelect,
      }),
    ]);

    return jsonOk({
      data: rows.map(mapSupplierRow),
      meta: { total, page, pageSize },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const body = await req.json();
    const parsed = SupplierCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const data = parsed.data;
    const finalSlug = data.slug?.trim() || slugify(data.name);
    const finalCode = data.code?.trim() || null;

    const conflict = await prisma.supplier.findFirst({
      where: {
        OR: [
          { slug: finalSlug },
          ...(finalCode ? [{ code: finalCode }] : []),
        ],
      },
      select: { id: true, slug: true, code: true },
    });
    if (conflict) {
      if (conflict.slug === finalSlug) return jsonError("Slug đã tồn tại", 409);
      if (finalCode && conflict.code === finalCode) return jsonError("Mã nhà cung cấp đã tồn tại", 409);
    }

    const created = await prisma.supplier.create({
      data: {
        id: randomUUID(),
        ...buildSupplierData({ ...data, slug: finalSlug, code: finalCode }),
      },
      select: { id: true },
    });

    const row = await prisma.supplier.findUnique({
      where: { id: created.id },
      select: supplierSelect,
    });

    return jsonOk({ data: row ? mapSupplierRow(row) : null }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
