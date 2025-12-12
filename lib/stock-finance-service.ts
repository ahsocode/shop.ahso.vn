// lib/stock-finance-service.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { financial_transaction_type } from "@prisma/client";

/**
 * Giảm tồn kho khi đơn hàng được giao (shipped)
 */
export async function decreaseStockOnShipped(orderId: string, userId?: string) {
  return await prisma.$transaction(async (tx) => {
    // Lấy order items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderitem: true },
    });

    if (!order) throw new Error("Order not found");

    const transactions = [];

    for (const item of order.orderitem) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, stockOnHand: true, name: true },
      });

      if (!product) continue;

      const quantityBefore = product.stockOnHand;
      const quantityAfter = Math.max(0, quantityBefore - item.quantity);

      // Cập nhật tồn kho
      await tx.product.update({
        where: { id: product.id },
        data: { stockOnHand: quantityAfter },
      });

      // Ghi log stock transaction
      const stockTx = await tx.stocktransaction.create({
        data: {
          productId: product.id,
          type: "ORDER_SHIPPED",
          quantity: -item.quantity,
          quantityBefore,
          quantityAfter,
          orderId: order.id,
          orderCode: order.code,
          userId: order.userId,
          reason: `Xuất kho cho đơn hàng ${order.code}`,
          createdBy: userId,
        },
      });

      transactions.push(stockTx);
    }

    return transactions;
  });
}

/**
 * Tăng purchase count khi đơn hàng giao thành công (delivered)
 */
export async function increasePurchaseCountOnDelivered(orderId: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderitem: true },
    });

    if (!order) throw new Error("Order not found");

    let productsSold = 0;
    const touchedProducts = new Set<string>();
    for (const item of order.orderitem) {
      if (!item.productId) continue;
      productsSold += item.quantity;
      if (touchedProducts.has(item.productId)) continue;
      touchedProducts.add(item.productId);

      await tx.product.update({
        where: { id: item.productId },
        data: {
          // Lượt mua = số đơn có sản phẩm này, không phải tổng số lượng
          purchaseCount: { increment: 1 },
        },
      });
    }

    // Tạo financial transaction (doanh thu)
    const costTotal = await calculateOrderCost(tx, order.orderitem);
    const baseSubtotal =
      order.subtotal !== null && order.subtotal !== undefined
        ? Number(order.subtotal)
        : order.orderitem.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const discount = order.discountTotal !== null && order.discountTotal !== undefined ? Number(order.discountTotal) : 0;
    const revenueFromItems = Math.max(0, baseSubtotal - discount);
    const profitAmount = revenueFromItems - costTotal;

    await tx.financialtransaction.create({
      data: {
        code: await generateFinancialCode(tx),
        type: "INCOME",
        category: "sale",
        amount: revenueFromItems,
        costAmount: costTotal,
        profitAmount,
        orderId: order.id,
        orderCode: order.code,
        userId: order.userId,
        description: `Doanh thu từ đơn hàng ${order.code}`,
        status: "completed",
      },
    });

    // Cập nhật daily summary
    await updateDailySummary(tx, {
      date: order.createdAt,
      revenue: revenueFromItems,
      cost: costTotal,
      profit: profitAmount,
      productsSold,
    });
  });
}

/**
 * Hoàn kho khi đơn hàng bị hủy (sau khi đã shipped)
 */
export async function restoreStockOnCancelled(orderId: string, userId?: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderitem: true },
    });

    if (!order) throw new Error("Order not found");

    // Kiểm tra xem đã xuất kho chưa
    const existingStockTx = await tx.stocktransaction.findFirst({
      where: {
        orderId: order.id,
        type: "ORDER_SHIPPED",
      },
    });

    if (!existingStockTx) {
      // Chưa xuất kho thì không cần hoàn
      return [];
    }

    const transactions = [];

    for (const item of order.orderitem) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, stockOnHand: true, name: true },
      });

      if (!product) continue;

      const quantityBefore = product.stockOnHand;
      const quantityAfter = quantityBefore + item.quantity;

      // Hoàn lại tồn kho
      await tx.product.update({
        where: { id: product.id },
        data: { stockOnHand: quantityAfter },
      });

      // Ghi log
      const stockTx = await tx.stocktransaction.create({
        data: {
          productId: product.id,
          type: "ORDER_CANCELLED",
          quantity: item.quantity,
          quantityBefore,
          quantityAfter,
          orderId: order.id,
          orderCode: order.code,
          userId: order.userId,
          reason: `Hoàn kho do hủy đơn ${order.code}`,
          createdBy: userId,
        },
      });

      transactions.push(stockTx);
    }

    // Tạo financial transaction (hoàn tiền)
    await tx.financialtransaction.create({
      data: {
        code: await generateFinancialCode(tx),
        type: "REFUND",
        category: "refund",
        amount: order.grandTotal,
        orderId: order.id,
        orderCode: order.code,
        userId: order.userId,
        description: `Hoàn tiền đơn hàng ${order.code}`,
        status: "completed",
      },
    });

    return transactions;
  });
}

