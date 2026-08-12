import type { BookableProduct, BookingSettings } from "@prisma/client";
import prisma from "../db.server";
import { parseWorkingDays } from "./bookingSettings.server";

export type BookableProductFormValues = {
  isEnabled: boolean;
  workingDays: number[] | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  slotDurationMinutes: number | null;
  bufferMinutes: number | null;
  minAdvanceHours: number | null;
  maxAdvanceDays: number | null;
  maxBookingsPerSlot: number | null;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
};

export type BookableProductFieldErrors = Partial<
  Record<keyof BookableProductFormValues, string>
>;

export type EffectiveBookingSettings = {
  workingDays: number[];
  dailyStartTime: string;
  dailyEndTime: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxBookingsPerSlot: number;
  bookingStartDate: Date | null;
  bookingEndDate: Date | null;
};

export async function listBookableProducts(
  shop: string,
): Promise<BookableProduct[]> {
  return prisma.bookableProduct.findMany({
    where: { shop },
    orderBy: { productTitle: "asc" },
  });
}

export async function getBookableProduct(
  shop: string,
  productId: string,
): Promise<BookableProduct | null> {
  return prisma.bookableProduct.findUnique({
    where: { shop_productId: { shop, productId } },
  });
}

export async function ensureBookableProduct(
  shop: string,
  productId: string,
  productTitle: string,
): Promise<BookableProduct> {
  const existing = await getBookableProduct(shop, productId);
  if (existing) {
    if (existing.productTitle !== productTitle) {
      return prisma.bookableProduct.update({
        where: { id: existing.id },
        data: { productTitle },
      });
    }
    return existing;
  }

  return prisma.bookableProduct.create({
    data: { shop, productId, productTitle, isEnabled: false },
  });
}

export function toBookableProductFormValues(
  product: BookableProduct,
): BookableProductFormValues {
  return {
    isEnabled: product.isEnabled,
    workingDays: product.workingDays
      ? parseWorkingDays(product.workingDays)
      : null,
    dailyStartTime: product.dailyStartTime,
    dailyEndTime: product.dailyEndTime,
    slotDurationMinutes: product.slotDurationMinutes,
    bufferMinutes: product.bufferMinutes,
    minAdvanceHours: product.minAdvanceHours,
    maxAdvanceDays: product.maxAdvanceDays,
    maxBookingsPerSlot: product.maxBookingsPerSlot,
    bookingStartDate: toDateInputValue(product.bookingStartDate),
    bookingEndDate: toDateInputValue(product.bookingEndDate),
  };
}

