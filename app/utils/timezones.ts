export const COMMON_TIMEZONES_ML: string[] = [
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

export function isValidTimezoneML(timeZoneML: string): boolean {
  if (!timeZoneML) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZoneML }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function offsetMinutesAtML(instantML: Date, timeZoneML: string): number {
  const dtfML = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneML,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partsML = dtfML.formatToParts(instantML);
  const getML = (typeML: string) =>
    Number(partsML.find((pML) => pML.type === typeML)?.value ?? "0");

  const asUtcML = Date.UTC(
    getML("year"),
    getML("month") - 1,
    getML("day"),
    getML("hour"),
    getML("minute"),
    getML("second"),
  );
  return (asUtcML - instantML.getTime()) / 60000;
}

export function zonedTimeToUtcML(
  dateStrML: string,
  timeStrML: string,
  timeZoneML: string | null | undefined,
): Date {
  const naiveUtcML = new Date(`${dateStrML}T${timeStrML}:00Z`);
  if (!timeZoneML || !isValidTimezoneML(timeZoneML)) return naiveUtcML;

  let guessML = naiveUtcML;
  for (let iML = 0; iML < 2; iML++) {
    const offsetML = offsetMinutesAtML(guessML, timeZoneML);
    guessML = new Date(naiveUtcML.getTime() - offsetML * 60000);
  }
  return guessML;
}

export function dateStrInTimezoneML(
  instantML: Date,
  timeZoneML: string | null | undefined,
): string {
  const zoneML = timeZoneML && isValidTimezoneML(timeZoneML) ? timeZoneML : "UTC";
  const partsML = new Intl.DateTimeFormat("en-US", {
    timeZone: zoneML,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instantML);
  const getML = (typeML: string) => partsML.find((pML) => pML.type === typeML)?.value ?? "";
  return `${getML("year")}-${getML("month")}-${getML("day")}`;
}

function addDaysToDateStrML(dateStrML: string, daysML: number): string {
  const dML = new Date(`${dateStrML}T00:00:00.000Z`);
  dML.setUTCDate(dML.getUTCDate() + daysML);
  return dML.toISOString().slice(0, 10);
}

export function localDayRangeUtcML(
  dateStrML: string,
  timeZoneML: string | null | undefined,
): { start: Date; end: Date } {
  const startML = zonedTimeToUtcML(dateStrML, "00:00", timeZoneML);
  const nextDayStartML = zonedTimeToUtcML(addDaysToDateStrML(dateStrML, 1), "00:00", timeZoneML);
  return { start: startML, end: new Date(nextDayStartML.getTime() - 1) };
}

export function localMonthRangeUtcML(
  yearML: number,
  monthML: number,
  timeZoneML: string | null | undefined,
): { start: Date; end: Date } {
  const firstML = `${yearML}-${String(monthML).padStart(2, "0")}-01`;
  const nextYearML = monthML === 12 ? yearML + 1 : yearML;
  const nextMonthML = monthML === 12 ? 1 : monthML + 1;
  const nextFirstML = `${nextYearML}-${String(nextMonthML).padStart(2, "0")}-01`;
  const startML = zonedTimeToUtcML(firstML, "00:00", timeZoneML);
  const nextStartML = zonedTimeToUtcML(nextFirstML, "00:00", timeZoneML);
  return { start: startML, end: new Date(nextStartML.getTime() - 1) };
}

export function formatInstantInTimezoneML(
  valueML: string | Date,
  timeZoneML: string | null | undefined,
): string {
  const dateML = typeof valueML === "string" ? new Date(valueML) : valueML;
  if (Number.isNaN(dateML.getTime())) return String(valueML);

  const zoneML = timeZoneML && isValidTimezoneML(timeZoneML) ? timeZoneML : "UTC";
  const dtfML = new Intl.DateTimeFormat("en-GB", {
    timeZone: zoneML,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const partsML = dtfML.formatToParts(dateML);
  const getML = (typeML: string) => partsML.find((pML) => pML.type === typeML)?.value ?? "";

  const hour24ML = Number(getML("hour")) % 24;
  const periodML = hour24ML >= 12 ? "PM" : "AM";
  const hour12ML = hour24ML % 12 === 0 ? 12 : hour24ML % 12;

  return `${getML("day")}-${getML("month")}-${getML("year")}, ${hour12ML}:${getML("minute")} ${periodML}`;
}

export function timezoneOffsetLabelML(timeZoneML: string): string {
  try {
    const partsML = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZoneML,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return partsML.find((pML) => pML.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}