import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging, getQueryParam } from "@/lib/http";
import { quote_status, contact_priority } from "@/generated/enums";
import type { Prisma } from "@/generated/client";
import {
  QuoteRequestCreateSchema,
  quoteRequestSelect,
  mapQuoteRequestRow,
} from "./utils";

const statusValues = new Set(Object.values(quote_status));
const priorityValues = new Set(Object.values(contact_priority));

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toOrderField = (value: string) => {
  switch (value) {
    case "updatedAt":
      return "updatedAt" as const;
    case "status":
      return "status" as const;
    case "priority":
      return "priority" as const;
    case "validUntil":
      return "validUntil" as const;
    default:
      return "createdAt" as const;
  }
};

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const { page, pageSize, skip, take } = parsePaging(req, { defaultPageSize: 20, maxPageSize: 100 });
    const url = new URL(req.url);
    const q = getQueryParam(req, "q");
    const statusParam = getQueryParam(req, "status").toLowerCase();
    const priorityParam = getQueryParam(req, "priority").toLowerCase();
    const assignedTo = getQueryParam(req, "assignedTo");
    const productId = getQueryParam(req, "productId");
    const dateFrom = parseDate(url.searchParams.get("dateFrom"));
    const dateTo = parseDate(url.searchParams.get("dateTo"));
    const overdue = getQueryParam(req, "overdue").toLowerCase() === "true";
    const sortBy = toOrderField(getQueryParam(req, "sortBy", "createdAt"));
    const sortOrder = getQueryParam(req, "sortOrder", "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const statusFilter = statusValues.has(statusParam as quote_status) ? (statusParam as quote_status) : null;
    const where: Prisma.quoterequestWhereInput = {
      ...(q && {
        OR: [
          { code: { contains: q } },
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
          { productName: { contains: q } },
          { customerNotes: { contains: q } },
        ],
      }),
      ...(priorityValues.has(priorityParam as contact_priority)
        ? { priority: priorityParam as contact_priority }
        : {}),
      ...(assignedTo && { assignedTo }),
      ...(productId && { productId }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      }),
    };

    if (overdue) {
      where.expiresAt = { lt: new Date() };
      if (statusFilter) {
        where.status = statusFilter;
      } else {
        where.status = { in: [quote_status.pending, quote_status.quoted] };
      }
    } else if (statusFilter) {
      where.status = statusFilter;
    }

    const [total, rows] = await Promise.all([
      prisma.quoterequest.count({ where }),
      prisma.quoterequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
        select: quoteRequestSelect,
      }),
    ]);

    return jsonOk({
      data: rows.map(mapQuoteRequestRow),
      meta: { total, page, pageSize },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

class QuoteCodeError extends Error {
  constructor(code: "CODE_EXISTS" | "CODE_GENERATION_FAILED") {
    super(code);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const body = await req.json();
    const parsed = QuoteRequestCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const payload = parsed.data;
    const code = await resolveQuoteCode(payload.code ?? undefined);

    const created = await prisma.quoterequest.create({
      data: {
        id: randomUUID(),
        code,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email ?? null,
        company: payload.company ?? null,
        taxCode: payload.taxCode ?? null,
        productId: payload.productId ?? null,
        productName: payload.productName ?? null,
        quantity: payload.quantity ?? 1,
        message: payload.message ?? null,
        quotedPrice: payload.quotedPrice ?? null,
        quotedTotal: payload.quotedTotal ?? null,
        validUntil: payload.validUntil ?? null,
        paymentTerms: payload.paymentTerms ?? null,
        deliveryTerms: payload.deliveryTerms ?? null,
        status: payload.status ?? quote_status.pending,
        priority: payload.priority ?? contact_priority.normal,
        assignedTo: payload.assignedTo ?? null,
        respondedBy: payload.respondedBy ?? null,
        respondedAt: payload.respondedAt ?? null,
        customerNotes: payload.customerNotes ?? null,
        internalNotes: payload.internalNotes ?? null,
        expiresAt: payload.expiresAt ?? null,
      },
      select: { id: true },
    });

    const row = await prisma.quoterequest.findUnique({
      where: { id: created.id },
      select: quoteRequestSelect,
    });

    return jsonOk({ data: row ? mapQuoteRequestRow(row) : null }, 201);
  } catch (error) {
    if (error instanceof QuoteCodeError) {
      if (error.message === "CODE_EXISTS") return jsonError("Mã yêu cầu đã tồn tại", 409);
      return jsonError("Không thể tạo mã yêu cầu mới", 500);
    }
    if (isConflictError(error)) return jsonError("Mã yêu cầu đã tồn tại", 409);
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

const isConflictError = (error: unknown) => {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
};

const generateQuoteCode = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QR-${yyyy}${mm}${dd}-${rand}`;
};

async function resolveQuoteCode(preferred?: string): Promise<string> {
  if (preferred) {
    const exists = await prisma.quoterequest.findUnique({ where: { code: preferred }, select: { id: true } });
    if (exists) throw new QuoteCodeError("CODE_EXISTS");
    return preferred;
  }

  for (let i = 0; i < 5; i += 1) {
    const candidate = generateQuoteCode();
    const dup = await prisma.quoterequest.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!dup) return candidate;
  }
  throw new QuoteCodeError("CODE_GENERATION_FAILED");
}
