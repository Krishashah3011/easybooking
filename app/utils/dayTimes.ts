export type DayTimeEntry = { start: string; end: string };
export type DayTimeMap = Partial<Record<number, DayTimeEntry>>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

export function parseDayTimesJson(json: unknown): DayTimeMap | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;

  const map: DayTimeMap = {};
  let hasAny = false;

  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const entry = value as { start?: unknown; end?: unknown } | null;
    if (
      entry &&
      isValidTime(entry.start) &&
      isValidTime(entry.end) &&
      entry.end > entry.start
    ) {
      map[day] = { start: entry.start, end: entry.end };
      hasAny = true;
    }
  }

  return hasAny ? map : null;
}

export function dayTimeMapFromLegacy(
  workingDays: number[],
  start: string,
  end: string,
): DayTimeMap {
  const map: DayTimeMap = {};
  for (const day of workingDays) {
    map[day] = { start, end };
  }
  return map;
}

export function dayTimesToWorkingDaysCsv(map: DayTimeMap): string {
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .join(",");
}

export function parseDayTimesFormValue(raw: string): {
  map: DayTimeMap | null;
  error?: string;
} {
  if (!raw.trim()) return { map: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { map: null, error: "Couldn't read the day schedule." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { map: null, error: "Couldn't read the day schedule." };
  }

  const map: DayTimeMap = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return { map: null, error: "Invalid day in schedule." };
    }
    const entry = value as { start?: unknown; end?: unknown };
    if (!isValidTime(entry?.start) || !isValidTime(entry?.end)) {
      return { map: null, error: "Enter valid start and end times (HH:mm) for every selected day." };
    }
    if ((entry.end as string) <= (entry.start as string)) {
      return { map: null, error: "End time must be after start time for every selected day." };
    }
    map[day] = { start: entry.start as string, end: entry.end as string };
  }

  if (Object.keys(map).length === 0) {
    return { map: null, error: "Select at least one day, or clear the schedule to inherit the default." };
  }

  return { map };
}