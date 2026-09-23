import type {
  BookableProduct,
  BookingSettings,
  BookingType,
} from "@prisma/client";
import prisma from "../db.server";
import { parseWorkingDays } from "../utils/workingDays";
import { BOOKING_TYPES } from "./bookingTypes";
import {
  dayTimeMapFromLegacy,
  dayTimesToWorkingDaysCsv,
  parseDayTimesFormValue,
  parseDayTimesJson,
  type DayTimeMap,
} from "../utils/dayTimes";

export { BOOKING_TYPES, BOOKING_TYPE_LABELS } from "./bookingTypes";

export type CountryMode = "ALL" | "INCLUDE" | "EXCLUDE";

export const COUNTRY_MODES: CountryMode[] = ["ALL", "INCLUDE", "EXCLUDE"];

export type BookableProductFormValues = {
  isEnabled: boolean;
  bookingType: BookingType;
  workingDays: number[] | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  dayTimes: DayTimeMap | null;
  slotDurationMinutes: number | null;
  bufferMinutes: number | null;
  minAdvanceHours: number | null;
  maxAdvanceDays: number | null;
  maxBookingsPerSlot: number | null;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  minNights: number | null;
  maxNights: number | null;
  bundleSessionCount: number | null;
  bundleSessionDurationMinutes: number | null;
  bundleValidityDays: number | null;
  countryMode: CountryMode;
  countryCodes: string[];
};

export type BookableProductFieldErrors = Partial<
  Record<keyof BookableProductFormValues, string>
>;

export type EffectiveBookingSettings = {
  workingDays: number[];
  dailyStartTime: string;
  dailyEndTime: string;
  dayTimes: DayTimeMap;
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

export async function getBookableProductById(
  shop: string,
  id: string,
): Promise<BookableProduct | null> {
  return prisma.bookableProduct.findFirst({ where: { id, shop } });
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
    bookingType: product.bookingType,
    workingDays: product.workingDays
      ? parseWorkingDays(product.workingDays)
      : null,
    dailyStartTime: product.dailyStartTime,
    dailyEndTime: product.dailyEndTime,
    dayTimes: parseDayTimesJson(product.dayTimes),
    slotDurationMinutes: product.slotDurationMinutes,
    bufferMinutes: product.bufferMinutes,
    minAdvanceHours: product.minAdvanceHours,
    maxAdvanceDays: product.maxAdvanceDays,
    maxBookingsPerSlot: product.maxBookingsPerSlot,
    bookingStartDate: toDateInputValue(product.bookingStartDate),
    bookingEndDate: toDateInputValue(product.bookingEndDate),
    minNights: product.minNights,
    maxNights: product.maxNights,
    bundleSessionCount: product.bundleSessionCount,
    bundleSessionDurationMinutes: product.bundleSessionDurationMinutes,
    bundleValidityDays: product.bundleValidityDays,
    countryMode: parseCountryMode(product.countryMode),
    countryCodes: parseCountryCodes(product.countryCodes),
  };
}

