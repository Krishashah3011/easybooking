-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "location" TEXT;

-- CreateTable
CREATE TABLE "BookingLocation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingLocation_shop_idx" ON "BookingLocation"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLocation_shop_name_key" ON "BookingLocation"("shop", "name");
