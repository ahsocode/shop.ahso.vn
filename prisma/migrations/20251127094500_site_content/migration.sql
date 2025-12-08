-- CreateTable
CREATE TABLE "herobanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "herobanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siteannouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnLogin" BOOLEAN NOT NULL DEFAULT true,
    "showOnVisit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siteannouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policysection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "allowedText" TEXT,
    "deniedText" TEXT,
    "content" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policysection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policysection_slug_key" ON "policysection"("slug");
