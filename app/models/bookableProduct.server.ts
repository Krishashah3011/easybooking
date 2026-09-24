import type {
  BookableProduct,
  BookingSettings,
  BookingType,
} from "@prisma/client";
import prismaML from "../db.server";
import { parseWorkingDaysML } from "../utils/workingDays";
import { BOOKING_TYPES_ML } from "./bookingTypes";
import {
  dayTimeMapFromLegacyML,
  dayTimesToWorkingDaysCsvML,
  parseDayTimesFormValueML,
  parseDayTimesJsonML,
  type DayTimeMap,
} from "../utils/dayTimes";

export { BOOKING_TYPES_ML as BOOKING_TYPES, BOOKING_TYPE_LABELS_ML as BOOKING_TYPE_LABELS } from "./bookingTypes";

export type CountryMode = "ALL" | "INCLUDE" | "EXCLUDE";

export const COUNTRY_MODES_ML: CountryMode[] = ["ALL", "INCLUDE", "EXCLUDE"];

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

export async function listBookableProductsML(
  shopML: string,
): Promise<BookableProduct[]> {
  return prismaML.bookableProduct.findMany({
    where: { shop: shopML },
    orderBy: { productTitle: "asc" },
  });
}

export async function getBookableProductML(
  shopML: string,
  productIdML: string,
): Promise<BookableProduct | null> {
  return prismaML.bookableProduct.findUnique({
    where: { shop_productId: { shop: shopML, productId: productIdML } },
  });
}

export async function getBookableProductByIdML(
  shopML: string,
  idML: string,
): Promise<BookableProduct | null> {
  return prismaML.bookableProduct.findFirst({ where: { id: idML, shop: shopML } });
}

export async function ensureBookableProductML(
  shopML: string,
  productIdML: string,
  productTitleML: string,
): Promise<BookableProduct> {
  const existingML = await getBookableProductML(shopML, productIdML);
  if (existingML) {
    if (existingML.productTitle !== productTitleML) {
      return prismaML.bookableProduct.update({
        where: { id: existingML.id },
        data: { productTitle: productTitleML },
      });
    }
    return existingML;
  }

  return prismaML.bookableProduct.create({
    data: { shop: shopML, productId: productIdML, productTitle: productTitleML, isEnabled: false },
  });
}

export function toBookableProductFormValuesML(
  productML: BookableProduct,
): BookableProductFormValues {
  return {
    isEnabled: productML.isEnabled,
    bookingType: productML.bookingType,
    workingDays: productML.workingDays
      ? parseWorkingDaysML(productML.workingDays)
      : null,
    dailyStartTime: productML.dailyStartTime,
    dailyEndTime: productML.dailyEndTime,
    dayTimes: parseDayTimesJsonML(productML.dayTimes),
    slotDurationMinutes: productML.slotDurationMinutes,
    bufferMinutes: productML.bufferMinutes,
    minAdvanceHours: productML.minAdvanceHours,
    maxAdvanceDays: productML.maxAdvanceDays,
    maxBookingsPerSlot: productML.maxBookingsPerSlot,
    bookingStartDate: toDateInputValueML(productML.bookingStartDate),
    bookingEndDate: toDateInputValueML(productML.bookingEndDate),
    minNights: productML.minNights,
    maxNights: productML.maxNights,
    bundleSessionCount: productML.bundleSessionCount,
    bundleSessionDurationMinutes: productML.bundleSessionDurationMinutes,
    bundleValidityDays: productML.bundleValidityDays,
    countryMode: parseCountryModeML(productML.countryMode),
    countryCodes: parseCountryCodesML(productML.countryCodes),
  };
}

function toDateInputValueML(dateML: Date | null): string | null {
  if (!dateML) return null;
  return dateML.toISOString().slice(0, 10);
}

function parseCountryModeML(valueML: string | null | undefined): CountryMode {
  return COUNTRY_MODES_ML.includes(valueML as CountryMode)
    ? (valueML as CountryMode)
    : "ALL";
}

function parseCountryCodesML(valueML: string | null | undefined): string[] {
  if (!valueML) return [];
  return valueML
    .split(",")
    .map((vML) => vML.trim().toUpperCase())
    .filter(Boolean);
}

