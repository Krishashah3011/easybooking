/*
  Warnings:

  - A unique constraint covering the columns `[serialKey]` on the table `ShopSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "appEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "serialKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_serialKey_key" ON "ShopSettings"("serialKey");
