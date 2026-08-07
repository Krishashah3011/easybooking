-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "dailyStartTime" TEXT NOT NULL DEFAULT '09:00',
    "dailyEndTime" TEXT NOT NULL DEFAULT '17:00',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 0,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "maxBookingsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "bookingStartDate" TIMESTAMP(3),
    "bookingEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSettings_shop_key" ON "BookingSettings"("shop");