const TIME_RE_ML = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseBookableProductFormML(formDataML: FormData): {
  values: BookableProductFormValues;
  errors: BookableProductFieldErrors;
} {
  const errorsML: BookableProductFieldErrors = {};

  const isEnabledML = formDataML.get("isEnabled") === "true";

  const bookingTypeRawML = String(formDataML.get("bookingType") ?? "SLOT");
  const bookingTypeML: BookingType = BOOKING_TYPES_ML.includes(
    bookingTypeRawML as BookingType,
  )
    ? (bookingTypeRawML as BookingType)
    : "SLOT";

  const workingDaysRawML = String(formDataML.get("workingDays") ?? "");
  const workingDaysML =
    workingDaysRawML === ""
      ? null
      : workingDaysRawML
          .split(",")
          .map((vML) => Number(vML.trim()))
          .filter((nML) => Number.isInteger(nML) && nML >= 0 && nML <= 6);
  if (workingDaysML !== null && workingDaysML.length === 0) {
    errorsML.workingDays =
      "Select at least one day, or clear all to inherit the shop default.";
  }

  const dailyStartTimeML = emptyToNullML(formDataML.get("dailyStartTime"));
  const dailyEndTimeML = emptyToNullML(formDataML.get("dailyEndTime"));
  if (dailyStartTimeML && !TIME_RE_ML.test(dailyStartTimeML)) {
    errorsML.dailyStartTime = "Enter a valid start time (HH:mm).";
  }
  if (dailyEndTimeML && !TIME_RE_ML.test(dailyEndTimeML)) {
    errorsML.dailyEndTime = "Enter a valid end time (HH:mm).";
  }
  if (
    dailyStartTimeML &&
    dailyEndTimeML &&
    !errorsML.dailyStartTime &&
    !errorsML.dailyEndTime &&
    dailyEndTimeML <= dailyStartTimeML
  ) {
    errorsML.dailyEndTime = "End time must be after start time.";
  }

  const dayTimesRawML = String(formDataML.get("dayTimesJson") ?? "");
  const dayTimesResultML = parseDayTimesFormValueML(dayTimesRawML);
  if (dayTimesResultML.error) {
    errorsML.dayTimes = dayTimesResultML.error;
  }
  const dayTimesML = dayTimesResultML.map;

  const slotDurationMinutesResultML = parseOptionalIntML(
    formDataML.get("slotDurationMinutes"),
  );
  const slotDurationMinutesML = slotDurationMinutesResultML.value;
  if (slotDurationMinutesResultML.invalid) {
    errorsML.slotDurationMinutes = "Enter a whole number of minutes.";
  } else if (slotDurationMinutesML !== null && slotDurationMinutesML < 5) {
    errorsML.slotDurationMinutes = "Slot duration must be at least 5 minutes.";
  }

  const bufferMinutesResultML = parseOptionalIntML(formDataML.get("bufferMinutes"));
  const bufferMinutesML = bufferMinutesResultML.value;
  if (bufferMinutesResultML.invalid) {
    errorsML.bufferMinutes = "Enter a whole number of minutes.";
  } else if (bufferMinutesML !== null && bufferMinutesML < 0) {
    errorsML.bufferMinutes = "Buffer time can't be negative.";
  }

  const minAdvanceHoursResultML = parseOptionalIntML(
    formDataML.get("minAdvanceHours"),
  );
  const minAdvanceHoursML = minAdvanceHoursResultML.value;
  if (minAdvanceHoursResultML.invalid) {
    errorsML.minAdvanceHours = "Enter a whole number of hours.";
  } else if (minAdvanceHoursML !== null && minAdvanceHoursML < 0) {
    errorsML.minAdvanceHours = "Minimum advance time can't be negative.";
  }

  const maxAdvanceDaysResultML = parseOptionalIntML(formDataML.get("maxAdvanceDays"));
  const maxAdvanceDaysML = maxAdvanceDaysResultML.value;
  if (maxAdvanceDaysResultML.invalid) {
    errorsML.maxAdvanceDays = "Enter a whole number of days.";
  } else if (maxAdvanceDaysML !== null && maxAdvanceDaysML < 1) {
    errorsML.maxAdvanceDays = "Maximum advance days must be at least 1.";
  }

  const maxBookingsPerSlotResultML = parseOptionalIntML(
    formDataML.get("maxBookingsPerSlot"),
  );
  const maxBookingsPerSlotML = maxBookingsPerSlotResultML.value;
  if (maxBookingsPerSlotResultML.invalid) {
    errorsML.maxBookingsPerSlot = "Enter a whole number.";
  } else if (maxBookingsPerSlotML !== null && maxBookingsPerSlotML < 1) {
    errorsML.maxBookingsPerSlot = "Capacity per slot must be at least 1.";
  }

  const bookingStartDateML = emptyToNullML(formDataML.get("bookingStartDate"));
  const bookingEndDateML = emptyToNullML(formDataML.get("bookingEndDate"));
  if (bookingStartDateML && bookingEndDateML && bookingEndDateML < bookingStartDateML) {
    errorsML.bookingEndDate = "End date must be after start date.";
  }

  const minNightsResultML = parseOptionalIntML(formDataML.get("minNights"));
  const minNightsML = minNightsResultML.value;
  if (minNightsResultML.invalid) {
    errorsML.minNights = "Enter a whole number of nights.";
  } else if (minNightsML !== null && minNightsML < 1) {
    errorsML.minNights = "Minimum nights must be at least 1.";
  }

  const maxNightsResultML = parseOptionalIntML(formDataML.get("maxNights"));
  const maxNightsML = maxNightsResultML.value;
  if (maxNightsResultML.invalid) {
    errorsML.maxNights = "Enter a whole number of nights.";
  } else if (maxNightsML !== null && minNightsML !== null && maxNightsML < minNightsML) {
    errorsML.maxNights = "Maximum nights can't be less than minimum nights.";
  }

  const bundleSessionCountResultML = parseOptionalIntML(
    formDataML.get("bundleSessionCount"),
  );
  const bundleSessionCountML = bundleSessionCountResultML.value;
  if (bundleSessionCountResultML.invalid) {
    errorsML.bundleSessionCount = "Enter a whole number of sessions.";
  } else if (bundleSessionCountML !== null && bundleSessionCountML < 2) {
    errorsML.bundleSessionCount = "A bundle needs at least 2 sessions.";
  }

  const bundleSessionDurationMinutesResultML = parseOptionalIntML(
    formDataML.get("bundleSessionDurationMinutes"),
  );
  const bundleSessionDurationMinutesML =
    bundleSessionDurationMinutesResultML.value;
  if (bundleSessionDurationMinutesResultML.invalid) {
    errorsML.bundleSessionDurationMinutes = "Enter a whole number of minutes.";
  } else if (
    bundleSessionDurationMinutesML !== null &&
    bundleSessionDurationMinutesML < 5
  ) {
    errorsML.bundleSessionDurationMinutes =
      "Session duration must be at least 5 minutes.";
  }

  const bundleValidityDaysResultML = parseOptionalIntML(
    formDataML.get("bundleValidityDays"),
  );
  const bundleValidityDaysML = bundleValidityDaysResultML.value;
  if (bundleValidityDaysResultML.invalid) {
    errorsML.bundleValidityDays = "Enter a whole number of days.";
  } else if (bundleValidityDaysML !== null && bundleValidityDaysML < 1) {
    errorsML.bundleValidityDays = "Validity window must be at least 1 day.";
  }

  const countryModeRawML = String(formDataML.get("countryMode") ?? "ALL");
  const countryModeML: CountryMode = COUNTRY_MODES_ML.includes(
    countryModeRawML as CountryMode,
  )
    ? (countryModeRawML as CountryMode)
    : "ALL";

  const countryCodesRawML = String(formDataML.get("countryCodes") ?? "");
  const countryCodesML = countryCodesRawML
    .split(",")
    .map((vML) => vML.trim().toUpperCase())
    .filter(Boolean);
  if (countryModeML !== "ALL" && countryCodesML.length === 0) {
    errorsML.countryCodes =
      "Select at least one country, or switch back to all countries.";
  }

  return {
    values: {
      isEnabled: isEnabledML,
      bookingType: bookingTypeML,
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
      minNights: minNightsML,
      maxNights: maxNightsML,
      bundleSessionCount: bundleSessionCountML,
      bundleSessionDurationMinutes: bundleSessionDurationMinutesML,
      bundleValidityDays: bundleValidityDaysML,
      countryMode: countryModeML,
      countryCodes: countryCodesML,
    },
    errors: errorsML,
  };
}

