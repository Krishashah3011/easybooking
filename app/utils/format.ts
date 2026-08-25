export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function formatTimeRangeDisplay(start: string, end: string): string {
  return `${start} \u2013 ${end}`;
}

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
  return formatDateDisplay(booking.date);
}

export function bookingSourceLabel(source: string): string {
  return source === "ADMIN_MANUAL" ? "by admin" : "by customer";
}