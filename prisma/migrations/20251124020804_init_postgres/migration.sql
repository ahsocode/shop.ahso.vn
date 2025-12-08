-- CreateEnum
CREATE TYPE "cart_status" AS ENUM ('ACTIVE', 'CHECKOUT', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "software_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'awaiting_confirmation', 'confirmed', 'failed');

-- CreateEnum
CREATE TYPE "solution_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "contact_status" AS ENUM ('new', 'in_progress', 'responded', 'closed', 'spam');

-- CreateEnum
CREATE TYPE "contact_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('pending', 'quoted', 'accepted', 'rejected', 'expired', 'converted');

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'VN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "cart_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartitem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brandName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "productId" TEXT,
    "productImage" TEXT,
    "productName" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "quantityLabel" TEXT,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "unitLabel" TEXT,

    CONSTRAINT "cartitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "shippingMethod" TEXT,
    "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addressId" TEXT,
    "userId" TEXT,
    "billingCity" TEXT,
    "billingCountry" CHAR(2) NOT NULL DEFAULT 'VN',
    "billingLine1" TEXT,
    "billingLine2" TEXT,
    "billingPostalCode" TEXT,
    "billingState" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "customerEmail" TEXT NOT NULL,
    "customerFullName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerTaxCode" VARCHAR(13),
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingCountry" CHAR(2) NOT NULL DEFAULT 'VN',
    "shippingLine1" TEXT NOT NULL,
    "shippingLine2" TEXT,
    "shippingPostalCode" TEXT,
    "shippingState" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image" TEXT,
    "brandName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "productId" TEXT,
    "quantityLabel" TEXT,
    "slug" TEXT NOT NULL,
    "unitLabel" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "customerMarkedPaidAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "payment_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxCode" VARCHAR(13),
    "paymentTerms" TEXT DEFAULT 'COD',
    "minOrderValue" DECIMAL(12,2),
    "shippingFee" DECIMAL(12,2),
    "rating" DOUBLE PRECISION DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "saleCode" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "supplierId" TEXT,
    "supplierSku" TEXT,
    "costPrice" DECIMAL(12,2),
    "price" DECIMAL(12,2) NOT NULL,
    "listPrice" DECIMAL(12,2),
    "profitAmount" DECIMAL(12,2),
    "profitMargin" DECIMAL(5,2),
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "requiresQuote" BOOLEAN NOT NULL DEFAULT false,
    "quoteNote" TEXT,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "stockReserved" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER DEFAULT 10,
    "reorderQty" INTEGER DEFAULT 50,
    "minOrderQty" INTEGER DEFAULT 1,
    "stepQty" INTEGER DEFAULT 1,
    "status" "product_status" NOT NULL DEFAULT 'DRAFT',
    "typeId" TEXT NOT NULL,
    "brandId" TEXT,
    "coverImage" TEXT,
    "weightGrams" INTEGER,
    "lengthMm" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "unitId" TEXT,
    "quantityValue" DECIMAL(20,6),
    "quantityUnitId" TEXT,
    "quantityLabel" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishAt" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productcategory" (
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productcategorylink" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "productcategorylink_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "productimage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productimage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productspecdefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productspecdefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productspecvalue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specDefinitionId" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,
    "unitOverride" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productspecvalue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producttype" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverImage" TEXT,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producttype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "description" TEXT,
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewimage" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewimage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "coverImage" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "status" "software_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "softwarecategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "softwarecategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "coverImage" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "industry" TEXT,
    "usecase" TEXT,
    "status" "solution_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutioncategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solutioncategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutionimage" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solutionimage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unitdefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "dimension" TEXT,
    "baseName" TEXT,
    "factorToBase" DECIMAL(20,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unitdefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "taxCode" VARCHAR(13),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shippingAddressId" TEXT NOT NULL,
    "billingAddressId" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT DEFAULT '/logo.png',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacttype" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'message-circle',
    "color" TEXT DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacttype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "typeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "status" "contact_status" NOT NULL DEFAULT 'new',
    "priority" "contact_priority" NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quoterequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "taxCode" VARCHAR(13),
    "productId" TEXT,
    "productName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "quotedPrice" DECIMAL(12,2),
    "quotedTotal" DECIMAL(12,2),
    "validUntil" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "status" "quote_status" NOT NULL DEFAULT 'pending',
    "priority" "contact_priority" NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "quoterequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "brand"("slug");

-- CreateIndex
CREATE INDEX "Cart_status_idx" ON "cart"("status");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "cartitem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "cartitem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "order"("code");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "order"("addressId");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "orderitem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "orderitem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_sku_idx" ON "orderitem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_slug_key" ON "supplier"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_code_key" ON "supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "supplier"("isActive");

-- CreateIndex
CREATE INDEX "Supplier_rating_idx" ON "supplier"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_saleCode_key" ON "product"("saleCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "Product_saleCode_idx" ON "product"("saleCode");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "product"("sku");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "product"("supplierId");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "product"("price");

-- CreateIndex
CREATE INDEX "Product_costPrice_idx" ON "product"("costPrice");

-- CreateIndex
CREATE INDEX "Product_profitMargin_idx" ON "product"("profitMargin");

-- CreateIndex
CREATE INDEX "Product_requiresQuote_idx" ON "product"("requiresQuote");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "product"("status");

-- CreateIndex
CREATE INDEX "Product_typeId_idx" ON "product"("typeId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "product"("brandId");

-- CreateIndex
CREATE INDEX "Product_stockOnHand_idx" ON "product"("stockOnHand");

-- CreateIndex
CREATE INDEX "Product_reorderLevel_idx" ON "product"("reorderLevel");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "product"("name");

-- CreateIndex
CREATE INDEX "Product_purchaseCount_idx" ON "product"("purchaseCount");

-- CreateIndex
CREATE INDEX "Product_ratingAvg_idx" ON "product"("ratingAvg");

-- CreateIndex
CREATE INDEX "Product_ratingCount_idx" ON "product"("ratingCount");

-- CreateIndex
CREATE INDEX "Product_status_publishAt_idx" ON "product"("status", "publishAt");

-- CreateIndex
CREATE INDEX "Product_quantityUnitId_idx" ON "product"("quantityUnitId");

-- CreateIndex
CREATE INDEX "Product_quantityValue_idx" ON "product"("quantityValue");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "productcategory"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_name_idx" ON "productcategory"("name");

-- CreateIndex
CREATE INDEX "ProductCategory_productCount_idx" ON "productcategory"("productCount");

-- CreateIndex
CREATE INDEX "ProductCategoryLink_categoryId_idx" ON "productcategorylink"("categoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "productimage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_sortOrder_idx" ON "productimage"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpecDefinition_slug_key" ON "productspecdefinition"("slug");

-- CreateIndex
CREATE INDEX "ProductSpecDefinition_name_idx" ON "productspecdefinition"("name");

-- CreateIndex
CREATE INDEX "ProductSpecValue_sortOrder_idx" ON "productspecvalue"("sortOrder");

-- CreateIndex
CREATE INDEX "ProductSpecValue_specDefinitionId_idx" ON "productspecvalue"("specDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpecValue_productId_specDefinitionId_key" ON "productspecvalue"("productId", "specDefinitionId");

-- CreateIndex
CREATE INDEX "ProductType_categoryId_idx" ON "producttype"("categoryId");

-- CreateIndex
CREATE INDEX "ProductType_name_idx" ON "producttype"("name");

-- CreateIndex
CREATE INDEX "ProductType_productCount_idx" ON "producttype"("productCount");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_categoryId_slug_key" ON "producttype"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "review"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "review"("userId");

-- CreateIndex
CREATE INDEX "ReviewImage_reviewId_idx" ON "reviewimage"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Software_slug_key" ON "software"("slug");

-- CreateIndex
CREATE INDEX "Software_categoryId_status_idx" ON "software"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Software_title_idx" ON "software"("title");

-- CreateIndex
CREATE INDEX "Software_bodyHtml_idx" ON "software"("bodyHtml");

-- CreateIndex
CREATE UNIQUE INDEX "SoftwareCategory_slug_key" ON "softwarecategory"("slug");

-- CreateIndex
CREATE INDEX "SoftwareCategory_parentId_sortOrder_idx" ON "softwarecategory"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_slug_key" ON "solution"("slug");

-- CreateIndex
CREATE INDEX "Solution_categoryId_status_idx" ON "solution"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Solution_title_idx" ON "solution"("title");

-- CreateIndex
CREATE INDEX "Solution_bodyHtml_idx" ON "solution"("bodyHtml");

-- CreateIndex
CREATE INDEX "Solution_usecase_idx" ON "solution"("usecase");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionCategory_slug_key" ON "solutioncategory"("slug");

-- CreateIndex
CREATE INDEX "SolutionCategory_parentId_sortOrder_idx" ON "solutioncategory"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "SolutionImage_solutionId_sortOrder_idx" ON "solutionimage"("solutionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UnitDefinition_name_key" ON "unitdefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "user"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "User_shippingAddressId_key" ON "user"("shippingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingAddressId_key" ON "user"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "contacttype_name_key" ON "contacttype"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contacttype_slug_key" ON "contacttype"("slug");

-- CreateIndex
CREATE INDEX "ContactType_sortOrder_idx" ON "contacttype"("sortOrder");

-- CreateIndex
CREATE INDEX "ContactType_isActive_idx" ON "contacttype"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "contact_code_key" ON "contact"("code");

-- CreateIndex
CREATE INDEX "Contact_code_idx" ON "contact"("code");

-- CreateIndex
CREATE INDEX "Contact_status_idx" ON "contact"("status");

-- CreateIndex
CREATE INDEX "Contact_priority_idx" ON "contact"("priority");

-- CreateIndex
CREATE INDEX "Contact_typeId_idx" ON "contact"("typeId");

-- CreateIndex
CREATE INDEX "Contact_createdAt_idx" ON "contact"("createdAt");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "contact"("email");

-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_assignedTo_idx" ON "contact"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "quoterequest_code_key" ON "quoterequest"("code");

-- CreateIndex
CREATE INDEX "QuoteRequest_code_idx" ON "quoterequest"("code");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_idx" ON "quoterequest"("status");

-- CreateIndex
CREATE INDEX "QuoteRequest_priority_idx" ON "quoterequest"("priority");

-- CreateIndex
CREATE INDEX "QuoteRequest_productId_idx" ON "quoterequest"("productId");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "quoterequest"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_assignedTo_idx" ON "quoterequest"("assignedTo");

-- AddForeignKey
ALTER TABLE "cartitem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartitem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "producttype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unitdefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "Product_quantityUnitId_fkey" FOREIGN KEY ("quantityUnitId") REFERENCES "unitdefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productcategorylink" ADD CONSTRAINT "ProductCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "productcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productcategorylink" ADD CONSTRAINT "ProductCategoryLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productimage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productspecvalue" ADD CONSTRAINT "ProductSpecValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productspecvalue" ADD CONSTRAINT "ProductSpecValue_specDefinitionId_fkey" FOREIGN KEY ("specDefinitionId") REFERENCES "productspecdefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttype" ADD CONSTRAINT "ProductType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "productcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewimage" ADD CONSTRAINT "ReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software" ADD CONSTRAINT "Software_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "softwarecategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "softwarecategory" ADD CONSTRAINT "SoftwareCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "softwarecategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution" ADD CONSTRAINT "Solution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "solutioncategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutioncategory" ADD CONSTRAINT "SolutionCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "solutioncategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutionimage" ADD CONSTRAINT "SolutionImage_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "User_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "User_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "Contact_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "contacttype"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoterequest" ADD CONSTRAINT "QuoteRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
