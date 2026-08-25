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

/**
 * Returns the UTC offset (in minutes, e.g. -420 for UTC-7) that `timeZone`
 * observes at `instant`. Handles DST because it asks Intl to render the
 * instant in that zone and compares it back to the UTC wall clock.
 */
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

/**
 * Converts a "YYYY-MM-DD" date + "HH:MM" wall-clock time that is meant to
 * represent local time in `timeZone` into the correct UTC instant.
 * Falls back to treating the wall clock as UTC when the zone is invalid,
 * matching the app's previous (timezone-less) behaviour.
 */
export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string | null | undefined,
): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  if (!timeZone || !isValidTimezone(timeZone)) return naiveUtc;

  // First pass: assume the zone's current offset, then correct once more
  // since the offset itself is a function of the (still unknown) instant —
  // two iterations converge for every real-world zone, including ones
  // with a DST transition on the given day.
  let guess = naiveUtc;
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutesAt(guess, timeZone);
    guess = new Date(naiveUtc.getTime() - offset * 60000);
  }
  return guess;
}

/**
 * Human-friendly "GMT+5:30" style offset label for a timezone right now.
 */
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
