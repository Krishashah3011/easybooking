import type { EffectiveBookingSettings } from "./bookableProduct.server";
import { zonedTimeToUtcML } from "../utils/timezones";

export type TimeSlot = {
  start: string;
  end: string;
  startsAt: string;
  remainingCapacity: number;
  available: boolean;
};

const MINUTES_IN_DAY_ML = 24 * 60;

function timeToMinutesML(timeML: string): number {
  const [hML, mML] = timeML.split(":").map(Number);
  return hML * 60 + mML;
}

function minutesToTimeML(minutesML: number): string {
  const hML = Math.floor(minutesML / 60)
    .toString()
    .padStart(2, "0");
  const mML = (minutesML % 60).toString().padStart(2, "0");
  return `${hML}:${mML}`;
}

export function dayOfWeekML(dateStrML: string): number {
  const [yML, mML, dML] = dateStrML.split("-").map(Number);
  return new Date(Date.UTC(yML, mML - 1, dML)).getUTCDay();
}

function isWithinDateWindowML(
  dateStrML: string,
  startDateML: Date | null,
  endDateML: Date | null,
): boolean {
  if (startDateML && dateStrML < startDateML.toISOString().slice(0, 10)) {
    return false;
  }
  if (endDateML && dateStrML > endDateML.toISOString().slice(0, 10)) {
    return false;
  }
  return true;
}

export function computeSlotsForDateML(
  settingsML: EffectiveBookingSettings,
  dateStrML: string,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountsML: Map<string, number> = new Map(),
  timeZoneML: string | null = null,
): TimeSlot[] {
  if (blackoutDatesML.has(dateStrML)) return [];
  const dayConfigML = settingsML.dayTimes[dayOfWeekML(dateStrML)];
  if (!dayConfigML) return [];
  if (
    !isWithinDateWindowML(
      dateStrML,
      settingsML.bookingStartDate,
      settingsML.bookingEndDate,
    )
  ) {
    return [];
  }

  const maxAdvanceDateML = new Date(nowML);
  maxAdvanceDateML.setUTCDate(maxAdvanceDateML.getUTCDate() + settingsML.maxAdvanceDays);
  if (dateStrML > maxAdvanceDateML.toISOString().slice(0, 10)) return [];

  const stepMinutesML = settingsML.slotDurationMinutes + settingsML.bufferMinutes;
  if (stepMinutesML <= 0) return [];

  const dayStartML = timeToMinutesML(dayConfigML.start);
  const dayEndML = timeToMinutesML(dayConfigML.end);
  const earliestBookableAtML = new Date(
    nowML.getTime() + settingsML.minAdvanceHours * 60 * 60 * 1000,
  );

  const slotsML: TimeSlot[] = [];
  for (
    let slotStartMinML = dayStartML;
    slotStartMinML + settingsML.slotDurationMinutes <= dayEndML &&
    slotStartMinML < MINUTES_IN_DAY_ML;
    slotStartMinML += stepMinutesML
  ) {
    const slotEndMinML = slotStartMinML + settingsML.slotDurationMinutes;
    const startsAtML = zonedTimeToUtcML(dateStrML, minutesToTimeML(slotStartMinML), timeZoneML);

    if (startsAtML < earliestBookableAtML) continue;

    const bookedML = bookedCountsML.get(startsAtML.toISOString()) ?? 0;
    const remainingCapacityML = Math.max(0, settingsML.maxBookingsPerSlot - bookedML);

    slotsML.push({
      start: minutesToTimeML(slotStartMinML),
      end: minutesToTimeML(slotEndMinML),
      startsAt: startsAtML.toISOString(),
      remainingCapacity: remainingCapacityML,
      available: remainingCapacityML > 0,
    });
  }

  return slotsML;
}

export function computeFullDayAvailabilityML(
  settingsML: EffectiveBookingSettings,
  dateStrML: string,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountML: number = 0,
): { available: boolean; remainingCapacity: number } {
  if (blackoutDatesML.has(dateStrML)) return { available: false, remainingCapacity: 0 };
  if (!settingsML.workingDays.includes(dayOfWeekML(dateStrML))) {
    return { available: false, remainingCapacity: 0 };
  }
  if (
    !isWithinDateWindowML(dateStrML, settingsML.bookingStartDate, settingsML.bookingEndDate)
  ) {
    return { available: false, remainingCapacity: 0 };
  }

  const maxAdvanceDateML = new Date(nowML);
  maxAdvanceDateML.setUTCDate(maxAdvanceDateML.getUTCDate() + settingsML.maxAdvanceDays);
  if (dateStrML > maxAdvanceDateML.toISOString().slice(0, 10)) {
    return { available: false, remainingCapacity: 0 };
  }

  const todayStrML = nowML.toISOString().slice(0, 10);
  if (settingsML.minAdvanceHours > 0 && dateStrML <= todayStrML) {
    return { available: false, remainingCapacity: 0 };
  }

  const remainingCapacityML = Math.max(0, settingsML.maxBookingsPerSlot - bookedCountML);
  return { available: remainingCapacityML > 0, remainingCapacity: remainingCapacityML };
}

