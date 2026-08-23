// Plain constants shared by both server code (bookableProduct.server.ts)
// and client/route-component code (app.products_.$productId.tsx). This
// file deliberately has NO ".server" suffix — React Router strips
// everything except loader/action/middleware/headers out of ".server"
// files when bundling for the browser, so a route component can't read
// runtime values (like these) out of a .server file directly, even
// though the same file is fine to import from inside a loader/action.
import type { BookingType } from "@prisma/client";

export const BOOKING_TYPES: BookingType[] = [
  "SLOT",
  "FULL_DAY",
  "MULTI_DAY",
  "BUNDLE",
];

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  SLOT: "Minute / Hour bookings (time slots)",
  FULL_DAY: "Full-day bookings (flat rate per day)",
  MULTI_DAY: "Multi-day bookings (date range)",
  BUNDLE: "Bundle bookings (pack of sessions)",
};
