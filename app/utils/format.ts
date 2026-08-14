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