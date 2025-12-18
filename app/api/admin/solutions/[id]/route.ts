import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

async function ensureUniqueSlug(base: string, excludeId: string) {
  let slug = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.solution.findFirst({
      where: { slug, NOT: { id: excludeId } },
      select: { id: true },
    });
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
    const row = await prisma.solution.findUnique({
      where: { id },
      include: { solutioncategory: { select: { id: true, name: true } } },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
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

    const existing = await prisma.solution.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const baseSlug = slugInput || existing.slug || slugify(title);
    const slug =
      slugInput && slugInput !== existing.slug
        ? await ensureUniqueSlug(baseSlug, id)
        : baseSlug;
    const now = new Date();
    const publishedAt =
      status === "PUBLISHED" ? (body?.publishedAt ? new Date(body.publishedAt) : now) : null;

    const metaTitle = metaTitleInput || title;
    const metaDescription =
      metaDescriptionInput || buildMetaDescription(summary, bodyHtml);

    const updated = await prisma.solution.update({
      where: { id },
      data: {
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
        updatedAt: now,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
    await prisma.solution.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
