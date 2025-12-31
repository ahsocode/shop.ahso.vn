import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

function toInt(value: string | null, def: number) {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

async function ensureUniqueSlug(base: string) {
  let slug = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.solution.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildMetaDescription(summary: string, bodyHtml: string) {
  const base = summary.trim() || stripHtml(bodyHtml);
  return base.slice(0, 160);
}

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const categoryId = (searchParams.get("categoryId") || "").trim();
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 20);

    const where = {
      ...(q && {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
          { usecase: { contains: q } },
        ],
      }),
      ...(status && { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" }),
      ...(categoryId && { categoryId }),
    };

    const [total, rows] = await Promise.all([
      prisma.solution.count({ where }),
      prisma.solution.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          status: true,
          coverImage: true,
          industry: true,
          usecase: true,
          categoryId: true,
          publishedAt: true,
          updatedAt: true,
          solutioncategory: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: rows,
      meta: { total, page, pageSize },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const summary = String(body?.summary || "").trim();
    const coverImage = String(body?.coverImage || "").trim();
    const bodyHtml = String(body?.bodyHtml || "");
    const industry = String(body?.industry || "").trim();
    const usecase = String(body?.usecase || "").trim();
    const status = (body?.status || "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED";
    const categoryId = String(body?.categoryId || "").trim();
    const slugInput = String(body?.slug || "").trim();
    const metaTitleInput = String(body?.metaTitle || "").trim();
    const metaDescriptionInput = String(body?.metaDescription || "").trim();
    const canonicalUrl = String(body?.canonicalUrl || "").trim();

    if (!title || !categoryId || !bodyHtml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseSlug = slugInput || slugify(title);
    const slug = await ensureUniqueSlug(baseSlug);
    const now = new Date();
    const publishedAt =
      status === "PUBLISHED" ? (body?.publishedAt ? new Date(body.publishedAt) : now) : null;

    const metaTitle = metaTitleInput || title;
    const metaDescription =
      metaDescriptionInput || buildMetaDescription(summary, bodyHtml);

    const created = await prisma.solution.create({
      data: {
        id: randomUUID(),
        title,
        slug,
        summary: summary || null,
        coverImage: coverImage || null,
        bodyHtml,
        industry: industry || null,
        usecase: usecase || null,
        status,
        publishedAt,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        canonicalUrl: canonicalUrl || null,
        categoryId,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
