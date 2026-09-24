export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function to12Hour(time: string): string {
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

export function bookingSourceLabel(source: string): string {
  return source === "ADMIN_MANUAL" ? "by admin" : "by customer";
}