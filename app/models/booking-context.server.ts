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

export type BookingContext = {
  effectiveSettings: EffectiveBookingSettings;
  blackoutDates: Set<string>;
};

/**
 * Resolves everything the slot-availability engine needs for a product:
 * shop defaults merged with any product overrides, plus every blackout
 * date (shop-wide and product-specific) collapsed into one set.
 *
 * Returns null if the product isn't set up for booking at all — either
 * it has no BookableProduct row yet, or booking is turned off for it.
 */
export async function resolveBookingContext(
  shop: string,
  productId: string,
): Promise<BookingContext | null> {
  const [shopSettings, bookableProduct] = await Promise.all([
    getBookingSettings(shop),
    getBookableProduct(shop, productId),
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
    effectiveSettings: resolveEffectiveSettings(shopSettings, bookableProduct),
    blackoutDates,
  };
}
