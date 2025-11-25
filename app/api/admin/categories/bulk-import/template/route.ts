import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const lines = [
    "name,slug,description,coverImage",
    '"Danh mục 1","danh-muc-1","Mô tả ngắn cho danh mục 1",""',
    '"Danh mục 2","danh-muc-2","Mô tả ngắn cho danh mục 2",""',
    '"Danh mục 3","danh-muc-3","Mô tả ngắn cho danh mục 3",""',
  ];

  const csvContent = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="category_template.csv"',
    },
  });
}
