// app/api/staff/contacts/[id]/route.ts
import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { contact_status } from "@prisma/client";

const UpdateSchema = z.object({
  status: z.nativeEnum(contact_status).optional(),
  response: z.string().trim().max(10_000).optional(),
  internalNotes: z.string().trim().max(10_000).optional(),
});

const contactSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  company: true,
  subject: true,
  message: true,
  status: true,
  priority: true,
  assignedTo: true,
  response: true,
  respondedAt: true,
  respondedBy: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  contacttype: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      select: contactSelect,
    });

    if (!contact) {
      return jsonError("Không tìm thấy yêu cầu liên hệ", 404);
    }

    return jsonOk({ data: contact });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const updates = parsed.data;
    if (!Object.keys(updates).length) {
      return jsonError("Không có dữ liệu cần cập nhật", 400);
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.status) data.status = updates.status;
    if (updates.response !== undefined) {
      const trimmed = updates.response.trim();
      data.response = trimmed || null;
      data.respondedAt = trimmed ? new Date() : null;
      data.respondedBy = trimmed ? me.sub : null;
    }
    if (updates.internalNotes !== undefined) {
      data.internalNotes = updates.internalNotes.trim() || null;
    }

    const updated = await prisma.contact.update({
      where: { id },
      data,
      select: contactSelect,
    });

    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
