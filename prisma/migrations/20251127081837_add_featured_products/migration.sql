-- CreateTable
CREATE TABLE "featuredproduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featuredproduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedProduct_isActive_sortOrder_idx" ON "featuredproduct"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "FeaturedProduct_date_range_idx" ON "featuredproduct"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "featuredproduct_productId_key" ON "featuredproduct"("productId");

-- AddForeignKey
ALTER TABLE "featuredproduct" ADD CONSTRAINT "featuredproduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
