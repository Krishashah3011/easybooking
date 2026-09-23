-- AlterTable
ALTER TABLE "BookableProduct" ADD COLUMN     "dayTimes" JSONB;

-- AlterTable
ALTER TABLE "BookingSettings" ADD COLUMN     "dayTimes" JSONB;
