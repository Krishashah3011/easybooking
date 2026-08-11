import type { BookingSettings } from "@prisma/client";
import prisma from "../db.server";

export const DEFAULT_BOOKING_SETTINGS = {
  workingDays: "1,2,3,4,5",
  dailyStartTime: "09:00",
  dailyEndTime: "17:00",
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  minAdvanceHours: 0,
  maxAdvanceDays: 30,
  maxBookingsPerSlot: 1,
  bookingStartDate: null as Date | null,
  bookingEndDate: null as Date | null,
};

export type BookingSettingsFormValues = {
  workingDays: number[];
  dailyStartTime: string;
  dailyEndTime: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxBookingsPerSlot: number;
  bookingStartDate: string | null; // "YYYY-MM-DD" or null
  bookingEndDate: string | null;
};

export type BookingSettingsFieldErrors = Partial<
  Record<keyof BookingSettingsFormValues, string>
>;

/**
 * Fetches the BookingSettings row for a shop, creating one with defaults
 * if it doesn't exist yet (every shop should always have exactly one row).
 */
export async function getBookingSettings(
  shop: string,
): Promise<BookingSettings> {
  const existing = await prisma.bookingSettings.findUnique({
    where: { shop },
  });

  if (existing) {
    return existing;
  }

  return prisma.bookingSettings.create({
    data: { shop, ...DEFAULT_BOOKING_SETTINGS },
  });
}

/**
 * Converts a BookingSettings DB row into the shape the settings form uses
 * (working days as a number array, dates as "YYYY-MM-DD" strings).
 */
export function toFormValues(
  settings: BookingSettings,
): BookingSettingsFormValues {
  return {
    workingDays: parseWorkingDays(settings.workingDays),
    dailyStartTime: settings.dailyStartTime,
    dailyEndTime: settings.dailyEndTime,
    slotDurationMinutes: settings.slotDurationMinutes,
    bufferMinutes: settings.bufferMinutes,
    minAdvanceHours: settings.minAdvanceHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    maxBookingsPerSlot: settings.maxBookingsPerSlot,
    bookingStartDate: toDateInputValue(settings.bookingStartDate),
    bookingEndDate: toDateInputValue(settings.bookingEndDate),
  };
}

export function parseWorkingDays(csv: string): number[] {
  return csv
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

function toDateInputValue(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parses raw multipart/form-data values from the settings form into typed
 * values, returning field-level errors for anything invalid. Nothing is
 * persisted here — this only validates and shapes the input.
 */
export function parseBookingSettingsForm(formData: FormData): {
  values: BookingSettingsFormValues;
  errors: BookingSettingsFieldErrors;
} {
  const errors: BookingSettingsFieldErrors = {};

  const workingDays = String(formData.get("workingDays") ?? "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (workingDays.length === 0) {
    errors.workingDays = "Select at least one working day.";
  }

  const dailyStartTime = String(formData.get("dailyStartTime") ?? "");
  const dailyEndTime = String(formData.get("dailyEndTime") ?? "");
  if (!TIME_RE.test(dailyStartTime)) {
    errors.dailyStartTime = "Enter a valid start time (HH:mm).";
  }
  if (!TIME_RE.test(dailyEndTime)) {
    errors.dailyEndTime = "Enter a valid end time (HH:mm).";
  }
  if (
    !errors.dailyStartTime &&
    !errors.dailyEndTime &&
    dailyEndTime <= dailyStartTime
  ) {
    errors.dailyEndTime = "End time must be after start time.";
  }

  const slotDurationMinutes = Number(formData.get("slotDurationMinutes"));
  if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 5) {
    errors.slotDurationMinutes = "Slot duration must be at least 5 minutes.";
  }

  const bufferMinutes = Number(formData.get("bufferMinutes"));
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
    errors.bufferMinutes = "Buffer time can't be negative.";
  }

  const minAdvanceHours = Number(formData.get("minAdvanceHours"));
  if (!Number.isInteger(minAdvanceHours) || minAdvanceHours < 0) {
    errors.minAdvanceHours = "Minimum advance time can't be negative.";
  }

  const maxAdvanceDays = Number(formData.get("maxAdvanceDays"));
  if (!Number.isInteger(maxAdvanceDays) || maxAdvanceDays < 1) {
    errors.maxAdvanceDays = "Maximum advance days must be at least 1.";
  }

  const maxBookingsPerSlot = Number(formData.get("maxBookingsPerSlot"));
  if (!Number.isInteger(maxBookingsPerSlot) || maxBookingsPerSlot < 1) {
    errors.maxBookingsPerSlot = "Capacity per slot must be at least 1.";
  }

  const bookingStartDateRaw = String(formData.get("bookingStartDate") ?? "");
  const bookingEndDateRaw = String(formData.get("bookingEndDate") ?? "");
  const bookingStartDate = bookingStartDateRaw || null;
  const bookingEndDate = bookingEndDateRaw || null;
  if (bookingStartDate && bookingEndDate && bookingEndDate < bookingStartDate) {
    errors.bookingEndDate = "End date must be after start date.";
  }

  return {
    values: {
      workingDays,
      dailyStartTime,
      dailyEndTime,
      slotDurationMinutes,
      bufferMinutes,
      minAdvanceHours,
      maxAdvanceDays,
      maxBookingsPerSlot,
      bookingStartDate,
      bookingEndDate,
    },
    errors,
  };
}

export async function upsertBookingSettings(
  shop: string,
  values: BookingSettingsFormValues,
): Promise<BookingSettings> {
  const data = {
    workingDays: values.workingDays.join(","),
    dailyStartTime: values.dailyStartTime,
    dailyEndTime: values.dailyEndTime,
    slotDurationMinutes: values.slotDurationMinutes,
    bufferMinutes: values.bufferMinutes,
    minAdvanceHours: values.minAdvanceHours,
    maxAdvanceDays: values.maxAdvanceDays,
    maxBookingsPerSlot: values.maxBookingsPerSlot,
    bookingStartDate: values.bookingStartDate
      ? new Date(values.bookingStartDate)
      : null,
    bookingEndDate: values.bookingEndDate
      ? new Date(values.bookingEndDate)
      : null,
  };

  return prisma.bookingSettings.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}