export function getAvailableFullDayDatesInMonthML(
  settingsML: EffectiveBookingSettings,
  yearML: number,
  monthML: number,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountsML: Map<string, number> = new Map(),
): string[] {
  const daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
  const availableML: string[] = [];

  for (let dayML = 1; dayML <= daysInMonthML; dayML++) {
    const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
    const startsAtML = `${dateStrML}T00:00:00.000Z`;
    const bookedCountML = bookedCountsML.get(startsAtML) ?? 0;
    const resultML = computeFullDayAvailabilityML(settingsML, dateStrML, blackoutDatesML, nowML, bookedCountML);
    if (resultML.available) availableML.push(dateStrML);
  }

  return availableML;
}

export function computeMultiDayNightAvailabilityML(
  settingsML: EffectiveBookingSettings,
  dateStrML: string,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountML: number = 0,
): { available: boolean; remainingCapacity: number } {
  if (blackoutDatesML.has(dateStrML)) return { available: false, remainingCapacity: 0 };
  if (
    !isWithinDateWindowML(dateStrML, settingsML.bookingStartDate, settingsML.bookingEndDate)
  ) {
    return { available: false, remainingCapacity: 0 };
  }

  const maxAdvanceDateML = new Date(nowML);
  maxAdvanceDateML.setUTCDate(maxAdvanceDateML.getUTCDate() + settingsML.maxAdvanceDays);
  if (dateStrML > maxAdvanceDateML.toISOString().slice(0, 10)) {
    return { available: false, remainingCapacity: 0 };
  }

  const todayStrML = nowML.toISOString().slice(0, 10);
  if (settingsML.minAdvanceHours > 0 && dateStrML <= todayStrML) {
    return { available: false, remainingCapacity: 0 };
  }

  const remainingCapacityML = Math.max(0, settingsML.maxBookingsPerSlot - bookedCountML);
  return { available: remainingCapacityML > 0, remainingCapacity: remainingCapacityML };
}

export function getFullDayCapacityInMonthML(
  settingsML: EffectiveBookingSettings,
  yearML: number,
  monthML: number,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountsML: Map<string, number> = new Map(),
): Record<string, number> {
  const daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
  const capacityML: Record<string, number> = {};

  for (let dayML = 1; dayML <= daysInMonthML; dayML++) {
    const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
    const startsAtML = `${dateStrML}T00:00:00.000Z`;
    const bookedCountML = bookedCountsML.get(startsAtML) ?? 0;
    const resultML = computeFullDayAvailabilityML(settingsML, dateStrML, blackoutDatesML, nowML, bookedCountML);
    capacityML[dateStrML] = resultML.remainingCapacity;
  }

  return capacityML;
}

export function getAvailableMultiDayNightsInMonthML(
  settingsML: EffectiveBookingSettings,
  yearML: number,
  monthML: number,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedNightCountsML: Map<string, number> = new Map(),
): string[] {
  const daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
  const availableML: string[] = [];

  for (let dayML = 1; dayML <= daysInMonthML; dayML++) {
    const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
    const bookedCountML = bookedNightCountsML.get(dateStrML) ?? 0;
    const resultML = computeMultiDayNightAvailabilityML(settingsML, dateStrML, blackoutDatesML, nowML, bookedCountML);
    if (resultML.available) availableML.push(dateStrML);
  }

  return availableML;
}

export function getMultiDayCapacityInMonthML(
  settingsML: EffectiveBookingSettings,
  yearML: number,
  monthML: number,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedNightCountsML: Map<string, number> = new Map(),
): Record<string, number> {
  const daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
  const capacityML: Record<string, number> = {};

  for (let dayML = 1; dayML <= daysInMonthML; dayML++) {
    const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
    const bookedCountML = bookedNightCountsML.get(dateStrML) ?? 0;
    const resultML = computeMultiDayNightAvailabilityML(settingsML, dateStrML, blackoutDatesML, nowML, bookedCountML);
    capacityML[dateStrML] = resultML.remainingCapacity;
  }

  return capacityML;
}

export function getAvailableDatesInMonthML(
  settingsML: EffectiveBookingSettings,
  yearML: number,
  monthML: number,
  blackoutDatesML: Set<string>,
  nowML: Date = new Date(),
  bookedCountsML: Map<string, number> = new Map(),
  timeZoneML: string | null = null,
): string[] {
  const daysInMonthML = new Date(Date.UTC(yearML, monthML, 0)).getUTCDate();
  const availableML: string[] = [];

  for (let dayML = 1; dayML <= daysInMonthML; dayML++) {
    const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
    const slotsML = computeSlotsForDateML(
      settingsML,
      dateStrML,
      blackoutDatesML,
      nowML,
      bookedCountsML,
      timeZoneML,
    );
    if (slotsML.some((sML) => sML.available)) availableML.push(dateStrML);
  }

  return availableML;
}