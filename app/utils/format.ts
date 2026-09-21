export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

function to12Hour(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return time;
  let hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

export function formatTimeRangeDisplay(start: string, end: string): string {
  return `${to12Hour(start)} \u2013 ${to12Hour(end)}`;
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