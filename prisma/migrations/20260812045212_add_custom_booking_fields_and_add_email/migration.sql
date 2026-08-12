-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "customFieldResponses" JSONB;

-- AlterTable
ALTER TABLE "BookingSettings" ADD COLUMN     "emailFromName" TEXT;

-- CreateTable
CREATE TABLE "CustomBookingField" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomBookingField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomBookingField_shop_idx" ON "CustomBookingField"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "CustomBookingField_shop_fieldKey_key" ON "CustomBookingField"("shop", "fieldKey");
