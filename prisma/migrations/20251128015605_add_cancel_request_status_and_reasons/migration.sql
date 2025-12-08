-- AlterEnum
ALTER TYPE "order_status" ADD VALUE 'cancel_requested';

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelRequestReason" TEXT;
