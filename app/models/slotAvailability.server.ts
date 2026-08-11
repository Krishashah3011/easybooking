import type { EffectiveBookingSettings } from "./bookableProduct.server";

export type TimeSlot = {
  /** "HH:mm" in the shop's configured booking hours */
  start: string;
  end: string;
  /** Full ISO datetime for the slot start, in UTC */
  startsAt: string;
  /** How many more bookings this slot can accept right now */
  remainingCapacity: number;
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

/** "YYYY-MM-DD" -> day of week, 0 = Sunday ... 6 = Saturday, in UTC (dates are treated as calendar dates, not tied to a timezone). */
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

/**
 * Computes every bookable slot for a single date, given the resolved
 * (shop-defaults + product-overrides) settings and the set of blocked
 * dates that apply to this product ("YYYY-MM-DD" strings — shop-wide and
 * product-specific blackout dates should already be merged into this set
 * by the caller).
 *
 * `bookedCounts` is optional and lets a future phase (once actual Booking
 * records exist) pass in how many bookings already exist per slot, keyed
 * by the slot's ISO startsAt, so capacity can be enforced. It defaults to
 * empty, meaning every slot is treated as fully open.
 */
export function computeSlotsForDate(
  settings: EffectiveBookingSettings,
  dateStr: string,
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
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
    const startsAt = new Date(`${dateStr}T${minutesToTime(slotStartMin)}:00Z`);

    if (startsAt < earliestBookableAt) continue;

    const booked = bookedCounts.get(startsAt.toISOString()) ?? 0;
    const remainingCapacity = settings.maxBookingsPerSlot - booked;
    if (remainingCapacity <= 0) continue;

    slots.push({
      start: minutesToTime(slotStartMin),
      end: minutesToTime(slotEndMin),
      startsAt: startsAt.toISOString(),
      remainingCapacity,
    });
  }

  return slots;
}

/** Returns every "YYYY-MM-DD" in the given UTC month that has at least one open slot. */
export function getAvailableDatesInMonth(
  settings: EffectiveBookingSettings,
  year: number,
  month: number, // 1-12
  blackoutDates: Set<string>,
  now: Date = new Date(),
  bookedCounts: Map<string, number> = new Map(),
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
    );
    if (slots.length > 0) available.push(dateStr);
  }

  return available;
}