/*
  Warnings:

  - You are about to drop the column `allDay` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BlackoutDate` table. All the data in the column will be lost.
  - You are about to drop the `ProductBookingConfig` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `BlackoutDate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'OVERBOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('STOREFRONT_ORDER', 'ADMIN_MANUAL');

-- DropIndex
DROP INDEX "BlackoutDate_shop_productId_idx";

-- DropIndex
DROP INDEX "BlackoutDate_shop_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "BlackoutDate" DROP COLUMN "allDay",
DROP COLUMN "endDate",
DROP COLUMN "endTime",
DROP COLUMN "productId",
DROP COLUMN "startDate",
DROP COLUMN "startTime",
DROP COLUMN "updatedAt",
ADD COLUMN     "bookableProductId" TEXT,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ProductBookingConfig";

-- CreateTable
CREATE TABLE "BookableProduct" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workingDays" TEXT,
    "dailyStartTime" TEXT,
    "dailyEndTime" TEXT,
    "slotDurationMinutes" INTEGER,
    "bufferMinutes" INTEGER,
    "minAdvanceHours" INTEGER,
    "maxAdvanceDays" INTEGER,
    "maxBookingsPerSlot" INTEGER,
    "bookingStartDate" TIMESTAMP(3),
    "bookingEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookableProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bookableProductId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderName" TEXT,
    "lineItemId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT true,
    "date" TEXT NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "slotStartsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL,
    "confirmationSentAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookableProduct_shop_idx" ON "BookableProduct"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "BookableProduct_shop_productId_key" ON "BookableProduct"("shop", "productId");

-- CreateIndex
CREATE INDEX "Booking_shop_idx" ON "Booking"("shop");

-- CreateIndex
CREATE INDEX "Booking_bookableProductId_slotStartsAt_idx" ON "Booking"("bookableProductId", "slotStartsAt");

-- CreateIndex
CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");

-- CreateIndex
CREATE INDEX "Booking_status_reminderSentAt_slotStartsAt_idx" ON "Booking"("status", "reminderSentAt", "slotStartsAt");

-- CreateIndex
CREATE INDEX "BlackoutDate_shop_idx" ON "BlackoutDate"("shop");

-- CreateIndex
CREATE INDEX "BlackoutDate_bookableProductId_idx" ON "BlackoutDate"("bookableProductId");

-- AddForeignKey
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_bookableProductId_fkey" FOREIGN KEY ("bookableProductId") REFERENCES "BookableProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookableProductId_fkey" FOREIGN KEY ("bookableProductId") REFERENCES "BookableProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
