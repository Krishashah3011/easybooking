-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "BookingSettings" ADD COLUMN     "timeFormat" TEXT NOT NULL DEFAULT '24h';
