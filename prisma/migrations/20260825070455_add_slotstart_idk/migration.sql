-- DropIndex
DROP INDEX "Booking_shop_idx";

-- CreateIndex
CREATE INDEX "Booking_shop_slotStartsAt_idx" ON "Booking"("shop", "slotStartsAt");
