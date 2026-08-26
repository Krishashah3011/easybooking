export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function formatTimeRangeDisplay(start: string, end: string): string {
  return `${start} \u2013 ${end}`;
}

export function formatBookingWhenDisplay(booking: {
  bookingType: string;
  date: string;
  endDate?: string | null;
  slotStart: string;
  slotEnd: string;
}): string {
  if (booking.bookingType === "FULL_DAY") {
    return `${formatDateDisplay(booking.date)} · ${formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}`;
  }
  if (booking.bookingType === "MULTI_DAY") {
    const checkout = booking.endDate
      ? formatDateDisplay(booking.endDate)
      : "—";
    return `${formatDateDisplay(booking.date)} \u2192 ${checkout}`;
  }
  return formatDateDisplay(booking.date);
}

export function bookingSourceLabel(source: string): string {
  return source === "ADMIN_MANUAL" ? "by admin" : "by customer";
}