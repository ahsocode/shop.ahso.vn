// mappers/order.mapper.ts
import type { OrderListItemDTO, OrderDetailDTO } from "../dto/order.dto";

// Kiểu Entity tối thiểu (tránh phụ thuộc trực tiếp @prisma/client ở đây):
type OrderEntityMinimal = {
  id: string;
  code: string;
  createdAt: Date;
  status: string;
  customerName: string;
  shippingMethod?: string | null;
  shippingFee?: number | null;
  note?: string | null;
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
  items: OrderItemEntityMinimal[]
): OrderListItemDTO {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + (order.shippingFee ?? 0);

  return {
    id: order.id,
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    total,
    status: order.status as OrderListItemDTO["status"],
  };
}

export function toOrderDetailDTO(params: {
  order: OrderEntityMinimal;
  items: OrderItemEntityMinimal[];
  address: AddressEntityMinimal | null;
  payment: PaymentEntityMinimal;
}): OrderDetailDTO {
  const { order, items, address, payment } = params;

  return {
    id: order.id,
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    status: order.status as OrderDetailDTO["status"],
    customer: { name: order.customerName },
    shippingAddress: address
      ? {
          line1: address.line1,
          line2: address.line2 ?? undefined,
          city: address.city,
          district: address.state ?? undefined,
          province: address.province ?? undefined,
        }
      : undefined,
    payment: {
      method: ((payment?.method as any) ?? "cod") as any,
      paidAmount: payment?.amount ?? 0,
    },
    shipping: {
      method: order.shippingMethod ?? "standard",
      fee: order.shippingFee ?? 0,
    },
    items: items.map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.quantity,
      price: i.price,
      image: i.image,
    })),
    note: order.note ?? undefined,
  };
}
