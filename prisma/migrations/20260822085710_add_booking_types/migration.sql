-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('SLOT', 'FULL_DAY', 'MULTI_DAY', 'BUNDLE');

-- AlterTable
ALTER TABLE "BookableProduct" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'SLOT',
ADD COLUMN     "bundleSessionCount" INTEGER,
ADD COLUMN     "bundleSessionDurationMinutes" INTEGER,
ADD COLUMN     "bundleValidityDays" INTEGER,
ADD COLUMN     "maxNights" INTEGER,
ADD COLUMN     "minNights" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "endDate" TEXT,
ADD COLUMN     "slotEndsAt" TIMESTAMP(3);
