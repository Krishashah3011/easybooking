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
import {
  listBookableProducts,
  resolveEffectiveSettings,
} from "../models/bookableProduct.server";
import { getBookingSettings } from "../models/bookingSettings.server";
import {
  computeSlotsForDate,
  getAvailableDatesInMonth,
  type TimeSlot,
} from "../models/slotAvailability.server";
import {
  listShopBlackoutDates,
  listProductBlackoutDates,
} from "../models/blackoutDate.server";
import { createManualBooking, getBookedCountsInRange } from "../models/booking.server";
import { formatTimeRangeDisplay, type TimeFormat } from "../utils/format";

type FieldChangeEvent = { currentTarget: { value: string } };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [allProducts, shopSettings] = await Promise.all([
    listBookableProducts(session.shop),
    getBookingSettings(session.shop),
  ]);
  const enabledProducts = allProducts.filter((p) => p.isEnabled);
  return {
    products: enabledProducts.map((p) => ({ id: p.id, title: p.productTitle })),
    timeFormat: (shopSettings.timeFormat === "12h" ? "12h" : "24h") as TimeFormat,
  };
};

async function resolveBlackoutDatesAndSettings(
  shop: string,
  bookableProductId: string,
) {
  const bookableProduct = await listBookableProducts(shop).then((products) =>
    products.find((p) => p.id === bookableProductId),
  );
  if (!bookableProduct) return null;

  const [shopSettings, shopBlackouts, productBlackouts] = await Promise.all([
    getBookingSettings(shop),
    listShopBlackoutDates(shop),
    listProductBlackoutDates(shop, bookableProductId),
  ]);

  const blackoutDates = new Set<string>([
    ...shopBlackouts.map((b: { date: Date }) => b.date.toISOString().slice(0, 10)),
    ...productBlackouts.map((b: { date: Date }) => b.date.toISOString().slice(0, 10)),
  ]);

  const effectiveSettings = resolveEffectiveSettings(shopSettings, bookableProduct);

  return { effectiveSettings, blackoutDates };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    | "loadAvailability"
    | "loadSlots"
    | "createBooking"
    | "";

  if (intent === "loadAvailability") {
    const bookableProductId = String(formData.get("bookableProductId") ?? "");
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    if (!bookableProductId || !Number.isInteger(year) || !Number.isInteger(month)) {
      return { intent, ok: false as const, availableDates: [] as string[] };
    }

    const resolved = await resolveBlackoutDatesAndSettings(
      session.shop,
      bookableProductId,
    );
    if (!resolved) {
      return { intent, ok: false as const, availableDates: [] as string[] };
    }

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const bookedCounts = await getBookedCountsInRange(
      session.shop,
      bookableProductId,
      monthStart,
      monthEnd,
    );

    const availableDates = getAvailableDatesInMonth(
      resolved.effectiveSettings,
      year,
      month,
      resolved.blackoutDates,
      new Date(),
      bookedCounts,
    );

    return { intent, ok: true as const, availableDates };
  }

  if (intent === "loadSlots") {
    const bookableProductId = String(formData.get("bookableProductId") ?? "");
    const date = String(formData.get("date") ?? "");
    if (!bookableProductId || !date) {
      return { intent, ok: false as const, slots: [] as TimeSlot[] };
    }

    const resolved = await resolveBlackoutDatesAndSettings(
      session.shop,
      bookableProductId,
    );
    if (!resolved) {
      return { intent, ok: false as const, slots: [] as TimeSlot[] };
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const bookedCounts = await getBookedCountsInRange(
      session.shop,
      bookableProductId,
      dayStart,
      dayEnd,
    );

    const slots = computeSlotsForDate(
      resolved.effectiveSettings,
      date,
      resolved.blackoutDates,
      new Date(),
      bookedCounts,
    );

    return { intent, ok: true as const, slots };
  }

  if (intent === "createBooking") {
    const result = await createManualBooking(session.shop, {
      bookableProductId: String(formData.get("bookableProductId") ?? ""),
      date: String(formData.get("date") ?? ""),
      slotStart: String(formData.get("slotStart") ?? ""),
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? "") || null,
      customerPhone: String(formData.get("customerPhone") ?? "") || null,
    });

    if (!result.ok) {
      return { intent, ok: false as const, error: result.error };
    }
    return { intent, ok: true as const, booking: result.booking };
  }

  return { intent, ok: false as const };
};

