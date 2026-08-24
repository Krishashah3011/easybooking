/**
 * Booking dates are always displayed as DD-MM-YYYY across the whole app —
 * admin, storefront widget, and emails — regardless of shop locale. Not
 * configurable by design; keeping one fixed format everywhere avoids the
 * inconsistency that came from partially wiring a per-shop setting.
 */
export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/** Times are always shown as stored — 24-hour "HH:mm" — no format setting. */
export function formatTimeRangeDisplay(start: string, end: string): string {
  return `${start} \u2013 ${end}`;
}

/**
 * Booking creation timestamps (when the booking record was actually made,
 * as opposed to the booked appointment date/time) are shown as
 * "DD-MM-YYYY, HH:mm" in UTC, matching the fixed DD-MM-YYYY date format
 * used everywhere else in the app.
 */
export function formatDateTimeDisplay(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

/**
 * Human-readable "when" label for a booking, adapted to its booking
 * type: a FULL_DAY booking has no meaningful time-of-day, a MULTI_DAY
 * booking is a check-in/check-out range rather than a single date, and
 * SLOT/BUNDLE bookings show the normal time range.
 */
export function formatBookingWhenDisplay(booking: {
  bookingType: string;
  date: string;
  endDate?: string | null;
  slotStart: string;
  slotEnd: string;
}): string {
  if (booking.bookingType === "FULL_DAY") {
    return `${formatDateDisplay(booking.date)} · Whole day`;
  }
  if (booking.bookingType === "MULTI_DAY") {
    const checkout = booking.endDate
      ? formatDateDisplay(booking.endDate)
      : "—";
    return `${formatDateDisplay(booking.date)} \u2192 ${checkout}`;
  }
  return `${formatDateDisplay(booking.date)} ${formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}`;
}

/**
 * Human-readable label for who actually made the booking: the customer
 * from the storefront checkout, or an admin creating it manually.
 */
export function bookingSourceLabel(source: string): string {
  return source === "ADMIN_MANUAL" ? "by admin" : "by customer";
}