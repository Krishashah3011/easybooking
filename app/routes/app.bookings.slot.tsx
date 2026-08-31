import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadTypeBookings } from "../utils/typeBookingsLoader.server";
import { bookingListAction } from "../utils/bookingListAction.server";
import { BookingsListPage } from "../components/BookingsList";

export const loader = (args: LoaderFunctionArgs) => loadTypeBookings(args, "SLOT");

export const action = bookingListAction;

export default function SlotBookingsPage() {
  const { bookings, products, customFieldLabels, filters } =
    useLoaderData<typeof loader>();

  return (
    <BookingsListPage
      heading="Slot Bookings"
      bookings={bookings}
      products={products}
      customFieldLabels={customFieldLabels}
      filters={filters}
      emptyMessage="No Pending Slot Bookings- they'll show up here once a customer books one."
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
