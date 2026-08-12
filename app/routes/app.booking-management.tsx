import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { listCustomFields } from "../models/customBookingField.server";
import {
  cancelBooking,
  listBookings,
  rescheduleBooking,
  type BookingWithProductTitle,
  type ListBookingsFilters,
} from "../models/booking.server";

type FieldChangeEvent = { currentTarget: { value: string } };

const STATUS_OPTIONS = ["", "CONFIRMED", "OVERBOOKED", "CANCELLED"] as const;

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "cancel" | "reschedule" | "";

  if (intent === "cancel") {
    const id = String(formData.get("id") ?? "");
    const result = await cancelBooking(session.shop, id);
    return { intent, ...result };
  }

  if (intent === "reschedule") {
    const id = String(formData.get("id") ?? "");
    const date = String(formData.get("date") ?? "");
    const slotStart = String(formData.get("slotStart") ?? "");
    const result = await rescheduleBooking(session.shop, id, date, slotStart);
    return { intent, ...result };
  }

  return { intent, ok: false as const, error: "Unknown action." };
};

function CustomFieldAnswers({
  responses,
  labels,
}: {
  responses: unknown;
  labels: Record<string, string>;
}) {
  if (!responses || typeof responses !== "object") return null;
  const entries = Object.entries(responses as Record<string, string>);
  if (entries.length === 0) return null;

  return (
    <s-stack direction="block" gap="none">
      {entries.map(([fieldKey, value]) => (
        <s-text key={fieldKey} tone="subdued">
          {(labels[fieldKey] ?? fieldKey) + ": " + value}
        </s-text>
      ))}
    </s-stack>
  );
}

function BookingRow({
  booking,
  customFieldLabels,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const cancelFetcher = useFetcher<typeof action>();
  const rescheduleFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(booking.date);
  const [newSlotStart, setNewSlotStart] = useState(booking.slotStart);

  const rescheduleError =
    rescheduleFetcher.data?.intent === "reschedule" &&
    !rescheduleFetcher.data.ok
      ? rescheduleFetcher.data.error
      : null;

  useEffect(() => {
    if (
      rescheduleFetcher.data?.intent === "reschedule" &&
      rescheduleFetcher.data.ok
    ) {
      shopify.toast.show("Booking rescheduled");
      setIsRescheduling(false);
    }
  }, [rescheduleFetcher.data, shopify]);

  useEffect(() => {
    if (cancelFetcher.data?.intent === "cancel" && cancelFetcher.data.ok) {
      shopify.toast.show("Booking cancelled");
    }
  }, [cancelFetcher.data, shopify]);

  const handleCancel = () => {
    cancelFetcher.submit(
      { intent: "cancel", id: booking.id },
      { method: "POST" },
    );
  };

  const handleReschedule = () => {
    rescheduleFetcher.submit(
      {
        intent: "reschedule",
        id: booking.id,
        date: newDate,
        slotStart: newSlotStart,
      },
      { method: "POST" },
    );
  };

  return (
    <s-table-row>
      <s-table-cell>{booking.productTitle}</s-table-cell>
      <s-table-cell>
        <s-stack direction="block" gap="none">
          <s-text>
            {booking.customerName ?? "—"}
            {booking.customerEmail ? ` (${booking.customerEmail})` : ""}
          </s-text>
          <CustomFieldAnswers
            responses={booking.customFieldResponses}
            labels={customFieldLabels}
          />
        </s-stack>
      </s-table-cell>
      <s-table-cell>
        {isRescheduling ? (
          <s-stack direction="inline" gap="small">
            <s-date-field
              label="New date"
              labelAccessibilityVisibility="exclusive"
              value={newDate}
              onChange={(e: FieldChangeEvent) =>
                setNewDate(e.currentTarget.value)
              }
            ></s-date-field>
            <s-text-field
              label="New time"
              labelAccessibilityVisibility="exclusive"
              placeholder="HH:mm"
              value={newSlotStart}
              onChange={(e: FieldChangeEvent) =>
                setNewSlotStart(e.currentTarget.value)
              }
            ></s-text-field>
          </s-stack>
        ) : (
          `${booking.date} ${booking.slotStart}–${booking.slotEnd}`
        )}
      </s-table-cell>
      <s-table-cell>
        <s-badge
          tone={
            booking.status === "CONFIRMED"
              ? "success"
              : booking.status === "OVERBOOKED"
                ? "critical"
                : "neutral"
          }
        >
          {booking.status}
        </s-badge>
      </s-table-cell>
      <s-table-cell>{booking.source}</s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small">
          {booking.status !== "CANCELLED" && (
            <>
              {isRescheduling ? (
                <>
                  <s-button variant="primary" onClick={handleReschedule}>
                    Save
                  </s-button>
                  <s-button
                    variant="tertiary"
                    onClick={() => setIsRescheduling(false)}
                  >
                    Cancel edit
                  </s-button>
                </>
              ) : (
                <s-button
                  variant="tertiary"
                  onClick={() => setIsRescheduling(true)}
                >
                  Reschedule
                </s-button>
              )}
              <s-button
                variant="tertiary"
                tone="critical"
                onClick={handleCancel}
              >
                Cancel booking
              </s-button>
            </>
          )}
        </s-stack>
        {rescheduleError && (
          <s-banner tone="critical">{rescheduleError}</s-banner>
        )}
      </s-table-cell>
    </s-table-row>
  );
}

export default function BookingManagementPage() {
  const { bookings, products, customFieldLabels, filters } =
    useLoaderData<typeof loader>();

  const [search, setSearch] = useState(filters.search);
  const [status, setStatus] = useState(filters.status);
  const [productId, setProductId] = useState(filters.bookableProductId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (productId) params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.search = params.toString();
  };

  return (
    <s-page heading="Booking Management">
      <s-section heading="Filters">
        <s-stack direction="inline" gap="base">
          <s-text-field
            label="Search customer or order"
            value={search}
            onChange={(e: FieldChangeEvent) => setSearch(e.currentTarget.value)}
          ></s-text-field>
          <s-select
            label="Status"
            value={status}
            onChange={(e: FieldChangeEvent) => setStatus(e.currentTarget.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <s-option key={s} value={s}>
                {s || "All"}
              </s-option>
            ))}
          </s-select>
          <s-select
            label="Product"
            value={productId}
            onChange={(e: FieldChangeEvent) =>
              setProductId(e.currentTarget.value)
            }
          >
            <s-option value="">All</s-option>
            {products.map((p) => (
              <s-option key={p.id} value={p.id}>
                {p.title}
              </s-option>
            ))}
          </s-select>
          <s-date-field
            label="From"
            value={dateFrom}
            onChange={(e: FieldChangeEvent) =>
              setDateFrom(e.currentTarget.value)
            }
          ></s-date-field>
          <s-date-field
            label="To"
            value={dateTo}
            onChange={(e: FieldChangeEvent) => setDateTo(e.currentTarget.value)}
          ></s-date-field>
          <s-button onClick={applyFilters}>Apply</s-button>
        </s-stack>
      </s-section>

      <s-section heading="Bookings">
        {bookings.length === 0 ? (
          <s-paragraph>No bookings match these filters.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Customer</s-table-header>
              <s-table-header>When</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Source</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  customFieldLabels={customFieldLabels}
                />
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};