-- CreateIndex
CREATE INDEX "Contact_respondedBy_idx" ON "contact"("respondedBy");

-- CreateIndex
CREATE INDEX "Contact_updatedAt_idx" ON "contact"("updatedAt");

-- CreateIndex
CREATE INDEX "Contact_phone_status_idx" ON "contact"("phone", "status");
