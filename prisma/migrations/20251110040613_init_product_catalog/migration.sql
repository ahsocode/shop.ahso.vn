/*
  Warnings:

  - You are about to drop the column `originCountryCode` on the `brand` table. All the data in the column will be lost.
  - You are about to drop the column `variantCount` on the `brand` table. All the data in the column will be lost.
  - The values [CHECKED_OUT] on the enum `Cart_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `totalPrice` on the `cartitem` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `cartitem` table. All the data in the column will be lost.
  - You are about to drop the column `canonicalUrl` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionHtml` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `imagesCover` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `madeInCountryCode` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `madeInNote` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `mpn` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `priceMax` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `priceMin` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `variantCount` on the `product` table. All the data in the column will be lost.
  - The primary key for the `productcategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `categoryId` on the `productcategory` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `productcategory` table. All the data in the column will be lost.
  - You are about to drop the `category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productdoc` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productspec` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productvariant` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lineTotal` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSku` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSlug` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `ProductCategory` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `name` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `CartItem_cartId_fkey`;

-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `CartItem_variantId_fkey`;

-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `productcategory` DROP FOREIGN KEY `ProductCategory_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `productcategory` DROP FOREIGN KEY `ProductCategory_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productdoc` DROP FOREIGN KEY `ProductDoc_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productimage` DROP FOREIGN KEY `ProductImage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productspec` DROP FOREIGN KEY `ProductSpec_variantId_fkey`;

-- DropForeignKey
ALTER TABLE `productvariant` DROP FOREIGN KEY `ProductVariant_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `productvariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

-- DropIndex
DROP INDEX `Brand_slug_idx` ON `brand`;

-- DropIndex
DROP INDEX `Brand_variantCount_idx` ON `brand`;

-- DropIndex
DROP INDEX `CartItem_variantId_idx` ON `cartitem`;

-- DropIndex
DROP INDEX `Product_madeInCountryCode_idx` ON `product`;

-- DropIndex
DROP INDEX `Product_slug_idx` ON `product`;

-- DropIndex
DROP INDEX `Product_variantCount_idx` ON `product`;

-- DropIndex
DROP INDEX `ProductCategory_categoryId_idx` ON `productcategory`;

-- AlterTable
ALTER TABLE `brand` DROP COLUMN `originCountryCode`,
    DROP COLUMN `variantCount`,
    ADD COLUMN `productCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `summary` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cart` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    ADD COLUMN `discountTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `grandTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shippingFee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('ACTIVE', 'CHECKOUT', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `cartitem` DROP COLUMN `totalPrice`,
    DROP COLUMN `variantId`,
    ADD COLUMN `brandName` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    ADD COLUMN `lineTotal` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `productId` VARCHAR(191) NULL,
    ADD COLUMN `productImage` VARCHAR(191) NULL,
    ADD COLUMN `productName` VARCHAR(191) NOT NULL,
    ADD COLUMN `productSku` VARCHAR(191) NOT NULL,
    ADD COLUMN `productSlug` VARCHAR(191) NOT NULL,
    ADD COLUMN `quantityLabel` VARCHAR(191) NULL,
    ADD COLUMN `taxIncluded` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `unitLabel` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` DROP COLUMN `canonicalUrl`,
    DROP COLUMN `descriptionHtml`,
    DROP COLUMN `imagesCover`,
    DROP COLUMN `madeInCountryCode`,
    DROP COLUMN `madeInNote`,
    DROP COLUMN `mpn`,
    DROP COLUMN `priceMax`,
    DROP COLUMN `priceMin`,
    DROP COLUMN `summary`,
    DROP COLUMN `title`,
    DROP COLUMN `unit`,
    DROP COLUMN `variantCount`,
    ADD COLUMN `coverImage` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `heightMm` INTEGER NULL,
    ADD COLUMN `lengthMm` INTEGER NULL,
    ADD COLUMN `listPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `minOrderQty` INTEGER NULL DEFAULT 1,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `price` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `quantityLabel` VARCHAR(191) NULL,
    ADD COLUMN `quantityUnitId` VARCHAR(191) NULL,
    ADD COLUMN `quantityValue` DECIMAL(20, 6) NULL,
    ADD COLUMN `stepQty` INTEGER NULL DEFAULT 1,
    ADD COLUMN `stockOnHand` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `stockReserved` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `taxIncluded` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `typeId` VARCHAR(191) NOT NULL,
    ADD COLUMN `unitId` VARCHAR(191) NULL,
    ADD COLUMN `weightGrams` INTEGER NULL,
    ADD COLUMN `widthMm` INTEGER NULL;

-- AlterTable
ALTER TABLE `productcategory` DROP PRIMARY KEY,
    DROP COLUMN `categoryId`,
    DROP COLUMN `productId`,
    ADD COLUMN `coverImage` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `productCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- DropTable
DROP TABLE `category`;

-- DropTable
DROP TABLE `productdoc`;

-- DropTable
DROP TABLE `productspec`;

-- DropTable
DROP TABLE `productvariant`;

-- CreateTable
CREATE TABLE `ProductCategoryLink` (
    `productId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `ProductCategoryLink_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`productId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductType` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `coverImage` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `productCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductType_name_idx`(`name`),
    INDEX `ProductType_categoryId_idx`(`categoryId`),
    INDEX `ProductType_productCount_idx`(`productCount`),
    UNIQUE INDEX `ProductType_categoryId_slug_key`(`categoryId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NULL,
    `dimension` VARCHAR(191) NULL,
    `baseName` VARCHAR(191) NULL,
    `factorToBase` DECIMAL(20, 8) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UnitDefinition_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSpecDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductSpecDefinition_slug_key`(`slug`),
    INDEX `ProductSpecDefinition_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSpecValue` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `specDefinitionId` VARCHAR(191) NOT NULL,
    `valueString` VARCHAR(191) NULL,
    `valueNumber` DOUBLE NULL,
    `valueBoolean` BOOLEAN NULL,
    `unitOverride` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductSpecValue_specDefinitionId_idx`(`specDefinitionId`),
    INDEX `ProductSpecValue_sortOrder_idx`(`sortOrder`),
    UNIQUE INDEX `ProductSpecValue_productId_specDefinitionId_key`(`productId`, `specDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Cart_status_idx` ON `Cart`(`status`);

-- CreateIndex
CREATE INDEX `CartItem_productId_idx` ON `CartItem`(`productId`);

-- CreateIndex
CREATE INDEX `Product_name_idx` ON `Product`(`name`);

-- CreateIndex
CREATE INDEX `Product_typeId_idx` ON `Product`(`typeId`);

-- CreateIndex
CREATE INDEX `Product_price_idx` ON `Product`(`price`);

-- CreateIndex
CREATE INDEX `Product_quantityUnitId_idx` ON `Product`(`quantityUnitId`);

-- CreateIndex
CREATE INDEX `Product_quantityValue_idx` ON `Product`(`quantityValue`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductCategory_slug_key` ON `ProductCategory`(`slug`);

-- CreateIndex
CREATE INDEX `ProductCategory_name_idx` ON `ProductCategory`(`name`);

-- CreateIndex
CREATE INDEX `ProductCategory_productCount_idx` ON `ProductCategory`(`productCount`);

-- AddForeignKey
ALTER TABLE `ProductCategoryLink` ADD CONSTRAINT `ProductCategoryLink_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategoryLink` ADD CONSTRAINT `ProductCategoryLink_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProductCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductType` ADD CONSTRAINT `ProductType_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProductCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `ProductType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `UnitDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_quantityUnitId_fkey` FOREIGN KEY (`quantityUnitId`) REFERENCES `UnitDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSpecValue` ADD CONSTRAINT `ProductSpecValue_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSpecValue` ADD CONSTRAINT `ProductSpecValue_specDefinitionId_fkey` FOREIGN KEY (`specDefinitionId`) REFERENCES `ProductSpecDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_brandId_fkey` TO `Product_brandId_idx`;
