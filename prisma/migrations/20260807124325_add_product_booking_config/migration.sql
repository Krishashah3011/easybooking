-- CreateTable
CREATE TABLE "ProductBookingConfig" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
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

    CONSTRAINT "ProductBookingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBookingConfig_shop_idx" ON "ProductBookingConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBookingConfig_shop_productId_key" ON "ProductBookingConfig"("shop", "productId");

-- CreateIndex
CREATE INDEX "BlackoutDate_shop_productId_idx" ON "BlackoutDate"("shop", "productId");

-- CreateIndex
CREATE INDEX "BlackoutDate_shop_startDate_endDate_idx" ON "BlackoutDate"("shop", "startDate", "endDate");
