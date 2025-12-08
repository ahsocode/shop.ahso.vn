import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const lines = [
    "name,slug,categorySlug,description,coverImage",
    '"Loại 1","loai-1","danh-muc-1","Mô tả loại sản phẩm 1",""',
    '"Loại 2","loai-2","danh-muc-2","Mô tả loại sản phẩm 2",""',
    '"Loại 3","loai-3","danh-muc-1","Mô tả loại sản phẩm 3",""',
  ];

  const csvContent = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product_type_template.csv"',
    },
  });
}
