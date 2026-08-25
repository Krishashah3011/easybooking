-- AlterTable
ALTER TABLE "BookingLocation" ADD COLUMN     "dailyEndTime" TEXT,
ADD COLUMN     "dailyStartTime" TEXT,
ADD COLUMN     "workingDays" TEXT;

-- AlterTable
ALTER TABLE "BookingSettings" ADD COLUMN     "locationPrefillDone" BOOLEAN NOT NULL DEFAULT false;
