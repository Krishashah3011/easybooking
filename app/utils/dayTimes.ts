export type DayTimeEntry = { start: string; end: string };
export type DayTimeMap = Partial<Record<number, DayTimeEntry>>;

const TIME_RE_ML = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeML(valueML: unknown): valueML is string {
  return typeof valueML === "string" && TIME_RE_ML.test(valueML);
}

export function parseDayTimesJsonML(jsonML: unknown): DayTimeMap | null {
  if (!jsonML || typeof jsonML !== "object" || Array.isArray(jsonML)) return null;

  const mapML: DayTimeMap = {};
  let hasAnyML = false;

  for (const [keyML, valueML] of Object.entries(jsonML as Record<string, unknown>)) {
    const dayML = Number(keyML);
    if (!Number.isInteger(dayML) || dayML < 0 || dayML > 6) continue;
    const entryML = valueML as { start?: unknown; end?: unknown } | null;
    if (
      entryML &&
      isValidTimeML(entryML.start) &&
      isValidTimeML(entryML.end) &&
      entryML.end > entryML.start
    ) {
      mapML[dayML] = { start: entryML.start, end: entryML.end };
      hasAnyML = true;
    }
  }

  return hasAnyML ? mapML : null;
}

export function dayTimeMapFromLegacyML(
  workingDaysML: number[],
  startML: string,
  endML: string,
): DayTimeMap {
  const mapML: DayTimeMap = {};
  for (const dayML of workingDaysML) {
    mapML[dayML] = { start: startML, end: endML };
  }
  return mapML;
}

export function dayTimesToWorkingDaysCsvML(mapML: DayTimeMap): string {
  return Object.keys(mapML)
    .map(Number)
    .sort((aML, bML) => aML - bML)
    .join(",");
}

export function parseDayTimesFormValueML(rawML: string): {
  map: DayTimeMap | null;
  error?: string;
} {
  if (!rawML.trim()) return { map: null };

  let parsedML: unknown;
  try {
    parsedML = JSON.parse(rawML);
  } catch {
    return { map: null, error: "Couldn't read the day schedule." };
  }

  if (typeof parsedML !== "object" || parsedML === null || Array.isArray(parsedML)) {
    return { map: null, error: "Couldn't read the day schedule." };
  }

  const mapML: DayTimeMap = {};
  for (const [keyML, valueML] of Object.entries(parsedML as Record<string, unknown>)) {
    const dayML = Number(keyML);
    if (!Number.isInteger(dayML) || dayML < 0 || dayML > 6) {
      return { map: null, error: "Invalid day in schedule." };
    }
    const entryML = valueML as { start?: unknown; end?: unknown };
    if (!isValidTimeML(entryML?.start) || !isValidTimeML(entryML?.end)) {
      return { map: null, error: "Enter valid start and end times (HH:mm) for every selected day." };
    }
    if ((entryML.end as string) <= (entryML.start as string)) {
      return { map: null, error: "End time must be after start time for every selected day." };
    }
    mapML[dayML] = { start: entryML.start as string, end: entryML.end as string };
  }

  if (Object.keys(mapML).length === 0) {
    return { map: null, error: "Select at least one day, or clear the schedule to inherit the default." };
  }

  return { map: mapML };
}