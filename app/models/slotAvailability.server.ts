import type { EffectiveBookingSettings } from "./bookableProduct.server";
import { zonedTimeToUtc } from "../utils/timezones";

export type TimeSlot = {
  start: string;
  end: string;
  startsAt: string;
  remainingCapacity: number;
  available: boolean;
};

const MINUTES_IN_DAY = 24 * 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isWithinDateWindow(
  dateStr: string,
  startDate: Date | null,
  endDate: Date | null,
): boolean {
  if (startDate && dateStr < startDate.toISOString().slice(0, 10)) {
    return false;
  }
  if (endDate && dateStr > endDate.toISOString().slice(0, 10)) {
    return false;
  }
  return true;
}

export function computeSlotsForDate(
  settings: EffectiveBookingSettings,
  dateStr: string,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
  timeZone: string | null = null,
): TimeSlot[] {
  if (blackoutDates.has(dateStr)) return [];
  if (!settings.workingDays.includes(dayOfWeek(dateStr))) return [];
  if (
    !isWithinDateWindow(
      dateStr,
      settings.bookingStartDate,
      settings.bookingEndDate,
    )
  ) {
    return [];
  }

  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setUTCDate(maxAdvanceDate.getUTCDate() + settings.maxAdvanceDays);
  if (dateStr > maxAdvanceDate.toISOString().slice(0, 10)) return [];

  const stepMinutes = settings.slotDurationMinutes + settings.bufferMinutes;
  if (stepMinutes <= 0) return [];

  const dayStart = timeToMinutes(settings.dailyStartTime);
  const dayEnd = timeToMinutes(settings.dailyEndTime);
  const earliestBookableAt = new Date(
    now.getTime() + settings.minAdvanceHours * 60 * 60 * 1000,
  );

  const slots: TimeSlot[] = [];
  for (
    let slotStartMin = dayStart;
    slotStartMin + settings.slotDurationMinutes <= dayEnd &&
    slotStartMin < MINUTES_IN_DAY;
    slotStartMin += stepMinutes
  ) {
    const slotEndMin = slotStartMin + settings.slotDurationMinutes;
    const startsAt = zonedTimeToUtc(dateStr, minutesToTime(slotStartMin), timeZone);

    if (startsAt < earliestBookableAt) continue;

    const booked = bookedCounts.get(startsAt.toISOString()) ?? 0;
    const remainingCapacity = Math.max(0, settings.maxBookingsPerSlot - booked);

    slots.push({
      start: minutesToTime(slotStartMin),
      end: minutesToTime(slotEndMin),
      startsAt: startsAt.toISOString(),
      remainingCapacity,
      available: remainingCapacity > 0,
    });
  }

  return slots;
}

export function computeFullDayAvailability(
  settings: EffectiveBookingSettings,
  dateStr: string,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCount: number = 0,
): { available: boolean; remainingCapacity: number } {
  if (blackoutDates.has(dateStr)) return { available: false, remainingCapacity: 0 };
  if (!settings.workingDays.includes(dayOfWeek(dateStr))) {
    return { available: false, remainingCapacity: 0 };
  }
  if (
    !isWithinDateWindow(dateStr, settings.bookingStartDate, settings.bookingEndDate)
  ) {
    return { available: false, remainingCapacity: 0 };
  }

  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setUTCDate(maxAdvanceDate.getUTCDate() + settings.maxAdvanceDays);
  if (dateStr > maxAdvanceDate.toISOString().slice(0, 10)) {
    return { available: false, remainingCapacity: 0 };
  }

  const todayStr = now.toISOString().slice(0, 10);
  if (settings.minAdvanceHours > 0 && dateStr <= todayStr) {
    return { available: false, remainingCapacity: 0 };
  }

  const remainingCapacity = Math.max(0, settings.maxBookingsPerSlot - bookedCount);
  return { available: remainingCapacity > 0, remainingCapacity };
}

export function getAvailableFullDayDatesInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const available: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const startsAt = `${dateStr}T00:00:00.000Z`;
    const bookedCount = bookedCounts.get(startsAt) ?? 0;
    const result = computeFullDayAvailability(settings, dateStr, blackoutDates, now, bookedCount);
    if (result.available) available.push(dateStr);
  }

  return available;
}

export function computeMultiDayNightAvailability(
  settings: EffectiveBookingSettings,
  dateStr: string,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCount: number = 0,
): { available: boolean; remainingCapacity: number } {
  // Multi-day products (hotel rooms, rentals) are typically open every
  // day of the week, so — unlike SLOT/FULL_DAY — this deliberately does
  // NOT check settings.workingDays.
  if (blackoutDates.has(dateStr)) return { available: false, remainingCapacity: 0 };
  if (
    !isWithinDateWindow(dateStr, settings.bookingStartDate, settings.bookingEndDate)
  ) {
    return { available: false, remainingCapacity: 0 };
  }

  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setUTCDate(maxAdvanceDate.getUTCDate() + settings.maxAdvanceDays);
  if (dateStr > maxAdvanceDate.toISOString().slice(0, 10)) {
    return { available: false, remainingCapacity: 0 };
  }

  const todayStr = now.toISOString().slice(0, 10);
  if (settings.minAdvanceHours > 0 && dateStr <= todayStr) {
    return { available: false, remainingCapacity: 0 };
  }

  const remainingCapacity = Math.max(0, settings.maxBookingsPerSlot - bookedCount);
  return { available: remainingCapacity > 0, remainingCapacity };
}

// Same scan as getAvailableFullDayDatesInMonth, but returns remaining
// capacity for every day in the month (not just the available ones) so
// the storefront can show "X available" while the shopper is choosing a
// quantity, instead of only a plain available/unavailable flag.
export function getFullDayCapacityInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
): Record<string, number> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const capacity: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const startsAt = `${dateStr}T00:00:00.000Z`;
    const bookedCount = bookedCounts.get(startsAt) ?? 0;
    const result = computeFullDayAvailability(settings, dateStr, blackoutDates, now, bookedCount);
    capacity[dateStr] = result.remainingCapacity;
  }

  return capacity;
}

export function getAvailableMultiDayNightsInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedNightCounts: Map<string, number> = new Map(),
): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const available: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const bookedCount = bookedNightCounts.get(dateStr) ?? 0;
    const result = computeMultiDayNightAvailability(settings, dateStr, blackoutDates, now, bookedCount);
    if (result.available) available.push(dateStr);
  }

  return available;
}

// Same as getFullDayCapacityInMonth, but for MULTI_DAY nights (e.g. how
// many identical rooms/units are still free for each night).
export function getMultiDayCapacityInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedNightCounts: Map<string, number> = new Map(),
): Record<string, number> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const capacity: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const bookedCount = bookedNightCounts.get(dateStr) ?? 0;
    const result = computeMultiDayNightAvailability(settings, dateStr, blackoutDates, now, bookedCount);
    capacity[dateStr] = result.remainingCapacity;
  }

  return capacity;
}

export function getAvailableDatesInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
  timeZone: string | null = null,
): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const available: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slots = computeSlotsForDate(
      settings,
      dateStr,
      blackoutDates,
      now,
      bookedCounts,
      timeZone,
    );
    if (slots.some((s) => s.available)) available.push(dateStr);
  }

  return available;
}