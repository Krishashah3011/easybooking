import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContext } from "../models/booking-context.server";
import {
  getAvailableDatesInMonth,
  getAvailableFullDayDatesInMonth,
  getAvailableMultiDayNightsInMonth,
} from "../models/slotAvailability.server";
import {
  getBookedCountsInRange,
  getBookedNightCountsInRange,
} from "../models/booking.server";
import { getLocationById } from "../models/bookingLocation.server";


export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const locationId = url.searchParams.get("locationId");

  if (!productId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return Response.json(
      { error: "productId, year, and month are required" },
      { status: 400 },
    );
  }
  if (month < 1 || month > 12) {
    return Response.json({ error: "month must be 1-12" }, { status: 400 });
  }

  const context = await resolveBookingContext(session.shop, productId);
  if (!context) {
    return Response.json({ availableDates: [] });
  }

  const location = locationId
    ? await getLocationById(session.shop, locationId)
    : null;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  let availableDates: string[];

  if (context.bookingType === "FULL_DAY") {
    const bookedCounts = await getBookedCountsInRange(
      session.shop,
      context.bookableProductId,
      monthStart,
      monthEnd,
    );
    availableDates = getAvailableFullDayDatesInMonth(
      context.effectiveSettings,
      year,
      month,
      context.blackoutDates,
      new Date(),
      bookedCounts,
    );
  } else if (context.bookingType === "MULTI_DAY") {
    const bookedNightCounts = await getBookedNightCountsInRange(
      session.shop,
      context.bookableProductId,
      monthStart,
      monthEnd,
    );
    availableDates = getAvailableMultiDayNightsInMonth(
      context.effectiveSettings,
      year,
      month,
      context.blackoutDates,
      new Date(),
      bookedNightCounts,
    );
  } else {
    const bookedCounts = await getBookedCountsInRange(
      session.shop,
      context.bookableProductId,
      monthStart,
      monthEnd,
    );
    availableDates = getAvailableDatesInMonth(
      context.effectiveSettings,
      year,
      month,
      context.blackoutDates,
      new Date(),
      bookedCounts,
      location?.timezone ?? null,
    );
  }

  return Response.json({
    availableDates,
    bookingType: context.bookingType,
    minNights: context.minNights,
    maxNights: context.maxNights,
    bundleSessionCount: context.bundleSessionCount,
    bundleValidityDays: context.bundleValidityDays,
  });
};