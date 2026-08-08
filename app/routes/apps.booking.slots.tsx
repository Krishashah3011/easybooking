import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { resolveBookingContext } from "../models/booking-context.server";
import { computeSlotsForDate } from "../models/slotAvailability.server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /apps/booking/slots?productId=<gid>&date=<yyyy-mm-dd>
 *
 * Called from the storefront theme extension once a customer picks a date
 * on the calendar, to load that date's actual time slots.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const date = url.searchParams.get("date");

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

  const slots = computeSlotsForDate(
    context.effectiveSettings,
    date,
    context.blackoutDates,
  );

  return Response.json({ slots });
};
