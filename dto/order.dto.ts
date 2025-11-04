// dto/order.dto.ts
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderListItemDTO {
  id: string;
  code: string;        // "#AHSO-1001"
  createdAt: string;   // ISO
  customerName: string;
  total: number;       // VNĐ
  status: OrderStatus;
}

export interface OrderDetailItemDTO {
  sku: string;
  name: string;
  qty: number;
  price: number;
  image?: string | null;
}

export interface OrderDetailDTO {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  customer: { name: string; phone?: string; email?: string };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    district?: string;
    province?: string;
  };
  payment: { method: "cod" | "vnpay" | "credit" | "bank"; paidAmount: number };
  shipping: { method: string; fee: number };
  items: OrderDetailItemDTO[];
  note?: string;
}
