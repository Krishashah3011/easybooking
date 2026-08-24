// A booking is "completed" once its date/time has fully passed — e.g. a
// SLOT booked 2:00–3:00 PM on the 22nd is completed the moment it turns
// 3:01 PM that day; a FULL_DAY or MULTI_DAY booking completes at the end
// of its last day. This is computed on the fly every time a booking list
// is loaded, never written to the database, so it's always accurate
// without needing a background job/cron to "sweep" old bookings.
//
// Booking dates/times are stored as plain strings and treated as UTC
// everywhere else in this app (see booking.server.ts, which always builds
// slotStartsAt as `${date}T${time}:00Z`), so we parse them the same way
// here for consistency.

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
  // FULL_DAY/MULTI_DAY bookings already store slotEnd as "23:59"/"00:00"
  // respectively (see booking.server.ts) — for MULTI_DAY specifically we
  // want end-of-day on the checkout date, not "00:00".
  const endTime = booking.bookingType === "MULTI_DAY" ? "23:59" : booking.slotEnd || "23:59";

  const endsAt = new Date(`${endDateStr}T${endTime}:00Z`);
  if (Number.isNaN(endsAt.getTime())) return false;
  return now.getTime() >= endsAt.getTime();
}

// Only these statuses ever "complete" — a cancelled booking stays
// cancelled regardless of its date, and an already-completed one is
// derived, not stored.
const COMPLETABLE_STATUSES = new Set(["CONFIRMED", "RESCHEDULED", "OVERBOOKED"]);

/**
 * The status to actually show and filter by: the stored status, except an
 * active booking whose time has fully passed displays as "COMPLETED"
 * instead.
 */
export function getDisplayStatus(
  booking: CompletionInput & { status: string },
  now: Date = new Date(),
): string {
  if (COMPLETABLE_STATUSES.has(booking.status) && isBookingCompleted(booking, now)) {
    return "COMPLETED";
  }
  return booking.status;
}
