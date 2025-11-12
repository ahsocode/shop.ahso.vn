import { NextResponse, NextRequest } from "next/server";

/** -------------------------------------------------
 * Response helpers
 * --------------------------------------------------*/
type InitLike = number | ResponseInit | undefined;

function toResponseInit(init?: InitLike): ResponseInit | undefined {
  if (typeof init === "number") return { status: init };
  return init;
}

export function jsonOk(data: any, init?: InitLike) {
  return NextResponse.json(data, toResponseInit(init));
}

export function jsonError(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

/** -------------------------------------------------
 * URL & paging helpers
 * --------------------------------------------------*/

/**
 * Hỗ trợ truyền vào NextRequest | URL | string.
 * Đọc `page`, `pageSize` từ query, normalize, và trả về skip/take.
 * - defaultPage = 1
 * - defaultPageSize = 20
 * - maxPageSize = 100 (chặn lố)
 */
export function parsePaging(
  input: NextRequest | URL | string,
  opts?: { defaultPage?: number; defaultPageSize?: number; maxPageSize?: number }
) {
  const defaultPage = opts?.defaultPage ?? 1;
  const defaultPageSize = opts?.defaultPageSize ?? 20;
  const maxPageSize = opts?.maxPageSize ?? 100;

  const url =
    input instanceof URL
      ? input
      : typeof input === "string"
      ? // base bắt buộc cho URL từ string trần
        new URL(input, "http://localhost")
      : new URL(input.url);

  const sp = url.searchParams;

  const pageRaw = sp.get("page") || "1";
  const psRaw =
    sp.get("pageSize") ||
    sp.get("limit") || // compat
    String(defaultPageSize);

  let page = Math.max(1, parseInt(pageRaw, 10) || defaultPage);
  let pageSize = Math.max(1, Math.min(maxPageSize, parseInt(psRaw, 10) || defaultPageSize));

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

/** Lấy nhanh param chuỗi (ví dụ q) ở dạng đã trim */
export function getQueryParam(
  input: NextRequest | URL | string,
  key: string,
  fallback = ""
) {
  const url =
    input instanceof URL
      ? input
      : typeof input === "string"
      ? new URL(input, "http://localhost")
      : new URL(input.url);
  return (url.searchParams.get(key) || fallback).trim();
}
