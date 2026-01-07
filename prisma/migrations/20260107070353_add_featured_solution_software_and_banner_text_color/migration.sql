-- AlterTable
ALTER TABLE "herobanner" ADD COLUMN     "textColor" TEXT;

-- CreateTable
CREATE TABLE "featuredsolution" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featuredsolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featuredsoftware" (
    "id" TEXT NOT NULL,
    "softwareId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featuredsoftware_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featuredsolution_solutionId_key" ON "featuredsolution"("solutionId");

-- CreateIndex
CREATE INDEX "FeaturedSolution_isActive_sortOrder_idx" ON "featuredsolution"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "FeaturedSolution_date_range_idx" ON "featuredsolution"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "featuredsoftware_softwareId_key" ON "featuredsoftware"("softwareId");

-- CreateIndex
CREATE INDEX "FeaturedSoftware_isActive_sortOrder_idx" ON "featuredsoftware"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "FeaturedSoftware_date_range_idx" ON "featuredsoftware"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "featuredsolution" ADD CONSTRAINT "featuredsolution_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featuredsoftware" ADD CONSTRAINT "featuredsoftware_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "software"("id") ON DELETE CASCADE ON UPDATE CASCADE;