export default function NewBookingPage() {
  const { products, timeFormat } = useLoaderData<typeof loader>();
  const availabilityFetcher = useFetcher<typeof action>();
  const slotsFetcher = useFetcher<typeof action>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const today = new Date();

  const [bookableProductId, setBookableProductId] = useState(
    products[0]?.id ?? "",
  );
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth() + 1);
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");

  const availableDates: string[] =
    availabilityFetcher.data?.intent === "loadAvailability" &&
    availabilityFetcher.data.ok
      ? availabilityFetcher.data.availableDates
      : [];

  const slots: TimeSlot[] =
    slotsFetcher.data?.intent === "loadSlots" && slotsFetcher.data.ok
      ? slotsFetcher.data.slots
      : [];

  const createError =
    createFetcher.data?.intent === "createBooking" && !createFetcher.data.ok
      ? createFetcher.data.error
      : null;

  const loadAvailability = (productId: string, year: number, month: number) => {
    if (!productId) return;
    availabilityFetcher.submit(
      {
        intent: "loadAvailability",
        bookableProductId: productId,
        year: String(year),
        month: String(month),
      },
      { method: "POST" },
    );
  };

  useEffect(() => {
    setDate("");
    setSelectedSlot(null);
    loadAvailability(bookableProductId, viewYear, viewMonth);
  }, [bookableProductId, viewYear, viewMonth]);

  useEffect(() => {
    if (createFetcher.data?.intent === "createBooking" && createFetcher.data.ok) {
      shopify.toast.show("Booking created");
      setSelectedSlot(null);
      setCustomerName("");
      setCustomerEmail("");
      setEmailTouched(false);
      setCustomerPhone("");
      loadAvailability(bookableProductId, viewYear, viewMonth);
      if (date) {
        slotsFetcher.submit(
          { intent: "loadSlots", bookableProductId, date },
          { method: "POST" },
        );
      }
    }
  }, [createFetcher.data, shopify]);

  const goToMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const selectDate = (dateStr: string) => {
    setDate(dateStr);
    setSelectedSlot(null);
    slotsFetcher.submit(
      { intent: "loadSlots", bookableProductId, date: dateStr },
      { method: "POST" },
    );
  };

  const handleCreateBooking = () => {
    if (!bookableProductId || !date || !selectedSlot || !customerName || !customerEmail) return;
    createFetcher.submit(
      {
        intent: "createBooking",
        bookableProductId,
        date,
        slotStart: selectedSlot.start,
        customerName,
        customerEmail,
        customerPhone,
      },
      { method: "POST" },
    );
  };

  if (products.length === 0) {
    return (
      <s-page heading="New Booking">
        <s-section>
          <s-paragraph>
            No products have booking enabled yet. Enable booking on a
            product first from the Products page.
          </s-paragraph>
        </s-section>
      </s-page>
    );
  }

  const availableSet = new Set(availableDates);
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
  const isLoadingAvailability = availabilityFetcher.state !== "idle";

  return (
    <s-page heading="New Booking">
      <s-section heading="Product">
        <s-select
          label="Product"
          value={bookableProductId}
          onChange={(e: FieldChangeEvent) =>
            setBookableProductId(e.currentTarget.value)
          }
        >
          {products.map((p) => (
            <s-option key={p.id} value={p.id}>
              {p.title}
            </s-option>
          ))}
        </s-select>
      </s-section>

      <s-section heading="Date">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            maxWidth: "20rem",
          }}
        >
          <s-button variant="tertiary" onClick={() => goToMonth(-1)}>
            ‹
          </s-button>
          <span style={{ fontWeight: 600 }}>
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </span>
          <s-button variant="tertiary" onClick={() => goToMonth(1)}>
            ›
          </s-button>
        </div>

        {isLoadingAvailability ? (
          <s-paragraph>Loading availability…</s-paragraph>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 2.4rem)",
              gap: "0.25rem",
              maxWidth: "20rem",
            }}
          >
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isAvailable = availableSet.has(dateStr);
              const isSelected = dateStr === date;
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && selectDate(dateStr)}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: isAvailable ? "pointer" : "not-allowed",
                    background: isSelected
                      ? "#111"
                      : isAvailable
                        ? "rgba(0,0,0,0.06)"
                        : "transparent",
                    color: isSelected
                      ? "#fff"
                      : isAvailable
                        ? "inherit"
                        : "rgba(0,0,0,0.3)",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
        {!isLoadingAvailability && availableDates.length === 0 && (
          <s-paragraph>No availability this month.</s-paragraph>
        )}
      </s-section>

      {date && (
        <s-section heading="Available times">
          {slots.length === 0 ? (
            <s-paragraph>No slots at all on this date.</s-paragraph>
          ) : (
            <s-stack direction="inline" gap="base">
              {slots.map((slot) => (
                <s-button
                  key={slot.startsAt}
                  variant={
                    selectedSlot?.startsAt === slot.startsAt
                      ? "primary"
                      : "secondary"
                  }
                  {...(!slot.available ? { disabled: true } : {})}
                  onClick={() => {
                    if (slot.available) setSelectedSlot(slot);
                  }}
                >
                  {formatTimeRangeDisplay(slot.start, slot.end, timeFormat)}
                  {!slot.available ? " (Booked)" : ""}
                </s-button>
              ))}
            </s-stack>
          )}
        </s-section>
      )}

      {selectedSlot && (
        <s-section heading="Customer details">
          <s-stack direction="inline" gap="base">
            <s-text-field
              label="Name"
              required
              value={customerName}
              onChange={(e: FieldChangeEvent) =>
                setCustomerName(e.currentTarget.value)
              }
            ></s-text-field>
              <s-text-field
                label="Email"
                required
                value={customerEmail}
                error={
                  emailTouched &&
                  customerEmail !== "" &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
                    ? "Please enter a valid email address"
                    : undefined
                }
                onChange={(e: FieldChangeEvent) =>
                  setCustomerEmail(e.currentTarget.value)
                }
                onBlur={() => setEmailTouched(true)}
              ></s-text-field>
            <s-text-field
              label="Phone"
              value={customerPhone}
              onChange={(e: FieldChangeEvent) =>
                setCustomerPhone(e.currentTarget.value)
              }
            ></s-text-field>
          </s-stack>

          {createError && <s-banner tone="critical">{createError}</s-banner>}

          <s-button
            variant="primary"
            onClick={handleCreateBooking}
            {...(!customerName || !customerEmail ? { disabled: false } : {})}
          >
            Create booking
          </s-button>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};