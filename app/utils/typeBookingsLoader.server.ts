import type { LoaderFunctionArgs } from "react-router";
import type { BookingType } from "@prisma/client";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { listCustomFields } from "../models/customBookingField.server";
import { listBookings, type ListBookingsFilters } from "../models/booking.server";

// Shared by the four static per-type bookings routes (app.bookings.slot.tsx,
// .full-day.tsx, .multi-day.tsx, .bundle.tsx) so the query/filter logic
// lives in one place instead of being copy-pasted four times. These are
// plain static route files (not a $type dynamic route) specifically to
// avoid any path-matching ambiguity with sibling static routes like
// app.bookings.completed.tsx.
export async function loadTypeBookings(
  { request }: LoaderFunctionArgs,
  bookingType: BookingType,
) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const status = url.searchParams.get("status") || undefined;
  const bookableProductId = url.searchParams.get("productId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const filters: ListBookingsFilters = {
    status: status as ListBookingsFilters["status"],
    bookableProductId,
    search,
    dateFrom,
    dateTo,
    bookingType,
    // Completed bookings (date/time already passed) live on their own
    // page at /app/bookings/completed instead of cluttering this list.
    completed: false,
  };

  const [bookings, products, customFields] = await Promise.all([
    listBookings(session.shop, filters),
    listBookableProducts(session.shop),
    listCustomFields(session.shop),
  ]);

  return {
    bookings,
    // Only offer products of this booking type in the product filter —
    // picking a product of another type would always return zero results.
    products: products
      .filter((p) => p.bookingType === bookingType)
      .map((p) => ({ id: p.id, title: p.productTitle })),
    customFieldLabels: Object.fromEntries(
      customFields.map((f) => [f.fieldKey, f.label]),
    ) as Record<string, string>,
    filters: {
      status: status ?? "",
      bookableProductId: bookableProductId ?? "",
      search: search ?? "",
      dateFrom: dateFrom ?? "",
      dateTo: dateTo ?? "",
    },
  };
}
