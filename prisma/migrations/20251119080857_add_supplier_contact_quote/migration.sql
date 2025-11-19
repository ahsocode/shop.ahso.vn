/*
  Warnings:

  - A unique constraint covering the columns `[saleCode]` on the table `product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `note` TEXT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `costPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `profitAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `profitMargin` DECIMAL(5, 2) NULL,
    ADD COLUMN `quoteNote` TEXT NULL,
    ADD COLUMN `reorderLevel` INTEGER NULL DEFAULT 10,
    ADD COLUMN `reorderQty` INTEGER NULL DEFAULT 50,
    ADD COLUMN `requiresQuote` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `saleCode` VARCHAR(191) NULL,
    ADD COLUMN `supplierId` VARCHAR(191) NULL,
    ADD COLUMN `supplierSku` VARCHAR(191) NULL,
    ADD COLUMN `taxRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.10,
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK') NOT NULL DEFAULT 'DRAFT',
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `review` MODIFY `feedback` TEXT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `reply` TEXT NULL;

-- AlterTable
ALTER TABLE `software` MODIFY `summary` TEXT NULL;

-- AlterTable
ALTER TABLE `softwarecategory` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `solution` MODIFY `summary` TEXT NULL;

-- AlterTable
ALTER TABLE `solutioncategory` MODIFY `description` TEXT NULL;

-- CreateTable
CREATE TABLE `supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `taxCode` VARCHAR(13) NULL,
    `paymentTerms` VARCHAR(191) NULL DEFAULT 'COD',
    `minOrderValue` DECIMAL(12, 2) NULL,
    `shippingFee` DECIMAL(12, 2) NULL,
    `rating` FLOAT NULL DEFAULT 0,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supplier_slug_key`(`slug`),
    UNIQUE INDEX `supplier_code_key`(`code`),
    INDEX `Supplier_name_idx`(`name`),
    INDEX `Supplier_isActive_idx`(`isActive`),
    INDEX `Supplier_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacttype` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL DEFAULT 'message-circle',
    `color` VARCHAR(191) NULL DEFAULT '#3b82f6',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contacttype_name_key`(`name`),
    UNIQUE INDEX `contacttype_slug_key`(`slug`),
    INDEX `ContactType_sortOrder_idx`(`sortOrder`),
    INDEX `ContactType_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `typeId` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'website',
    `status` ENUM('new', 'in_progress', 'responded', 'closed', 'spam') NOT NULL DEFAULT 'new',
    `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    `assignedTo` VARCHAR(191) NULL,
    `response` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `respondedBy` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `referrer` TEXT NULL,
    `internalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contact_code_key`(`code`),
    INDEX `Contact_code_idx`(`code`),
    INDEX `Contact_status_idx`(`status`),
    INDEX `Contact_priority_idx`(`priority`),
    INDEX `Contact_typeId_idx`(`typeId`),
    INDEX `Contact_createdAt_idx`(`createdAt`),
    INDEX `Contact_email_idx`(`email`),
    INDEX `Contact_phone_idx`(`phone`),
    INDEX `Contact_assignedTo_idx`(`assignedTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quoterequest` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `taxCode` VARCHAR(13) NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `message` TEXT NULL,
    `quotedPrice` DECIMAL(12, 2) NULL,
    `quotedTotal` DECIMAL(12, 2) NULL,
    `validUntil` DATETIME(3) NULL,
    `paymentTerms` VARCHAR(191) NULL,
    `deliveryTerms` VARCHAR(191) NULL,
    `status` ENUM('pending', 'quoted', 'accepted', 'rejected', 'expired', 'converted') NOT NULL DEFAULT 'pending',
    `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    `assignedTo` VARCHAR(191) NULL,
    `respondedBy` VARCHAR(191) NULL,
    `respondedAt` DATETIME(3) NULL,
    `customerNotes` TEXT NULL,
    `internalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `quoterequest_code_key`(`code`),
    INDEX `QuoteRequest_code_idx`(`code`),
    INDEX `QuoteRequest_status_idx`(`status`),
    INDEX `QuoteRequest_priority_idx`(`priority`),
    INDEX `QuoteRequest_productId_idx`(`productId`),
    INDEX `QuoteRequest_createdAt_idx`(`createdAt`),
    INDEX `QuoteRequest_assignedTo_idx`(`assignedTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `product_saleCode_key` ON `product`(`saleCode`);

-- CreateIndex
CREATE INDEX `Product_saleCode_idx` ON `product`(`saleCode`);

-- CreateIndex
CREATE INDEX `Product_sku_idx` ON `product`(`sku`);

-- CreateIndex
CREATE INDEX `Product_supplierId_idx` ON `product`(`supplierId`);

-- CreateIndex
CREATE INDEX `Product_costPrice_idx` ON `product`(`costPrice`);

-- CreateIndex
CREATE INDEX `Product_profitMargin_idx` ON `product`(`profitMargin`);

-- CreateIndex
CREATE INDEX `Product_requiresQuote_idx` ON `product`(`requiresQuote`);

-- CreateIndex
CREATE INDEX `Product_status_idx` ON `product`(`status`);

-- CreateIndex
CREATE INDEX `Product_stockOnHand_idx` ON `product`(`stockOnHand`);

-- CreateIndex
CREATE INDEX `Product_reorderLevel_idx` ON `product`(`reorderLevel`);

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `Product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact` ADD CONSTRAINT `Contact_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `contacttype`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quoterequest` ADD CONSTRAINT `QuoteRequest_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_sku_key` TO `product_sku_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_slug_key` TO `product_slug_key`;
