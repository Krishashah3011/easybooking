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
