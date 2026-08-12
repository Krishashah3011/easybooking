export type TimeFormat = "12h" | "24h";

export function formatDateDisplay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function formatTimeDisplay(time: string, format: TimeFormat): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  if (format === "24h") return time;

  const hour24 = Number(match[1]);
  const minute = match[2];
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

export function formatTimeRangeDisplay(
  start: string,
  end: string,
  format: TimeFormat,
): string {
  return `${formatTimeDisplay(start, format)} \u2013 ${formatTimeDisplay(end, format)}`;
}