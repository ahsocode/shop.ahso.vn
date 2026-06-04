import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { getContactNotificationEmail, updateContactNotificationEmail } from "@/lib/system-settings";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

const UpdateSchema = z.object({
  email: z.string().email("Email không hợp lệ."),
});

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const email = await getContactNotificationEmail();
    return jsonOk({ data: { email } });
  } catch (err) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError("Email không hợp lệ.", 400, { issues: parsed.error.issues });

    const email = await updateContactNotificationEmail(parsed.data.email);
    return jsonOk({ data: { email } });
  } catch (err) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