function emptyToNullML(valueML: FormDataEntryValue | null): string | null {
  const strML = String(valueML ?? "");
  return strML === "" ? null : strML;
}

type OptionalIntResult = { value: number | null; invalid: boolean };

function parseOptionalIntML(valueML: FormDataEntryValue | null): OptionalIntResult {
  const strML = String(valueML ?? "");
  if (strML === "") return { value: null, invalid: false };
  const nML = Number(strML);
  return Number.isInteger(nML)
    ? { value: nML, invalid: false }
    : { value: null, invalid: true };
}

export async function setBookableProductEnabledML(
  shopML: string,
  productIdML: string,
  productTitleML: string,
  isEnabledML: boolean,
): Promise<BookableProduct> {
  return prismaML.bookableProduct.upsert({
    where: { shop_productId: { shop: shopML, productId: productIdML } },
    create: { shop: shopML, productId: productIdML, productTitle: productTitleML, isEnabled: isEnabledML },
    update: { productTitle: productTitleML, isEnabled: isEnabledML },
  });
}

export async function setAllBookableProductsEnabledML(
  shopML: string,
  productsML: { id: string; title: string }[],
  isEnabledML: boolean,
): Promise<void> {
  await prismaML.$transaction(
    productsML.map((productML) =>
      prismaML.bookableProduct.upsert({
        where: { shop_productId: { shop: shopML, productId: productML.id } },
        create: {
          shop: shopML,
          productId: productML.id,
          productTitle: productML.title,
          isEnabled: isEnabledML,
        },
        update: { productTitle: productML.title, isEnabled: isEnabledML },
      }),
    ),
  );
}

