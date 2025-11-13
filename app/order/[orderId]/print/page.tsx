// app/order/[orderId]/print/page.tsx
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { OrderDetailDTO } from "@/dto/order.dto";
import InvoicePrint from "./invoice-print";


export default async function OrderPrintPage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;

  const hdrs = await headers();
  const host = hdrs.get("host");
  if (!host) return notFound();
  const protocol = hdrs.get("x-forwarded-proto") ?? "http";
  const base = `${protocol}://${host}`;

  const res = await fetch(`${base}/api/orders/${orderId}`, {
    cache: "no-store",
    headers: {
      cookie: hdrs.get("cookie") ?? "",
    },
  });

  if (res.status === 401 || res.status === 403) {
    // không cho in nếu chưa login
    redirect(`/login?redirect=/order/${orderId}/print`);
  }
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(`Failed to load order ${orderId} for print: ${res.status}`);
  }

  const data = (await res.json()) as OrderDetailDTO;

  return <InvoicePrint order={data} />;
}
