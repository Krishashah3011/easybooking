import { getBookingSettings } from "./bookingSettings.server";
import {
  getBookableProduct,
  resolveEffectiveSettings,
  type EffectiveBookingSettings,
} from "./bookableProduct.server";
import {
  listProductBlackoutDates,
  listShopBlackoutDates,
} from "./blackoutDate.server";
import { getLocationById } from "./bookingLocation.server";

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

export async function resolveBookingContext(
  shop: string,
  productId: string,
  locationId?: string | null,
): Promise<BookingContext | null> {
  const [shopSettings, bookableProduct, location] = await Promise.all([
    getBookingSettings(shop),
    getBookableProduct(shop, productId),
    locationId ? getLocationById(shop, locationId) : Promise.resolve(null),
  ]);

  if (!bookableProduct || !bookableProduct.isEnabled) {
    return null;
  }

  const [shopBlackouts, productBlackouts] = await Promise.all([
    listShopBlackoutDates(shop),
    listProductBlackoutDates(shop, bookableProduct.id),
  ]);

  const blackoutDates = new Set<string>([
    ...shopBlackouts.map((b) => b.date.toISOString().slice(0, 10)),
    ...productBlackouts.map((b) => b.date.toISOString().slice(0, 10)),
  ]);

  return {
    bookableProductId: bookableProduct.id,
    bookingType: bookableProduct.bookingType,
    minNights: bookableProduct.minNights,
    maxNights: bookableProduct.maxNights,
    bundleSessionCount: bookableProduct.bundleSessionCount,
    bundleValidityDays: bookableProduct.bundleValidityDays,
    effectiveSettings: resolveEffectiveSettings(
      shopSettings,
      bookableProduct,
      location,
    ),
    blackoutDates,
    location: location
      ? { id: location.id, name: location.name, timezone: location.timezone }
      : null,
  };
}