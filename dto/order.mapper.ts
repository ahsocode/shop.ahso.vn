// dto/order.mapper.ts
import type { OrderListItemDTO, OrderDetailDTO } from "../dto/order.dto";

// Kiểu Entity tối thiểu (tránh phụ thuộc trực tiếp @prisma/client ở đây):
type OrderEntityMinimal = {
  id: string;
  code: string;
  createdAt: Date;
  status: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingMethod?: string | null;
  shippingFee?: number | null;
  note?: string | null;

  cancelRequestReason?: string | null;
  cancelReason?: string | null;

  subtotal?: number | null;
  discountTotal?: number | null;
  taxTotal?: number | null;
  grandTotal?: number | null;
};

type OrderItemEntityMinimal = {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
};

type AddressEntityMinimal = {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null; // district/state
  province?: string | null;
};

type PaymentEntityMinimal = {
  method: string;
  amount: number;
} | null;

export function toOrderListItemDTO(
  order: OrderEntityMinimal,
  items: OrderItemEntityMinimal[],
): OrderListItemDTO {
  const subtotalFromItems = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = order.subtotal ?? subtotalFromItems;

  const shippingFee = order.shippingFee ?? 0;
  const total = order.grandTotal ?? subtotal + shippingFee;

  return {
    id: order.id,
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    total,
    status: order.status as OrderListItemDTO["status"],
  };
}
// mappers/order.mapper.ts
export function toOrderDetailDTO(params: {
  order: OrderEntityMinimal;
  items: OrderItemEntityMinimal[];
  address: AddressEntityMinimal | null;
  payment: PaymentEntityMinimal;
}): OrderDetailDTO {
  const { order, items, address, payment } = params;

  const subtotalFallback = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotal = order.subtotal ?? subtotalFallback;
  const discountTotal = order.discountTotal ?? 0;
  const taxTotal = order.taxTotal ?? 0;
  const shippingFee = order.shippingFee ?? 0;
  const grandTotal = order.grandTotal ?? subtotal - discountTotal + taxTotal + shippingFee;

  return {
    id: order.id,
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    status: order.status as OrderDetailDTO["status"],
    customer: {
      name: order.customerName,
      email: order.customerEmail ?? undefined,
      phone: order.customerPhone ?? undefined,
    },
    shippingAddress: address
      ? {
          line1: address.line1,
          line2: address.line2 ?? undefined,
          city: address.city,
          district: address.state ?? undefined,
          province: address.province ?? undefined,
        }
      : undefined,
    payment: payment
      ? {
          method: payment.method || "cod",
          paidAmount: payment.amount ?? 0,
        }
      : {
          method: "cod",
          paidAmount: 0,
        },
    shipping: {
      method: order.shippingMethod ?? "standard",
      fee: shippingFee,
    },
    items: items.map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.quantity,
      price: i.price,
      image: i.image,
    })),
    note: order.note ?? undefined,

    cancelRequestReason: order.cancelRequestReason ?? null,
    cancelReason: order.cancelReason ?? null,

    pricing: {
      subtotal,
      discountTotal,
      taxTotal,
      shippingFee,
      grandTotal,
    },
  };
}

