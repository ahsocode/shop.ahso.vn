// dto/order.dto.ts
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancel_requested"   // ✅ thêm
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

export type OrderDetailDTO = {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;   // ✅ dùng OrderStatus luôn
  customer: { name: string; email?: string; phone?: string };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    district?: string;
    province?: string;
  };
  payment: {
    method: string;
    paidAmount: number;
  };
  shipping: {
    method: string;
    fee: number;
  };
  items: {
    sku: string;
    name: string;
    qty: number;
    price: number;
    image?: string | null;
  }[];
  note?: string;

  // ✅ lý do hủy / yêu cầu hủy
  cancelRequestReason?: string | null;  // user gửi yêu cầu hủy
  cancelReason?: string | null;         // staff hủy

  pricing: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingFee: number;
    grandTotal: number;
  };
};
