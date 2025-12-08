-- CreateEnum
CREATE TYPE "stock_transaction_type" AS ENUM ('ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'DAMAGED', 'RETURNED');

-- CreateEnum
CREATE TYPE "financial_transaction_type" AS ENUM ('INCOME', 'EXPENSE', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "stocktransaction" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "stock_transaction_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "orderCode" TEXT,
    "userId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "stocktransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financialtransaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "financial_transaction_type" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "costAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "orderCode" TEXT,
    "paymentId" TEXT,
    "userId" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "financialtransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailysummary" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "orderCompleted" INTEGER NOT NULL DEFAULT 0,
    "orderCancelled" INTEGER NOT NULL DEFAULT 0,
    "productsSold" INTEGER NOT NULL DEFAULT 0,
    "uniqueProducts" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "returningCustomers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dailysummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockTransaction_product_date_idx" ON "stocktransaction"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransaction_orderId_idx" ON "stocktransaction"("orderId");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "stocktransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_createdAt_idx" ON "stocktransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "financialtransaction_code_key" ON "financialtransaction"("code");

-- CreateIndex
CREATE INDEX "FinancialTransaction_code_idx" ON "financialtransaction"("code");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_idx" ON "financialtransaction"("type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_category_idx" ON "financialtransaction"("category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_orderId_idx" ON "financialtransaction"("orderId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_createdAt_idx" ON "financialtransaction"("createdAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_idx" ON "financialtransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dailysummary_date_key" ON "dailysummary"("date");

-- CreateIndex
CREATE INDEX "DailySummary_date_idx" ON "dailysummary"("date");

-- AddForeignKey
ALTER TABLE "stocktransaction" ADD CONSTRAINT "stocktransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktransaction" ADD CONSTRAINT "stocktransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financialtransaction" ADD CONSTRAINT "financialtransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