function toDateInputValue(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function parseCountryMode(value: string | null | undefined): CountryMode {
  return COUNTRY_MODES.includes(value as CountryMode)
    ? (value as CountryMode)
    : "ALL";
}

function parseCountryCodes(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseBookableProductForm(formData: FormData): {
  values: BookableProductFormValues;
  errors: BookableProductFieldErrors;
} {
  const errors: BookableProductFieldErrors = {};

  const isEnabled = formData.get("isEnabled") === "true";

  const bookingTypeRaw = String(formData.get("bookingType") ?? "SLOT");
  const bookingType: BookingType = BOOKING_TYPES.includes(
    bookingTypeRaw as BookingType,
  )
    ? (bookingTypeRaw as BookingType)
    : "SLOT";

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

  const dayTimesRaw = String(formData.get("dayTimesJson") ?? "");
  const dayTimesResult = parseDayTimesFormValue(dayTimesRaw);
  if (dayTimesResult.error) {
    errors.dayTimes = dayTimesResult.error;
  }
  const dayTimes = dayTimesResult.map;

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

  const minNightsResult = parseOptionalInt(formData.get("minNights"));
  const minNights = minNightsResult.value;
  if (minNightsResult.invalid) {
    errors.minNights = "Enter a whole number of nights.";
  } else if (minNights !== null && minNights < 1) {
    errors.minNights = "Minimum nights must be at least 1.";
  }

  const maxNightsResult = parseOptionalInt(formData.get("maxNights"));
  const maxNights = maxNightsResult.value;
  if (maxNightsResult.invalid) {
    errors.maxNights = "Enter a whole number of nights.";
  } else if (maxNights !== null && minNights !== null && maxNights < minNights) {
    errors.maxNights = "Maximum nights can't be less than minimum nights.";
  }

  const bundleSessionCountResult = parseOptionalInt(
    formData.get("bundleSessionCount"),
  );
  const bundleSessionCount = bundleSessionCountResult.value;
  if (bundleSessionCountResult.invalid) {
    errors.bundleSessionCount = "Enter a whole number of sessions.";
  } else if (bundleSessionCount !== null && bundleSessionCount < 2) {
    errors.bundleSessionCount = "A bundle needs at least 2 sessions.";
  }

  const bundleSessionDurationMinutesResult = parseOptionalInt(
    formData.get("bundleSessionDurationMinutes"),
  );
  const bundleSessionDurationMinutes =
    bundleSessionDurationMinutesResult.value;
  if (bundleSessionDurationMinutesResult.invalid) {
    errors.bundleSessionDurationMinutes = "Enter a whole number of minutes.";
  } else if (
    bundleSessionDurationMinutes !== null &&
    bundleSessionDurationMinutes < 5
  ) {
    errors.bundleSessionDurationMinutes =
      "Session duration must be at least 5 minutes.";
  }

  const bundleValidityDaysResult = parseOptionalInt(
    formData.get("bundleValidityDays"),
  );
  const bundleValidityDays = bundleValidityDaysResult.value;
  if (bundleValidityDaysResult.invalid) {
    errors.bundleValidityDays = "Enter a whole number of days.";
  } else if (bundleValidityDays !== null && bundleValidityDays < 1) {
    errors.bundleValidityDays = "Validity window must be at least 1 day.";
  }

  const countryModeRaw = String(formData.get("countryMode") ?? "ALL");
  const countryMode: CountryMode = COUNTRY_MODES.includes(
    countryModeRaw as CountryMode,
  )
    ? (countryModeRaw as CountryMode)
    : "ALL";

  const countryCodesRaw = String(formData.get("countryCodes") ?? "");
  const countryCodes = countryCodesRaw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  if (countryMode !== "ALL" && countryCodes.length === 0) {
    errors.countryCodes =
      "Select at least one country, or switch back to all countries.";
  }

  return {
    values: {
      isEnabled,
      bookingType,
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
      minNights,
      maxNights,
      bundleSessionCount,
      bundleSessionDurationMinutes,
      bundleValidityDays,
      countryMode,
      countryCodes,
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

export async function setAllBookableProductsEnabled(
  shop: string,
  products: { id: string; title: string }[],
  isEnabled: boolean,
): Promise<void> {
  await prisma.$transaction(
    products.map((product) =>
      prisma.bookableProduct.upsert({
        where: { shop_productId: { shop, productId: product.id } },
        create: {
          shop,
          productId: product.id,
          productTitle: product.title,
          isEnabled,
        },
        update: { productTitle: product.title, isEnabled },
      }),
    ),
  );
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
    bookingType: values.bookingType,
    workingDays: values.dayTimes
      ? dayTimesToWorkingDaysCsv(values.dayTimes)
      : values.workingDays
        ? values.workingDays.join(",")
        : null,
    dailyStartTime: values.dayTimes ? null : values.dailyStartTime,
    dailyEndTime: values.dayTimes ? null : values.dailyEndTime,
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
    minNights: values.minNights,
    maxNights: values.maxNights,
    bundleSessionCount: values.bundleSessionCount,
    bundleSessionDurationMinutes: values.bundleSessionDurationMinutes,
    bundleValidityDays: values.bundleValidityDays,
    countryMode: values.countryMode,
    countryCodes:
      values.countryMode === "ALL" || values.countryCodes.length === 0
        ? null
        : values.countryCodes.join(","),
  };

  return prisma.bookableProduct.upsert({
    where: { shop_productId: { shop, productId } },
    create: { shop, productId, ...data },
    update: data,
  });
}

export function isProductAvailableForCountry(
  product: Pick<BookableProduct, "countryMode" | "countryCodes">,
  countryCode: string | null,
): boolean {
  const mode = parseCountryMode(product.countryMode);
  if (mode === "ALL") return true;

  const codes = parseCountryCodes(product.countryCodes);
  if (codes.length === 0) return true;
  if (!countryCode) return true;

  const normalized = countryCode.trim().toUpperCase();
  const isListed = codes.includes(normalized);
  return mode === "INCLUDE" ? isListed : !isListed;
}

export type LocationHoursOverride = {
  workingDays: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
};

/**
 * Per-day time map for one level of the location > product > shop
 * cascade. Prefers that level's own dayTimes JSON; falls back to its
 * legacy uniform workingDays + dailyStartTime/dailyEndTime if set;
 * returns null if this level configures nothing (so the caller falls
 * through to the next level).
 */
function levelDayTimes(entity: {
  workingDays: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  dayTimes?: unknown;
} | null): DayTimeMap | null {
  if (!entity) return null;
  const fromJson = "dayTimes" in entity ? parseDayTimesJson(entity.dayTimes) : null;
  if (fromJson) return fromJson;
  if (entity.workingDays && entity.dailyStartTime && entity.dailyEndTime) {
    return dayTimeMapFromLegacy(
      parseWorkingDays(entity.workingDays),
      entity.dailyStartTime,
      entity.dailyEndTime,
    );
  }
  return null;
}

export function resolveEffectiveSettings(
  shopSettings: BookingSettings,
  product: BookableProduct | null,
  location?: LocationHoursOverride | null,
): EffectiveBookingSettings {
  const dayTimes =
    levelDayTimes(location ?? null) ??
    levelDayTimes(product) ??
    levelDayTimes(shopSettings) ??
    {};

  return {
    workingDays: location?.workingDays
      ? parseWorkingDays(location.workingDays)
      : product?.workingDays
        ? parseWorkingDays(product.workingDays)
        : parseWorkingDays(shopSettings.workingDays),
    dailyStartTime:
      location?.dailyStartTime ?? product?.dailyStartTime ?? shopSettings.dailyStartTime,
    dailyEndTime:
      location?.dailyEndTime ?? product?.dailyEndTime ?? shopSettings.dailyEndTime,
    dayTimes,
    slotDurationMinutes:
      product?.bookingType === "BUNDLE" && product.bundleSessionDurationMinutes
        ? product.bundleSessionDurationMinutes
        : (product?.slotDurationMinutes ?? shopSettings.slotDurationMinutes),
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