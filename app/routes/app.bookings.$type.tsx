import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { BookingType } from "@prisma/client";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { listCustomFields } from "../models/customBookingField.server";
import { listBookings, type ListBookingsFilters } from "../models/booking.server";
import { bookingListAction } from "../utils/bookingListAction.server";
import { BookingsListPage } from "../components/BookingsList";

// URL slug -> BookingType, and the reverse for headings/messages. Keep the
// slugs in sync with the tab list in app.bookings.tsx.
const TYPE_BY_SLUG: Record<string, BookingType> = {
  slot: "SLOT",
  "full-day": "FULL_DAY",
  "multi-day": "MULTI_DAY",
  bundle: "BUNDLE",
};

const HEADING_BY_TYPE: Record<BookingType, string> = {
  SLOT: "Slot Bookings",
  FULL_DAY: "Full-Day Bookings",
  MULTI_DAY: "Multi-Day Bookings",
  BUNDLE: "Bundle Bookings",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const bookingType = TYPE_BY_SLUG[params.type ?? ""];
  if (!bookingType) {
    throw new Response("Not found", { status: 404 });
  }

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
  };

  const [bookings, products, customFields] = await Promise.all([
    listBookings(session.shop, filters),
    listBookableProducts(session.shop),
    listCustomFields(session.shop),
  ]);

  return {
    heading: HEADING_BY_TYPE[bookingType],
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
};

export const action = bookingListAction;

export default function TypeBookingsPage() {
  const { heading, bookings, products, customFieldLabels, filters } =
    useLoaderData<typeof loader>();

  return (
    <BookingsListPage
      heading={heading}
      bookings={bookings}
      products={products}
      customFieldLabels={customFieldLabels}
      filters={filters}
      emptyMessage={`No ${heading.toLowerCase()} match these filters.`}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};