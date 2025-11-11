-- AlterTable
ALTER TABLE `brand` MODIFY `logoUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `cartitem` MODIFY `productImage` TEXT NULL;

-- AlterTable
ALTER TABLE `orderitem` MODIFY `image` TEXT NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `coverImage` TEXT NULL;

-- AlterTable
ALTER TABLE `productcategory` MODIFY `coverImage` TEXT NULL;

-- AlterTable
ALTER TABLE `productimage` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `producttype` MODIFY `coverImage` TEXT NULL;

-- AlterTable
ALTER TABLE `software` MODIFY `coverImage` TEXT NULL;

-- AlterTable
ALTER TABLE `softwarecategory` MODIFY `image` TEXT NULL;

-- AlterTable
ALTER TABLE `solution` MODIFY `coverImage` TEXT NULL;

-- AlterTable
ALTER TABLE `solutioncategory` MODIFY `image` TEXT NULL;