/**
 * Tính tổng giá vốn của đơn hàng
 */
async function calculateOrderCost(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string | null; quantity: number }>
): Promise<number> {
  let total = 0;

  for (const item of items) {
    if (!item.productId) continue;

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { costPrice: true },
    });

    if (product?.costPrice) {
      total += Number(product.costPrice) * item.quantity;
    }
  }

  return total;
}

/**
 * Generate mã giao dịch tài chính
 */
async function generateFinancialCode(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const prefix = "FT";
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");

  const count = await tx.financialtransaction.count({
    where: {
      code: {
        startsWith: `${prefix}-${date}`,
      },
    },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${date}-${seq}`;
}

/**
 * Cập nhật tổng kết theo ngày
 */
type DailySummaryInput = {
  date: Date;
  revenue: number;
  cost: number;
  profit: number;
  productsSold: number;
};

async function updateDailySummary(tx: Prisma.TransactionClient, input: DailySummaryInput) {
  const date = new Date(input.date);
  date.setHours(0, 0, 0, 0);

  const summary = await tx.dailysummary.findUnique({
    where: { date },
  });

  if (summary) {
    await tx.dailysummary.update({
      where: { date },
      data: {
        totalRevenue: { increment: input.revenue },
        totalCost: { increment: input.cost },
        totalProfit: { increment: input.profit },
        orderCompleted: { increment: 1 },
        productsSold: { increment: input.productsSold },
      },
    });
  } else {
    await tx.dailysummary.create({
      data: {
        date,
        totalRevenue: input.revenue,
        totalCost: input.cost,
        totalProfit: input.profit,
        orderCompleted: 1,
        productsSold: input.productsSold,
      },
    });
  }
}

/**
 * Lấy thống kê tổng quan
 */
export async function getFinancialOverview(startDate?: Date, endDate?: Date) {
  const where: Prisma.financialtransactionWhereInput = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [income, expense, summary] = await Promise.all([
    // Tổng thu
    prisma.financialtransaction.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true, profitAmount: true, costAmount: true },
      _count: true,
    }),

    // Tổng chi
    prisma.financialtransaction.aggregate({
      where: { ...where, type: { in: ["EXPENSE", "REFUND"] } },
      _sum: { amount: true },
      _count: true,
    }),

    // Daily summaries
    prisma.dailysummary.aggregate({
      where: startDate || endDate ? {
        date: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      } : undefined,
      _sum: {
        totalRevenue: true,
        totalCost: true,
        totalProfit: true,
        orderCompleted: true,
        productsSold: true,
      },
    }),
  ]);

  return {
    revenue: {
      total: Number(income._sum.amount || 0),
      cost: Number(income._sum.costAmount || 0),
      profit: Number(income._sum.profitAmount || 0),
      count: income._count,
    },
    expense: {
      total: Number(expense._sum.amount || 0),
      count: expense._count,
    },
    netProfit: Number(income._sum.profitAmount || 0) - Number(expense._sum.amount || 0),
    summary: {
      totalRevenue: Number(summary._sum.totalRevenue || 0),
      totalCost: Number(summary._sum.totalCost || 0),
      totalProfit: Number(summary._sum.totalProfit || 0),
      ordersCompleted: summary._sum.orderCompleted || 0,
      productsSold: summary._sum.productsSold || 0,
    },
  };
}

/**
 * Lấy danh sách giao dịch
 */
export async function getFinancialTransactions(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { page = 1, pageSize = 20, type, startDate, endDate } = params;

  const where: Prisma.financialtransactionWhereInput = {};
  if (type) {
    where.type = type as financial_transaction_type;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [transactions, total] = await Promise.all([
    prisma.financialtransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        order: {
          select: {
            code: true,
            customerFullName: true,
          },
        },
      },
    }),
    prisma.financialtransaction.count({ where }),
  ]);

  return {
    data: transactions.map((t) => ({
      id: t.id,
      code: t.code,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      costAmount: Number(t.costAmount),
      profitAmount: Number(t.profitAmount),
      orderCode: t.orderCode,
      customerName: t.order?.customerFullName,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Lấy lịch sử biến động tồn kho của sản phẩm
 */
export async function getProductStockHistory(productId: string, limit = 50) {
  const transactions = await prisma.stocktransaction.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    quantity: t.quantity,
    quantityBefore: t.quantityBefore,
    quantityAfter: t.quantityAfter,
    orderCode: t.orderCode,
    reason: t.reason,
    createdAt: t.createdAt.toISOString(),
  }));
}
