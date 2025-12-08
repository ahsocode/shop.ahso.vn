-- CreateTable
CREATE TABLE "systemsetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systemsetting_pkey" PRIMARY KEY ("key")
);
