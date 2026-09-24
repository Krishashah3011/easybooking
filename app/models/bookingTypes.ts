import type { BookingType } from "@prisma/client";

export const BOOKING_TYPES_ML: BookingType[] = [
  "SLOT",
  "FULL_DAY",
  "MULTI_DAY",
  "BUNDLE",
];

export const BOOKING_TYPE_LABELS_ML: Record<BookingType, string> = {
  SLOT: "Minute / Hour bookings (time slots)",
  FULL_DAY: "Full-day bookings (flat rate per day)",
  MULTI_DAY: "Multi-day bookings (date range)",
  BUNDLE: "Bundle bookings (pack of sessions)",
};