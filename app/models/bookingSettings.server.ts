import type { BookingSettings } from "@prisma/client";
import prisma from "../db.server";
import {
  dayTimeMapFromLegacy,
  parseDayTimesFormValue,
  parseDayTimesJson,
  type DayTimeMap,
} from "../utils/dayTimes";

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
  dayTimes: DayTimeMap | null;
  slotDurationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxBookingsPerSlot: number;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
};

export type BookingSettingsFieldErrors = Partial<
  Record<keyof BookingSettingsFormValues, string>
>;

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

export function toFormValues(
  settings: BookingSettings,
): BookingSettingsFormValues {
  const dayTimes =
    parseDayTimesJson(settings.dayTimes) ??
    dayTimeMapFromLegacy(
      parseWorkingDays(settings.workingDays),
      settings.dailyStartTime,
      settings.dailyEndTime,
    );

  return {
    workingDays: parseWorkingDays(settings.workingDays),
    dailyStartTime: settings.dailyStartTime,
    dailyEndTime: settings.dailyEndTime,
    dayTimes,
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

export const MAX_FROM_NAME_LENGTH = 60;

/** Parses just the sender-name field, shared by the email settings form. */
export function parseEmailFromName(formData: FormData): {
  value: string | null;
  error?: string;
} {
  const raw = String(formData.get("emailFromName") ?? "").trim();
  if (raw.length > MAX_FROM_NAME_LENGTH) {
    return { value: raw, error: `Keep it under ${MAX_FROM_NAME_LENGTH} characters.` };
  }
  return { value: raw || null };
}

/** Updates only the sender-name field, without touching the rest of booking settings. */
export async function updateEmailFromName(
  shop: string,
  emailFromName: string | null,
): Promise<void> {
  await prisma.bookingSettings.upsert({
    where: { shop },
    create: { shop, ...DEFAULT_BOOKING_SETTINGS, emailFromName },
    update: { emailFromName },
  });
}

export function parseBookingSettingsForm(formData: FormData): {
  values: BookingSettingsFormValues;
  errors: BookingSettingsFieldErrors;
} {
  const errors: BookingSettingsFieldErrors = {};

  const dayTimesRaw = String(formData.get("dayTimesJson") ?? "");
  const dayTimesResult = parseDayTimesFormValue(dayTimesRaw);
  if (!dayTimesResult.map) {
    errors.dayTimes =
      dayTimesResult.error ?? "Select at least one working day and set its hours.";
  }
  const dayTimes: DayTimeMap = dayTimesResult.map ?? {};

  const workingDays = Object.keys(dayTimes)
    .map(Number)
    .sort((a, b) => a - b);

  const dayEntries = Object.values(dayTimes) as { start: string; end: string }[];
  const dailyStartTime =
    dayEntries.length > 0
      ? dayEntries.reduce((min, e) => (e.start < min ? e.start : min), dayEntries[0].start)
      : "09:00";
  const dailyEndTime =
    dayEntries.length > 0
      ? dayEntries.reduce((max, e) => (e.end > max ? e.end : max), dayEntries[0].end)
      : "17:00";

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
      dayTimes,
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
    dayTimes: values.dayTimes,
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