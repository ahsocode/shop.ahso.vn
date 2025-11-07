import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

/** Lấy object từ URLSearchParams (đơn giản hóa cho Zod.parse) */
export function paramsToObject(searchParams: URLSearchParams) {
  const obj: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) obj[k] = v;
  return obj;
}

/** Parse + trả lỗi 400 nếu không hợp lệ */
export function parseOr400<T>(schema: ZodSchema<T>, data: unknown) {
  const r = schema.safeParse(data);
  if (!r.success) {
    return { ok: false as const, res: NextResponse.json({ errors: r.error.flatten() }, { status: 400 }) };
  }
  return { ok: true as const, data: r.data };
}

/** Trả response chuẩn phân trang */
export function ok<T>(data: T, meta?: { page?: number; pageSize?: number; total?: number }) {
  return NextResponse.json({ data, meta });
}
