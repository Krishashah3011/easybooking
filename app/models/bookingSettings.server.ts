import type { BookingSettings } from "@prisma/client";
import prismaML from "../db.server";
import {
  dayTimeMapFromLegacyML,
  parseDayTimesFormValueML,
  parseDayTimesJsonML,
  type DayTimeMap,
} from "../utils/dayTimes";

export const DEFAULT_BOOKING_SETTINGS_ML = {
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

export async function getBookingSettingsML(
  shopML: string,
): Promise<BookingSettings> {
  const existingML = await prismaML.bookingSettings.findUnique({
    where: { shop: shopML },
  });

  if (existingML) {
    return existingML;
  }

  return prismaML.bookingSettings.create({
    data: { shop: shopML, ...DEFAULT_BOOKING_SETTINGS_ML },
  });
}

export function toFormValuesML(
  settingsML: BookingSettings,
): BookingSettingsFormValues {
  const dayTimesML =
    parseDayTimesJsonML(settingsML.dayTimes) ??
    dayTimeMapFromLegacyML(
      parseWorkingDaysML(settingsML.workingDays),
      settingsML.dailyStartTime,
      settingsML.dailyEndTime,
    );

  return {
    workingDays: parseWorkingDaysML(settingsML.workingDays),
    dailyStartTime: settingsML.dailyStartTime,
    dailyEndTime: settingsML.dailyEndTime,
    dayTimes: dayTimesML,
    slotDurationMinutes: settingsML.slotDurationMinutes,
    bufferMinutes: settingsML.bufferMinutes,
    minAdvanceHours: settingsML.minAdvanceHours,
    maxAdvanceDays: settingsML.maxAdvanceDays,
    maxBookingsPerSlot: settingsML.maxBookingsPerSlot,
    bookingStartDate: toDateInputValueML(settingsML.bookingStartDate),
    bookingEndDate: toDateInputValueML(settingsML.bookingEndDate),
  };
}

export function parseWorkingDaysML(csvML: string): number[] {
  return csvML
    .split(",")
    .map((partML) => Number(partML.trim()))
    .filter((nML) => Number.isInteger(nML) && nML >= 0 && nML <= 6);
}

function toDateInputValueML(dateML: Date | null): string | null {
  if (!dateML) return null;
  return dateML.toISOString().slice(0, 10);
}

export const MAX_FROM_NAME_LENGTH_ML = 60;

export function parseEmailFromNameML(formDataML: FormData): {
  value: string | null;
  error?: string;
} {
  const rawML = String(formDataML.get("emailFromName") ?? "").trim();
  if (rawML.length > MAX_FROM_NAME_LENGTH_ML) {
    return { value: rawML, error: `Keep it under ${MAX_FROM_NAME_LENGTH_ML} characters.` };
  }
  return { value: rawML || null };
}

export async function updateEmailFromNameML(
  shopML: string,
  emailFromNameML: string | null,
): Promise<void> {
  await prismaML.bookingSettings.upsert({
    where: { shop: shopML },
    create: { shop: shopML, ...DEFAULT_BOOKING_SETTINGS_ML, emailFromName: emailFromNameML },
    update: { emailFromName: emailFromNameML },
  });
}

export function parseBookingSettingsFormML(formDataML: FormData): {
  values: BookingSettingsFormValues;
  errors: BookingSettingsFieldErrors;
} {
  const errorsML: BookingSettingsFieldErrors = {};

  const dayTimesRawML = String(formDataML.get("dayTimesJson") ?? "");
  const dayTimesResultML = parseDayTimesFormValueML(dayTimesRawML);
  if (!dayTimesResultML.map) {
    errorsML.dayTimes =
      dayTimesResultML.error ?? "Select at least one working day and set its hours.";
  }
  const dayTimesML: DayTimeMap = dayTimesResultML.map ?? {};

  const workingDaysML = Object.keys(dayTimesML)
    .map(Number)
    .sort((aML, bML) => aML - bML);

  const dayEntriesML = Object.values(dayTimesML) as { start: string; end: string }[];
  const dailyStartTimeML =
    dayEntriesML.length > 0
      ? dayEntriesML.reduce((minML, eML) => (eML.start < minML ? eML.start : minML), dayEntriesML[0].start)
      : "09:00";
  const dailyEndTimeML =
    dayEntriesML.length > 0
      ? dayEntriesML.reduce((maxML, eML) => (eML.end > maxML ? eML.end : maxML), dayEntriesML[0].end)
      : "17:00";

  const slotDurationMinutesML = Number(formDataML.get("slotDurationMinutes"));
  if (!Number.isInteger(slotDurationMinutesML) || slotDurationMinutesML < 5) {
    errorsML.slotDurationMinutes = "Slot duration must be at least 5 minutes.";
  }

  const bufferMinutesML = Number(formDataML.get("bufferMinutes"));
  if (!Number.isInteger(bufferMinutesML) || bufferMinutesML < 0) {
    errorsML.bufferMinutes = "Buffer time can't be negative.";
  }

  const minAdvanceHoursML = Number(formDataML.get("minAdvanceHours"));
  if (!Number.isInteger(minAdvanceHoursML) || minAdvanceHoursML < 0) {
    errorsML.minAdvanceHours = "Minimum advance time can't be negative.";
  }

  const maxAdvanceDaysML = Number(formDataML.get("maxAdvanceDays"));
  if (!Number.isInteger(maxAdvanceDaysML) || maxAdvanceDaysML < 1) {
    errorsML.maxAdvanceDays = "Maximum advance days must be at least 1.";
  }

  const maxBookingsPerSlotML = Number(formDataML.get("maxBookingsPerSlot"));
  if (!Number.isInteger(maxBookingsPerSlotML) || maxBookingsPerSlotML < 1) {
    errorsML.maxBookingsPerSlot = "Capacity per slot must be at least 1.";
  }

  const bookingStartDateRawML = String(formDataML.get("bookingStartDate") ?? "");
  const bookingEndDateRawML = String(formDataML.get("bookingEndDate") ?? "");
  const bookingStartDateML = bookingStartDateRawML || null;
  const bookingEndDateML = bookingEndDateRawML || null;
  if (bookingStartDateML && bookingEndDateML && bookingEndDateML < bookingStartDateML) {
    errorsML.bookingEndDate = "End date must be after start date.";
  }

  return {
    values: {
      workingDays: workingDaysML,
      dailyStartTime: dailyStartTimeML,
      dailyEndTime: dailyEndTimeML,
      dayTimes: dayTimesML,
      slotDurationMinutes: slotDurationMinutesML,
      bufferMinutes: bufferMinutesML,
      minAdvanceHours: minAdvanceHoursML,
      maxAdvanceDays: maxAdvanceDaysML,
      maxBookingsPerSlot: maxBookingsPerSlotML,
      bookingStartDate: bookingStartDateML,
      bookingEndDate: bookingEndDateML,
    },
    errors: errorsML,
  };
}

export async function upsertBookingSettingsML(
  shopML: string,
  valuesML: BookingSettingsFormValues,
): Promise<BookingSettings> {
  const dataML = {
    workingDays: valuesML.workingDays.join(","),
    dailyStartTime: valuesML.dailyStartTime,
    dailyEndTime: valuesML.dailyEndTime,
    dayTimes: valuesML.dayTimes,
    slotDurationMinutes: valuesML.slotDurationMinutes,
    bufferMinutes: valuesML.bufferMinutes,
    minAdvanceHours: valuesML.minAdvanceHours,
    maxAdvanceDays: valuesML.maxAdvanceDays,
    maxBookingsPerSlot: valuesML.maxBookingsPerSlot,
    bookingStartDate: valuesML.bookingStartDate
      ? new Date(valuesML.bookingStartDate)
      : null,
    bookingEndDate: valuesML.bookingEndDate
      ? new Date(valuesML.bookingEndDate)
      : null,
  };

  return prismaML.bookingSettings.upsert({
    where: { shop: shopML },
    create: { shop: shopML, ...dataML },
    update: dataML,
  });
}