function toDateInputValue(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseBookableProductForm(formData: FormData): {
  values: BookableProductFormValues;
  errors: BookableProductFieldErrors;
} {
  const errors: BookableProductFieldErrors = {};

  const isEnabled = formData.get("isEnabled") === "true";

  const workingDaysRaw = String(formData.get("workingDays") ?? "");
  const workingDays =
    workingDaysRaw === ""
      ? null
      : workingDaysRaw
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (workingDays !== null && workingDays.length === 0) {
    errors.workingDays =
      "Select at least one day, or clear all to inherit the shop default.";
  }

  const dailyStartTime = emptyToNull(formData.get("dailyStartTime"));
  const dailyEndTime = emptyToNull(formData.get("dailyEndTime"));
  if (dailyStartTime && !TIME_RE.test(dailyStartTime)) {
    errors.dailyStartTime = "Enter a valid start time (HH:mm).";
  }
  if (dailyEndTime && !TIME_RE.test(dailyEndTime)) {
    errors.dailyEndTime = "Enter a valid end time (HH:mm).";
  }
  if (
    dailyStartTime &&
    dailyEndTime &&
    !errors.dailyStartTime &&
    !errors.dailyEndTime &&
    dailyEndTime <= dailyStartTime
  ) {
    errors.dailyEndTime = "End time must be after start time.";
  }

  const slotDurationMinutesResult = parseOptionalInt(
    formData.get("slotDurationMinutes"),
  );
  const slotDurationMinutes = slotDurationMinutesResult.value;
  if (slotDurationMinutesResult.invalid) {
    errors.slotDurationMinutes = "Enter a whole number of minutes.";
  } else if (slotDurationMinutes !== null && slotDurationMinutes < 5) {
    errors.slotDurationMinutes = "Slot duration must be at least 5 minutes.";
  }

  const bufferMinutesResult = parseOptionalInt(formData.get("bufferMinutes"));
  const bufferMinutes = bufferMinutesResult.value;
  if (bufferMinutesResult.invalid) {
    errors.bufferMinutes = "Enter a whole number of minutes.";
  } else if (bufferMinutes !== null && bufferMinutes < 0) {
    errors.bufferMinutes = "Buffer time can't be negative.";
  }

  const minAdvanceHoursResult = parseOptionalInt(
    formData.get("minAdvanceHours"),
  );
  const minAdvanceHours = minAdvanceHoursResult.value;
  if (minAdvanceHoursResult.invalid) {
    errors.minAdvanceHours = "Enter a whole number of hours.";
  } else if (minAdvanceHours !== null && minAdvanceHours < 0) {
    errors.minAdvanceHours = "Minimum advance time can't be negative.";
  }

  const maxAdvanceDaysResult = parseOptionalInt(formData.get("maxAdvanceDays"));
  const maxAdvanceDays = maxAdvanceDaysResult.value;
  if (maxAdvanceDaysResult.invalid) {
    errors.maxAdvanceDays = "Enter a whole number of days.";
  } else if (maxAdvanceDays !== null && maxAdvanceDays < 1) {
    errors.maxAdvanceDays = "Maximum advance days must be at least 1.";
  }

  const maxBookingsPerSlotResult = parseOptionalInt(
    formData.get("maxBookingsPerSlot"),
  );
  const maxBookingsPerSlot = maxBookingsPerSlotResult.value;
  if (maxBookingsPerSlotResult.invalid) {
    errors.maxBookingsPerSlot = "Enter a whole number.";
  } else if (maxBookingsPerSlot !== null && maxBookingsPerSlot < 1) {
    errors.maxBookingsPerSlot = "Capacity per slot must be at least 1.";
  }

  const bookingStartDate = emptyToNull(formData.get("bookingStartDate"));
  const bookingEndDate = emptyToNull(formData.get("bookingEndDate"));
  if (bookingStartDate && bookingEndDate && bookingEndDate < bookingStartDate) {
    errors.bookingEndDate = "End date must be after start date.";
  }

  return {
    values: {
      isEnabled,
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

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "");
  return str === "" ? null : str;
}

type OptionalIntResult = { value: number | null; invalid: boolean };

function parseOptionalInt(value: FormDataEntryValue | null): OptionalIntResult {
  const str = String(value ?? "");
  if (str === "") return { value: null, invalid: false };
  const n = Number(str);
  return Number.isInteger(n)
    ? { value: n, invalid: false }
    : { value: null, invalid: true };
}

export async function setBookableProductEnabled(
  shop: string,
  productId: string,
  productTitle: string,
  isEnabled: boolean,
): Promise<BookableProduct> {
  return prisma.bookableProduct.upsert({
    where: { shop_productId: { shop, productId } },
    create: { shop, productId, productTitle, isEnabled },
    update: { productTitle, isEnabled },
  });
}

export async function upsertBookableProductOverrides(
  shop: string,
  productId: string,
  productTitle: string,
  values: BookableProductFormValues,
): Promise<BookableProduct> {
  const data = {
    productTitle,
    isEnabled: values.isEnabled,
    workingDays: values.workingDays ? values.workingDays.join(",") : null,
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

  return prisma.bookableProduct.upsert({
    where: { shop_productId: { shop, productId } },
    create: { shop, productId, ...data },
    update: data,
  });
}

export function resolveEffectiveSettings(
  shopSettings: BookingSettings,
  product: BookableProduct | null,
): EffectiveBookingSettings {
  return {
    workingDays: product?.workingDays
      ? parseWorkingDays(product.workingDays)
      : parseWorkingDays(shopSettings.workingDays),
    dailyStartTime: product?.dailyStartTime ?? shopSettings.dailyStartTime,
    dailyEndTime: product?.dailyEndTime ?? shopSettings.dailyEndTime,
    slotDurationMinutes:
      product?.slotDurationMinutes ?? shopSettings.slotDurationMinutes,
    bufferMinutes: product?.bufferMinutes ?? shopSettings.bufferMinutes,
    minAdvanceHours: product?.minAdvanceHours ?? shopSettings.minAdvanceHours,
    maxAdvanceDays: product?.maxAdvanceDays ?? shopSettings.maxAdvanceDays,
    maxBookingsPerSlot:
      product?.maxBookingsPerSlot ?? shopSettings.maxBookingsPerSlot,
    bookingStartDate:
      product?.bookingStartDate ?? shopSettings.bookingStartDate,
    bookingEndDate: product?.bookingEndDate ?? shopSettings.bookingEndDate,
  };
}