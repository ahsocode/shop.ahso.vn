import { NextResponse } from "next/server";
import { paramsToObject, parseOr400, ok } from "@/lib/api-helpers";
import { SearchSoftwareDTO } from "@/dto/search-software.dto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = paramsToObject(searchParams);
  const parsed = parseOr400(SearchSoftwareDTO, input);
  if (!parsed.ok) return parsed.res;

  const { q, service, stack, page, pageSize } = parsed.data;

  // TODO: Thay bằng Prisma/ES query thực
  const mock = [
    { id: "sw-001", name: "MES Suite A", services: ["implementation", "maintenance"], stack: ["MES"] },
    { id: "sw-002", name: "ERP Cloud B", services: ["integration", "training"], stack: ["ERP"] },
    { id: "sw-003", name: "CMMS X", services: ["implementation"], stack: ["CMMS"] },
  ].filter(x =>
    x.name.toLowerCase().includes(q.toLowerCase()) &&
    (!service || x.services.includes(service)) &&
    (!stack || x.stack.map(s => s.toLowerCase()).includes(stack.toLowerCase()))
  );

  const start = (page - 1) * pageSize;
  const paged = mock.slice(start, start + pageSize);

  return ok(paged, { page, pageSize, total: mock.length });
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}
