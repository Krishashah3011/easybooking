import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { listCustomFields } from "../models/customBookingField.server";
import { listBookings, type ListBookingsFilters } from "../models/booking.server";
import { bookingListAction } from "../utils/bookingListAction.server";
import { BookingsListPage } from "../components/BookingsList";

// Combined, all-booking-types view. It's no longer one of the Bookings
// subtabs (those are New Booking + one tab per booking type), but it stays
// reachable directly at /app/bookings so existing deep links keep working —
// e.g. the dashboard's "View all bookings" and "Review overbooked bookings"
// links, which intentionally span every type.
export const loader = async ({ request }: LoaderFunctionArgs) => {
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
    // Keep this combined view focused on what's still pending — completed
    // bookings live on their own page at /app/bookings/completed.
    completed: false,
  };

  const [bookings, products, customFields] = await Promise.all([
    listBookings(session.shop, filters),
    listBookableProducts(session.shop),
    listCustomFields(session.shop),
  ]);

  return {
    bookings,
    products: products.map((p) => ({ id: p.id, title: p.productTitle })),
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
};

export const action = bookingListAction;

export default function BookingManagementPage() {
  const { bookings, products, customFieldLabels, filters } =
    useLoaderData<typeof loader>();

  return (
    <BookingsListPage
      heading="All Bookings"
      bookings={bookings}
      products={products}
      customFieldLabels={customFieldLabels}
      filters={filters}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};