import { getBookingSettingsML } from "./bookingSettings.server";
import {
  getBookableProductML,
  getBookableProductByIdML,
  resolveEffectiveSettingsML,
  type EffectiveBookingSettings,
} from "./bookableProduct.server";
import {
  listProductBlackoutDatesML,
  listProductBlackoutExclusionsML,
  listShopBlackoutDatesML,
} from "./blackoutDate.server";
import { getLocationByIdML } from "./bookingLocation.server";
import type { BookableProduct, BookingSettings } from "@prisma/client";
import type { LocationHoursOverride } from "./bookableProduct.server";

export type BookingContext = {
  bookableProductId: string;
  bookingType: "SLOT" | "FULL_DAY" | "MULTI_DAY" | "BUNDLE";
  minNights: number | null;
  maxNights: number | null;
  bundleSessionCount: number | null;
  bundleValidityDays: number | null;
  effectiveSettings: EffectiveBookingSettings;
  blackoutDates: Set<string>;
  location: { id: string; name: string; timezone: string } | null;
};

async function buildBookingContextML(
  shopML: string,
  shopSettingsML: BookingSettings,
  bookableProductML: BookableProduct | null,
  locationML: (LocationHoursOverride & { id: string; name: string; timezone: string }) | null,
): Promise<BookingContext | null> {
  if (!bookableProductML || !bookableProductML.isEnabled) {
    return null;
  }

  const [shopBlackoutsML, productBlackoutsML, productExclusionsML] = await Promise.all([
    listShopBlackoutDatesML(shopML),
    listProductBlackoutDatesML(shopML, bookableProductML.id),
    listProductBlackoutExclusionsML(shopML, bookableProductML.id),
  ]);

  const blackoutDatesML = new Set<string>([
    ...shopBlackoutsML
      .map((bML) => bML.date.toISOString().slice(0, 10))
      .filter((dateStrML) => !productExclusionsML.has(dateStrML)),
    ...productBlackoutsML.map((bML) => bML.date.toISOString().slice(0, 10)),
  ]);

  return {
    bookableProductId: bookableProductML.id,
    bookingType: bookableProductML.bookingType,
    minNights: bookableProductML.minNights,
    maxNights: bookableProductML.maxNights,
    bundleSessionCount: bookableProductML.bundleSessionCount,
    bundleValidityDays: bookableProductML.bundleValidityDays,
    effectiveSettings: resolveEffectiveSettingsML(
      shopSettingsML,
      bookableProductML,
      locationML,
    ),
    blackoutDates: blackoutDatesML,
    location: locationML
      ? { id: locationML.id, name: locationML.name, timezone: locationML.timezone }
      : null,
  };
}

export async function resolveBookingContextML(
  shopML: string,
  productIdML: string,
  locationIdML?: string | null,
): Promise<BookingContext | null> {
  const [shopSettingsML, bookableProductML, locationML] = await Promise.all([
    getBookingSettingsML(shopML),
    getBookableProductML(shopML, productIdML),
    locationIdML ? getLocationByIdML(shopML, locationIdML) : Promise.resolve(null),
  ]);

  return buildBookingContextML(shopML, shopSettingsML, bookableProductML, locationML);
}

export async function resolveBookingContextByIdML(
  shopML: string,
  bookableProductIdML: string,
  locationIdML?: string | null,
): Promise<BookingContext | null> {
  const [shopSettingsML, bookableProductML, locationML] = await Promise.all([
    getBookingSettingsML(shopML),
    getBookableProductByIdML(shopML, bookableProductIdML),
    locationIdML ? getLocationByIdML(shopML, locationIdML) : Promise.resolve(null),
  ]);

  return buildBookingContextML(shopML, shopSettingsML, bookableProductML, locationML);
}