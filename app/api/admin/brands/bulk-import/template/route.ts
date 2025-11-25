import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Header
  const lines = [
    "name,slug,summary,logoUrl",
    // Dòng ví dụ giả, không phải dữ liệu thật
    '"Thương hiệu 1","thuong-hieu-1","Mô tả ngắn cho thương hiệu 1",""',
    '"Thương hiệu 2","thuong-hieu-2","Mô tả ngắn cho thương hiệu 2",""',
    '"Thương hiệu 3","thuong-hieu-3","Mô tả ngắn cho thương hiệu 3",""',
  ];

  // Thêm BOM để Excel hiểu đúng UTF-8 + dùng CRLF cho chắc
  const csvContent = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brand_template.csv"',
    },
  });
}
