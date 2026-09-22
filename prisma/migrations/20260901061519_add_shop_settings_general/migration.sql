ALTER TABLE "ShopSettings" ADD COLUMN     "appEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "serialKey" TEXT;

CREATE UNIQUE INDEX "ShopSettings_serialKey_key" ON "ShopSettings"("serialKey");