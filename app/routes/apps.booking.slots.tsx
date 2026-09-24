import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContext } from "../models/booking-context.server";
import { computeSlotsForDate } from "../models/slotAvailability.server";
import { getBookedCountsInRange } from "../models/booking.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import { localDayRangeUtc } from "../utils/timezones";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const shopSettings = await getOrCreateShopSettings(session.shop);
  if (!shopSettings.isAppEnabled) {
    return Response.json({ error: "Booking is currently unavailable" }, { status: 403 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const date = url.searchParams.get("date");
  const locationId = url.searchParams.get("locationId");

  if (!productId || !date) {
    return Response.json(
      { error: "productId and date are required" },
      { status: 400 },
    );
  }
  if (!DATE_RE.test(date)) {
    return Response.json(
      { error: "date must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  const context = await resolveBookingContext(session.shop, productId, locationId);
  if (!context) {
    return Response.json({ slots: [] });
  }

  // Count bookings over the local day in the location's timezone, not the UTC
  // day, so late/early slots that fall on a neighbouring UTC date are included.
  const { start: dayStart, end: dayEnd } = localDayRangeUtc(
    date,
    context.location?.timezone ?? null,
  );
  const bookedCounts = await getBookedCountsInRange(
    session.shop,
    context.bookableProductId,
    dayStart,
    dayEnd,
    context.location?.id,
  );

  const slots = computeSlotsForDate(
    context.effectiveSettings,
    date,
    context.blackoutDates,
    new Date(),
    bookedCounts,
    context.location?.timezone ?? null,
  );

  return Response.json({ slots });
};