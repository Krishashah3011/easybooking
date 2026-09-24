import { zonedTimeToUtc } from "./timezones";

type CompletionInput = {
  bookingType: string;
  date: string;
  endDate?: string | null;
  slotEnd: string;
  locationTimezone?: string | null;
};

export function isBookingCompleted(
  booking: CompletionInput,
  now: Date = new Date(),
): boolean {
  const endDateStr =
    booking.bookingType === "MULTI_DAY"
      ? booking.endDate || booking.date
      : booking.date;
  const endTime = booking.bookingType === "MULTI_DAY" ? "23:59" : booking.slotEnd || "23:59";

  if (Number.isNaN(new Date(`${endDateStr}T${endTime}:00Z`).getTime())) {
    return false;
  }
  const endsAt = zonedTimeToUtc(endDateStr, endTime, booking.locationTimezone);
  if (Number.isNaN(endsAt.getTime())) return false;
  return now.getTime() >= endsAt.getTime();
}
const COMPLETABLE_STATUSES = new Set(["CONFIRMED", "RESCHEDULED", "OVERBOOKED"]);

export function getDisplayStatus(
  booking: CompletionInput & { status: string },
  now: Date = new Date(),
): string {
  if (COMPLETABLE_STATUSES.has(booking.status) && isBookingCompleted(booking, now)) {
    return "COMPLETED";
  }
  return booking.status;
}

export function belongsInCompletedTab(
  booking: CompletionInput & { status: string },
  now: Date = new Date(),
): boolean {
  if (booking.status === "CANCELLED") {
    return isBookingCompleted(booking, now);
  }
  return getDisplayStatus(booking, now) === "COMPLETED";
}