import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContext } from "../models/booking-context.server";
import { getAvailableDatesInMonth } from "../models/slotAvailability.server";
import { getBookedCountsInRange } from "../models/booking.server";
import { getBookingSettings } from "../models/bookingSettings.server";


export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!productId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return Response.json(
      { error: "productId, year, and month are required" },
      { status: 400 },
    );
  }
  if (month < 1 || month > 12) {
    return Response.json({ error: "month must be 1-12" }, { status: 400 });
  }

  const shopSettings = await getBookingSettings(session.shop);
  const timeFormat = shopSettings.timeFormat === "12h" ? "12h" : "24h";

  const context = await resolveBookingContext(session.shop, productId);
  if (!context) {
    return Response.json({ availableDates: [], timeFormat });
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const bookedCounts = await getBookedCountsInRange(
    session.shop,
    context.bookableProductId,
    monthStart,
    monthEnd,
  );

  const availableDates = getAvailableDatesInMonth(
    context.effectiveSettings,
    year,
    month,
    context.blackoutDates,
    new Date(),
    bookedCounts,
  );

  return Response.json({ availableDates, timeFormat });
};