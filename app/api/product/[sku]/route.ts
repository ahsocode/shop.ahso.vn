import { NextRequest, NextResponse } from "next/server";

// Temporary mock detail API using the same SKUs as /api/search/products
const MOCKS: Record<string, any> = {
  "PLC-S71200": {
    sku: "PLC-S71200",
    name: "PLC Siemens S7-1200",
    brand: "Siemens",
    category: "PLC",
    price: 450,
    inStock: true,
    coverImage: "/factory1.jpg",
    images: [
      { url: "/factory1.jpg", alt: "PLC Siemens S7-1200" },
      { url: "/factory2.jpg", alt: "PLC Siemens S7-1200" },
    ],
    descriptionHtml:
      "<p>PLC Siemens S7-1200 phù hợp cho các ứng dụng tự động hóa quy mô nhỏ và vừa.</p>\n<ul><li>CPU mạnh mẽ</li><li>Tích hợp I/O</li><li>Giao tiếp Ethernet</li></ul>",
    specs: [
      { k: "Nguồn", v: "24VDC" },
      { k: "Số I/O", v: "14 DI, 10 DO" },
      { k: "Giao tiếp", v: "Ethernet, Modbus" },
    ],
  },
  "SNS-OMR-E2E": {
    sku: "SNS-OMR-E2E",
    name: "Cảm biến tiệm cận Omron E2E",
    brand: "Omron",
    category: "Sensor",
    price: 12,
    inStock: false,
    coverImage: "/linhkien1.jpg",
    images: [
      { url: "/linhkien1.jpg", alt: "Omron E2E" },
      { url: "/factory3.jpg", alt: "Omron E2E" },
    ],
    descriptionHtml:
      "<p>Dòng cảm biến tiệm cận Omron E2E bền bỉ và chính xác, phù hợp nhiều môi trường.</p>",
    specs: [
      { k: "Khoảng cách", v: "2mm" },
      { k: "Cấp bảo vệ", v: "IP67" },
    ],
  },
  "DRV-SCH-ATV": {
    sku: "DRV-SCH-ATV",
    name: "Biến tần Schneider ATV",
    brand: "Schneider",
    category: "Inverter",
    price: 250,
    inStock: true,
    coverImage: "/factory4.jpg",
    images: [
      { url: "/factory4.jpg", alt: "Schneider ATV" },
      { url: "/factory2.jpg", alt: "Schneider ATV" },
    ],
    descriptionHtml:
      "<p>Biến tần Schneider ATV cho điều khiển động cơ hiệu quả, tiết kiệm năng lượng.</p>",
    specs: [
      { k: "Công suất", v: "3kW" },
      { k: "Điện áp", v: "380VAC" },
    ],
  },
};

export async function GET(_req: NextRequest, context: { params: Promise<{ sku: string }> }) {
  try {
    const { sku } = await context.params;
    const item = MOCKS[sku];
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (e) {
    console.error("GET /api/product/[sku] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

