type CompletionInput = {
  bookingType: string;
  date: string;
  endDate?: string | null;
  slotEnd: string;
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

  const endsAt = new Date(`${endDateStr}T${endTime}:00Z`);
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