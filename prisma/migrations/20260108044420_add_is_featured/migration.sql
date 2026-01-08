-- AlterTable
ALTER TABLE "product" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "software" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "solution" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
