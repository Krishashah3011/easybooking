import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContextML } from "../models/booking-context.server";
import { getOrCreateShopSettingsML } from "../models/shopSettings.server";
import {
  getAvailableDatesInMonthML,
  getAvailableFullDayDatesInMonthML,
  getAvailableMultiDayNightsInMonthML,
  getFullDayCapacityInMonthML,
  getMultiDayCapacityInMonthML,
} from "../models/slotAvailability.server";
import {
  getBookedCountsInRangeML,
  getBookedNightCountsInRangeML,
} from "../models/booking.server";
import { localMonthRangeUtcML } from "../utils/timezones";


export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.public.appProxy(requestML);
  if (!sessionML) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const shopSettingsML = await getOrCreateShopSettingsML(sessionML.shop);
  if (!shopSettingsML.isAppEnabled) {
    return Response.json({ error: "Booking is currently unavailable" }, { status: 403 });
  }

  const urlML = new URL(requestML.url);
  const productIdML = urlML.searchParams.get("productId");
  const yearML = Number(urlML.searchParams.get("year"));
  const monthML = Number(urlML.searchParams.get("month"));
  const locationIdML = urlML.searchParams.get("locationId");

  if (!productIdML || !Number.isInteger(yearML) || !Number.isInteger(monthML)) {
    return Response.json(
      { error: "productId, year, and month are required" },
      { status: 400 },
    );
  }
  if (monthML < 1 || monthML > 12) {
    return Response.json({ error: "month must be 1-12" }, { status: 400 });
  }

  const contextML = await resolveBookingContextML(sessionML.shop, productIdML, locationIdML);
  if (!contextML) {
    return Response.json({ availableDates: [] });
  }

  const monthStartML = new Date(Date.UTC(yearML, monthML - 1, 1));
  const monthEndML = new Date(Date.UTC(yearML, monthML, 0, 23, 59, 59, 999));

  let availableDatesML: string[];
  let remainingCapacityByDateML: Record<string, number> | undefined;

  if (contextML.bookingType === "FULL_DAY") {
    const bookedCountsML = await getBookedCountsInRangeML(
      sessionML.shop,
      contextML.bookableProductId,
      monthStartML,
      monthEndML,
      contextML.location?.id,
    );
    availableDatesML = getAvailableFullDayDatesInMonthML(
      contextML.effectiveSettings,
      yearML,
      monthML,
      contextML.blackoutDates,
      new Date(),
      bookedCountsML,
    );
    remainingCapacityByDateML = getFullDayCapacityInMonthML(
      contextML.effectiveSettings,
      yearML,
      monthML,
      contextML.blackoutDates,
      new Date(),
      bookedCountsML,
    );
  } else if (contextML.bookingType === "MULTI_DAY") {
    const bookedNightCountsML = await getBookedNightCountsInRangeML(
      sessionML.shop,
      contextML.bookableProductId,
      monthStartML,
      monthEndML,
      contextML.location?.id,
    );
    availableDatesML = getAvailableMultiDayNightsInMonthML(
      contextML.effectiveSettings,
      yearML,
      monthML,
      contextML.blackoutDates,
      new Date(),
      bookedNightCountsML,
    );
    remainingCapacityByDateML = getMultiDayCapacityInMonthML(
      contextML.effectiveSettings,
      yearML,
      monthML,
      contextML.blackoutDates,
      new Date(),
      bookedNightCountsML,
    );
  } else {
    const localMonthML = localMonthRangeUtcML(
      yearML,
      monthML,
      contextML.location?.timezone ?? null,
    );
    const bookedCountsML = await getBookedCountsInRangeML(
      sessionML.shop,
      contextML.bookableProductId,
      localMonthML.start,
      localMonthML.end,
      contextML.location?.id,
    );
    availableDatesML = getAvailableDatesInMonthML(
      contextML.effectiveSettings,
      yearML,
      monthML,
      contextML.blackoutDates,
      new Date(),
      bookedCountsML,
      contextML.location?.timezone ?? null,
    );
  }

  return Response.json({
    availableDates: availableDatesML,
    bookingType: contextML.bookingType,
    minNights: contextML.minNights,
    maxNights: contextML.maxNights,
    bundleSessionCount: contextML.bundleSessionCount,
    bundleValidityDays: contextML.bundleValidityDays,
    dailyStartTime: contextML.effectiveSettings.dailyStartTime,
    dailyEndTime: contextML.effectiveSettings.dailyEndTime,
    ...(remainingCapacityByDateML ? { remainingCapacityByDate: remainingCapacityByDateML } : {}),
  });
};