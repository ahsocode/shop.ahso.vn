import { NextResponse } from "next/server";

export const runtime = "nodejs";

const HEADERS = [
  "SKU",
  "Tên sản phẩm",
  "Mô tả ngắn",
  "Mô tả đầy đủ",
  "Tồn kho",
  "Giá nhập",
  "Giá bán",
  "Giá niêm yết",
  "Thông số kỹ thuật (mỗi dòng hoặc dùng | : Tên: Giá trị)",
  "Trạng thái (DRAFT/PUBLISHED/ARCHIVED)",
  "Tiền tệ (ví dụ: VND)",
];

const SAMPLE_ROWS = [
  [
    "SKU-001",
    "Máy khoan pin 10mm",
    "Máy khoan đa năng",
    "Máy khoan pin 10mm, tốc độ cao.",
    "100",
    "1000000",
    "1500000",
    "1700000",
    "Chức năng: Khoan - Vít - Búa|Dung lượng: 16V/2.0Ah|Tốc độ: 0-2000v/p|Full bộ: Máy + 2pin/2.0Ah + sạc + hộp nhựa",
    "DRAFT",
    "VND",
  ],
];

export async function GET() {
  const lines = [
    HEADERS.map(quoteCsv).join(","),
    ...SAMPLE_ROWS.map((row) => row.map(quoteCsv).join(",")),
  ];
  const content = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product_import_template.csv"',
    },
  });
}

function quoteCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