export async function upsertBookableProductOverridesML(
  shopML: string,
  productIdML: string,
  productTitleML: string,
  valuesML: BookableProductFormValues,
): Promise<BookableProduct> {
  const dataML = {
    productTitle: productTitleML,
    isEnabled: valuesML.isEnabled,
    bookingType: valuesML.bookingType,
    workingDays: valuesML.dayTimes
      ? dayTimesToWorkingDaysCsvML(valuesML.dayTimes)
      : valuesML.workingDays
        ? valuesML.workingDays.join(",")
        : null,
    dailyStartTime: valuesML.dayTimes ? null : valuesML.dailyStartTime,
    dailyEndTime: valuesML.dayTimes ? null : valuesML.dailyEndTime,
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
    minNights: valuesML.minNights,
    maxNights: valuesML.maxNights,
    bundleSessionCount: valuesML.bundleSessionCount,
    bundleSessionDurationMinutes: valuesML.bundleSessionDurationMinutes,
    bundleValidityDays: valuesML.bundleValidityDays,
    countryMode: valuesML.countryMode,
    countryCodes:
      valuesML.countryMode === "ALL" || valuesML.countryCodes.length === 0
        ? null
        : valuesML.countryCodes.join(","),
  };

  return prismaML.bookableProduct.upsert({
    where: { shop_productId: { shop: shopML, productId: productIdML } },
    create: { shop: shopML, productId: productIdML, ...dataML },
    update: dataML,
  });
}

export function isProductAvailableForCountryML(
  productML: Pick<BookableProduct, "countryMode" | "countryCodes">,
  countryCodeML: string | null,
): boolean {
  const modeML = parseCountryModeML(productML.countryMode);
  if (modeML === "ALL") return true;

  const codesML = parseCountryCodesML(productML.countryCodes);
  if (codesML.length === 0) return true;
  if (!countryCodeML) return true;

  const normalizedML = countryCodeML.trim().toUpperCase();
  const isListedML = codesML.includes(normalizedML);
  return modeML === "INCLUDE" ? isListedML : !isListedML;
}

export type LocationHoursOverride = {
  workingDays: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
};

function levelDayTimesML(entityML: {
  workingDays: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  dayTimes?: unknown;
} | null): DayTimeMap | null {
  if (!entityML) return null;
  const fromJsonML = "dayTimes" in entityML ? parseDayTimesJsonML(entityML.dayTimes) : null;
  if (fromJsonML) return fromJsonML;
  if (entityML.workingDays && entityML.dailyStartTime && entityML.dailyEndTime) {
    return dayTimeMapFromLegacyML(
      parseWorkingDaysML(entityML.workingDays),
      entityML.dailyStartTime,
      entityML.dailyEndTime,
    );
  }
  return null;
}

export function resolveEffectiveSettingsML(
  shopSettingsML: BookingSettings,
  productML: BookableProduct | null,
  locationML?: LocationHoursOverride | null,
): EffectiveBookingSettings {
  const dayTimesML =
    levelDayTimesML(locationML ?? null) ??
    levelDayTimesML(productML) ??
    levelDayTimesML(shopSettingsML) ??
    {};

  return {
    workingDays: locationML?.workingDays
      ? parseWorkingDaysML(locationML.workingDays)
      : productML?.workingDays
        ? parseWorkingDaysML(productML.workingDays)
        : parseWorkingDaysML(shopSettingsML.workingDays),
    dailyStartTime:
      locationML?.dailyStartTime ?? productML?.dailyStartTime ?? shopSettingsML.dailyStartTime,
    dailyEndTime:
      locationML?.dailyEndTime ?? productML?.dailyEndTime ?? shopSettingsML.dailyEndTime,
    dayTimes: dayTimesML,
    slotDurationMinutes:
      productML?.bookingType === "BUNDLE" && productML.bundleSessionDurationMinutes
        ? productML.bundleSessionDurationMinutes
        : (productML?.slotDurationMinutes ?? shopSettingsML.slotDurationMinutes),
    bufferMinutes: productML?.bufferMinutes ?? shopSettingsML.bufferMinutes,
    minAdvanceHours: productML?.minAdvanceHours ?? shopSettingsML.minAdvanceHours,
    maxAdvanceDays: productML?.maxAdvanceDays ?? shopSettingsML.maxAdvanceDays,
    maxBookingsPerSlot:
      productML?.maxBookingsPerSlot ?? shopSettingsML.maxBookingsPerSlot,
    bookingStartDate:
      productML?.bookingStartDate ?? shopSettingsML.bookingStartDate,
    bookingEndDate: productML?.bookingEndDate ?? shopSettingsML.bookingEndDate,
  };
}