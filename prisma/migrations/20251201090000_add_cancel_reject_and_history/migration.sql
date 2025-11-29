-- AlterTable
ALTER TABLE "order"
  ADD COLUMN "prevStatusBeforeCancel" "order_status",
  ADD COLUMN "cancelRejectReason" TEXT,
  ADD COLUMN "cancelRejectAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "orderstatushistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "order_status",
  "toStatus" "order_status" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "orderstatushistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "orderstatushistory"
ADD CONSTRAINT "orderstatushistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "orderstatushistory"("orderId");
CREATE INDEX "OrderStatusHistory_createdAt_idx" ON "orderstatushistory"("createdAt");
