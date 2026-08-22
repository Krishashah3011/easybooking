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
  bookableProductId: string;
  bookingType: "SLOT" | "FULL_DAY" | "MULTI_DAY" | "BUNDLE";
  effectiveSettings: EffectiveBookingSettings;
  blackoutDates: Set<string>;
};

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
    bookableProductId: bookableProduct.id,
    bookingType: bookableProduct.bookingType,
    effectiveSettings: resolveEffectiveSettings(shopSettings, bookableProduct),
    blackoutDates,
  };
}