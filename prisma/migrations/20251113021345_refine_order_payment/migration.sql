/*
  Warnings:

  - You are about to drop the column `customerName` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `orderitem` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `payment` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(12,2)`.
  - Added the required column `customerEmail` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerFullName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grandTotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingLine1` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Made the column `shippingFee` on table `order` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `lineTotal` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `address` MODIFY `country` CHAR(2) NOT NULL DEFAULT 'VN';

-- AlterTable
ALTER TABLE `order` DROP COLUMN `customerName`,
    ADD COLUMN `billingCity` VARCHAR(191) NULL,
    ADD COLUMN `billingCountry` CHAR(2) NOT NULL DEFAULT 'VN',
    ADD COLUMN `billingLine1` VARCHAR(191) NULL,
    ADD COLUMN `billingLine2` VARCHAR(191) NULL,
    ADD COLUMN `billingPostalCode` VARCHAR(191) NULL,
    ADD COLUMN `billingState` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    ADD COLUMN `customerEmail` VARCHAR(191) NOT NULL,
    ADD COLUMN `customerFullName` VARCHAR(191) NOT NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NOT NULL,
    ADD COLUMN `customerTaxCode` VARCHAR(13) NULL,
    ADD COLUMN `discountTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `grandTotal` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `shippingCity` VARCHAR(191) NOT NULL,
    ADD COLUMN `shippingCountry` CHAR(2) NOT NULL DEFAULT 'VN',
    ADD COLUMN `shippingLine1` VARCHAR(191) NOT NULL,
    ADD COLUMN `shippingLine2` VARCHAR(191) NULL,
    ADD COLUMN `shippingPostalCode` VARCHAR(191) NULL,
    ADD COLUMN `shippingState` VARCHAR(191) NULL,
    ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `taxTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `shippingFee` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orderitem` DROP COLUMN `price`,
    ADD COLUMN `brandName` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    ADD COLUMN `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `lineTotal` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `productId` VARCHAR(191) NULL,
    ADD COLUMN `quantityLabel` VARCHAR(191) NULL,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    ADD COLUMN `unitLabel` VARCHAR(191) NULL,
    ADD COLUMN `unitPrice` DECIMAL(12, 2) NOT NULL,
    MODIFY `quantity` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `payment` DROP COLUMN `paidAt`,
    ADD COLUMN `confirmedAt` DATETIME(3) NULL,
    ADD COLUMN `customerMarkedPaidAt` DATETIME(3) NULL,
    ADD COLUMN `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `status` ENUM('pending', 'awaiting_confirmation', 'confirmed', 'failed') NOT NULL DEFAULT 'pending',
    MODIFY `amount` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `solutionimage` MODIFY `url` TEXT NOT NULL;

-- CreateIndex
CREATE INDEX `Order_status_createdAt_idx` ON `Order`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `OrderItem_productId_idx` ON `OrderItem`(`productId`);

-- CreateIndex
CREATE INDEX `OrderItem_sku_idx` ON `OrderItem`(`sku`);

-- CreateIndex
CREATE INDEX `Payment_orderId_idx` ON `Payment`(`orderId`);

-- CreateIndex
CREATE INDEX `Payment_status_idx` ON `Payment`(`status`);

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_orderId_fkey` TO `OrderItem_orderId_idx`;
