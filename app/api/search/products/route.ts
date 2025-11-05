// app/api/search/products/route.ts
import { NextResponse } from "next/server";
import { SearchProductsDTO } from "../../../../dto/search-products.dto"; // <= relative import (không dùng @)

// ---- Helpers (inline) ----
function paramsToObject(searchParams: URLSearchParams) {
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => (obj[k] = v));
  return obj;
}
function ok<T>(data: T, meta?: { page?: number; pageSize?: number; total?: number }) {
  return NextResponse.json({ data, meta });
}
// --------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = paramsToObject(searchParams);

  // parse bằng Zod DTO (q, brand, category, minPrice, maxPrice, inStock, page, pageSize)
  const parsed = SearchProductsDTO.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { q, brand, category, minPrice, maxPrice, inStock, page, pageSize } = parsed.data;

  // sort (không bắt buộc trong DTO): relevance | price_asc | price_desc | name_asc | name_desc
  const sort = (raw.sort ?? "relevance") as
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "name_asc"
    | "name_desc";

  // TODO: Thay bằng Prisma/ES query thực
  const mock = [
    { sku: "PLC-S71200",  name: "PLC Siemens S7-1200",        brand: "Siemens",   category: "PLC",      price: 450, inStock: true  },
    { sku: "SNS-OMR-E2E", name: "Cảm biến tiệm cận Omron E2E", brand: "Omron",     category: "Sensor",   price: 12,  inStock: false },
    { sku: "DRV-SCH-ATV", name: "Biến tần Schneider ATV",      brand: "Schneider", category: "Inverter", price: 250, inStock: true  },
  ].filter((x) => {
    const ql = q.toLowerCase();
    if (!x.name.toLowerCase().includes(ql) && !x.sku.toLowerCase().includes(ql)) return false;
    if (brand && x.brand.toLowerCase() !== brand.toLowerCase()) return false;
    if (category && x.category.toLowerCase() !== category.toLowerCase()) return false;
    if (typeof minPrice === "number" && x.price < minPrice) return false;
    if (typeof maxPrice === "number" && x.price > maxPrice) return false;
    if (typeof inStock === "boolean" && x.inStock !== inStock) return false;
    return true;
  });

  // sort
  const sorted = [...mock].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      default:
        return 0; // relevance: giữ nguyên
    }
  });

  // paginate
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  return ok(paged, { page, pageSize, total: sorted.length });
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}
