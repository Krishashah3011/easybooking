import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContext } from "../models/booking-context.server";
import { computeSlotsForDate } from "../models/slotAvailability.server";
import { getBookedCountsInRange } from "../models/booking.server";
import { getLocationById } from "../models/bookingLocation.server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
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

  const context = await resolveBookingContext(session.shop, productId);
  if (!context) {
    return Response.json({ slots: [] });
  }

  const location = locationId
    ? await getLocationById(session.shop, locationId)
    : null;

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const bookedCounts = await getBookedCountsInRange(
    session.shop,
    context.bookableProductId,
    dayStart,
    dayEnd,
  );

  const slots = computeSlotsForDate(
    context.effectiveSettings,
    date,
    context.blackoutDates,
    new Date(),
    bookedCounts,
    location?.timezone ?? null,
  );

  return Response.json({ slots });
};