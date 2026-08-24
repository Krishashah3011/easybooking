-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_locationId_idx" ON "Booking"("locationId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BookingLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
