export const COMMON_TIMEZONES: string[] = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Pacific/Auckland",
];

export function listTimezones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported && supported.length > 0) return supported;
  } catch {}
  return COMMON_TIMEZONES;
}

export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function offsetMinutesAt(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - instant.getTime()) / 60000;
}

export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string | null | undefined,
): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  if (!timeZone || !isValidTimezone(timeZone)) return naiveUtc;

  let guess = naiveUtc;
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutesAt(guess, timeZone);
    guess = new Date(naiveUtc.getTime() - offset * 60000);
  }
  return guess;
}

// Calendar date (YYYY-MM-DD) of an instant in the given timezone (UTC if none).
export function dateStrInTimezone(
  instant: Date,
  timeZone: string | null | undefined,
): string {
  const zone = timeZone && isValidTimezone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// UTC range covering one calendar day *in the given timezone*. Slot start times
// are stored as UTC instants, so counting bookings for a local day must use
// this range, not the UTC day (they differ for any non-UTC timezone).
export function localDayRangeUtc(
  dateStr: string,
  timeZone: string | null | undefined,
): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateStr, "00:00", timeZone);
  const nextDayStart = zonedTimeToUtc(addDaysToDateStr(dateStr, 1), "00:00", timeZone);
  return { start, end: new Date(nextDayStart.getTime() - 1) };
}

// UTC range covering one calendar month (month is 1-12) in the given timezone.
export function localMonthRangeUtc(
  year: number,
  month: number,
  timeZone: string | null | undefined,
): { start: Date; end: Date } {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextFirst = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const start = zonedTimeToUtc(first, "00:00", timeZone);
  const nextStart = zonedTimeToUtc(nextFirst, "00:00", timeZone);
  return { start, end: new Date(nextStart.getTime() - 1) };
}

export function formatInstantInTimezone(
  value: string | Date,
  timeZone: string | null | undefined,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  const zone = timeZone && isValidTimezone(timeZone) ? timeZone : "UTC";
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}-${get("month")}-${get("year")}, ${get("hour")}:${get("minute")}`;
}

export function timezoneOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}