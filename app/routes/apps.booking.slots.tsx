import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContextML } from "../models/booking-context.server";
import { computeSlotsForDateML } from "../models/slotAvailability.server";
import { getBookedCountsInRangeML } from "../models/booking.server";
import { getOrCreateShopSettingsML } from "../models/shopSettings.server";
import { localDayRangeUtcML } from "../utils/timezones";

const DATE_RE_ML = /^\d{4}-\d{2}-\d{2}$/;

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
  const dateML = urlML.searchParams.get("date");
  const locationIdML = urlML.searchParams.get("locationId");

  if (!productIdML || !dateML) {
    return Response.json(
      { error: "productId and date are required" },
      { status: 400 },
    );
  }
  if (!DATE_RE_ML.test(dateML)) {
    return Response.json(
      { error: "date must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  const contextML = await resolveBookingContextML(sessionML.shop, productIdML, locationIdML);
  if (!contextML) {
    return Response.json({ slots: [] });
  }

  const { start: dayStartML, end: dayEndML } = localDayRangeUtcML(
    dateML,
    contextML.location?.timezone ?? null,
  );
  const bookedCountsML = await getBookedCountsInRangeML(
    sessionML.shop,
    contextML.bookableProductId,
    dayStartML,
    dayEndML,
    contextML.location?.id,
  );

  const slotsML = computeSlotsForDateML(
    contextML.effectiveSettings,
    dateML,
    contextML.blackoutDates,
    new Date(),
    bookedCountsML,
    contextML.location?.timezone ?? null,
  );

  return Response.json({ slots: slotsML });
};