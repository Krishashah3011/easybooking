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
import {
  computeSlotsForDate,
  getAvailableDatesInMonth,
  getAvailableFullDayDatesInMonth,
  getAvailableMultiDayNightsInMonth,
  type TimeSlot,
} from "../models/slotAvailability.server";
import { resolveBookingContext } from "../models/booking-context.server";
import {
  createManualBooking,
  getBookedCountsInRange,
  getBookedNightCountsInRange,
} from "../models/booking.server";
import { listEnabledLocations } from "../models/bookingLocation.server";
import { listCustomFields, toPublicField } from "../models/customBookingField.server";
import { formatTimeRangeDisplay } from "../utils/format";

type FieldChangeEvent = { currentTarget: { value: string } };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type QueuedSlotInput = {
  bookableProductId: string;
  date: string;
  slotStart: string;
  endDate?: string | null;
  quantity: number;
};
type SlotResult = {
  bookableProductId: string;
  date: string;
  slotStart: string;
  ok: boolean;
  error?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const allProducts = await listBookableProducts(session.shop);
  const enabledProducts = allProducts.filter((p) => p.isEnabled);
  const [locations, customFields] = await Promise.all([
    listEnabledLocations(session.shop),
    listCustomFields(session.shop),
  ]);
  return {
    products: enabledProducts.map((p) => ({
      id: p.id,
      title: p.productTitle,
      bookingType: p.bookingType,
      minNights: p.minNights,
      maxNights: p.maxNights,
    })),
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    customFields: customFields.map(toPublicField),
  };
};

async function resolveBlackoutDatesAndSettings(
  shop: string,
  bookableProductId: string,
  locationId?: string | null,
) {
  const context = await resolveBookingContext(shop, bookableProductId, locationId);
  if (!context) return null;
  return {
    bookingType: context.bookingType,
    effectiveSettings: context.effectiveSettings,
    blackoutDates: context.blackoutDates,
    location: context.location,
  };
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
    const locationId = String(formData.get("locationId") ?? "") || null;
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    if (!bookableProductId || !Number.isInteger(year) || !Number.isInteger(month)) {
      return { intent, ok: false as const, availableDates: [] as string[] };
    }

    const resolved = await resolveBlackoutDatesAndSettings(
      session.shop,
      bookableProductId,
      locationId,
    );
    if (!resolved) {
      return { intent, ok: false as const, availableDates: [] as string[] };
    }

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    let availableDates: string[];
    if (resolved.bookingType === "FULL_DAY") {
      const bookedCounts = await getBookedCountsInRange(
        session.shop,
        bookableProductId,
        monthStart,
        monthEnd,
      );
      availableDates = getAvailableFullDayDatesInMonth(
        resolved.effectiveSettings,
        year,
        month,
        resolved.blackoutDates,
        new Date(),
        bookedCounts,
      );
    } else if (resolved.bookingType === "MULTI_DAY") {
      const bookedNightCounts = await getBookedNightCountsInRange(
        session.shop,
        bookableProductId,
        monthStart,
        monthEnd,
      );
      availableDates = getAvailableMultiDayNightsInMonth(
        resolved.effectiveSettings,
        year,
        month,
        resolved.blackoutDates,
        new Date(),
        bookedNightCounts,
      );
    } else {
      const bookedCounts = await getBookedCountsInRange(
        session.shop,
        bookableProductId,
        monthStart,
        monthEnd,
      );
      availableDates = getAvailableDatesInMonth(
        resolved.effectiveSettings,
        year,
        month,
        resolved.blackoutDates,
        new Date(),
        bookedCounts,
        resolved.location?.timezone ?? null,
      );
    }

    return { intent, ok: true as const, availableDates };
  }

  if (intent === "loadSlots") {
    const bookableProductId = String(formData.get("bookableProductId") ?? "");
    const locationId = String(formData.get("locationId") ?? "") || null;
    const date = String(formData.get("date") ?? "");
    if (!bookableProductId || !date) {
      return { intent, ok: false as const, slots: [] as TimeSlot[] };
    }

    const resolved = await resolveBlackoutDatesAndSettings(
      session.shop,
      bookableProductId,
      locationId,
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
      resolved.location?.timezone ?? null,
    );

    return { intent, ok: true as const, slots };
  }

  if (intent === "createBooking") {
    const location = String(formData.get("location") ?? "") || null;
    const locationId = String(formData.get("locationId") ?? "") || null;
    const customerName = String(formData.get("customerName") ?? "");
    const customerEmail = String(formData.get("customerEmail") ?? "") || null;
    const customerPhone = String(formData.get("customerPhone") ?? "") || null;

    let customFieldResponses: Record<string, string> = {};
    try {
      customFieldResponses = JSON.parse(
        String(formData.get("customFieldResponses") ?? "{}"),
      );
    } catch {
      customFieldResponses = {};
    }

    let slots: QueuedSlotInput[] = [];
    try {
      slots = JSON.parse(String(formData.get("slots") ?? "[]"));
    } catch {
      slots = [];
    }

    if (slots.length === 0) {
      return {
        intent,
        ok: false as const,
        error: "Add at least one date/time before creating a booking.",
      };
    }

    const groupId = slots.length > 1 ? crypto.randomUUID() : undefined;

    const results: SlotResult[] = [];
    for (const slot of slots) {
      const result = await createManualBooking(session.shop, {
        bookableProductId: slot.bookableProductId,
        date: slot.date,
        slotStart: slot.slotStart,
        endDate: slot.endDate ?? null,
        quantity: slot.quantity,
        location,
        locationId,
        customerName,
        customerEmail,
        customerPhone,
        customFieldResponses,
        groupId,
      });
      results.push({
        bookableProductId: slot.bookableProductId,
        date: slot.date,
        slotStart: slot.slotStart,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
      });
    }

    const createdCount = results.filter((r) => r.ok).length;
    const failedCount = results.length - createdCount;

    return {
      intent,
      ok: failedCount === 0,
      results,
      createdCount,
      failedCount,
    };
  }

  return { intent, ok: false as const };
};

export default function NewBookingPage() {
  const { products, locations, customFields } = useLoaderData<typeof loader>();
  const availabilityFetcher = useFetcher<typeof action>();
  const slotsFetcher = useFetcher<typeof action>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const today = new Date();

  const [bookableProductId, setBookableProductId] = useState(
    products[0]?.id ?? "",
  );
  const selectedProduct = products.find((p) => p.id === bookableProductId);
  const selectedBookingType = selectedProduct?.bookingType ?? "SLOT";
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth() + 1);
  const [date, setDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [queuedSlots, setQueuedSlots] = useState<
    Array<{
      bookableProductId: string;
      productTitle: string;
      date: string;
      slot: TimeSlot;
      endDate?: string | null;
      quantity: number;
      error?: string;
    }>
  >([]);
  const [customerName, setCustomerName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const availableDates: string[] =
    availabilityFetcher.data?.intent === "loadAvailability" &&
    availabilityFetcher.data.ok
      ? availabilityFetcher.data.availableDates
      : [];

  const slots: TimeSlot[] =
    slotsFetcher.data?.intent === "loadSlots" && slotsFetcher.data.ok
      ? slotsFetcher.data.slots
      : [];

  const createResult =
    createFetcher.data?.intent === "createBooking" ? createFetcher.data : null;
  const createError =
    createResult && "error" in createResult ? createResult.error : null;

  const maxQuantity = Math.max(
    1,
    typeof selectedSlot?.remainingCapacity === "number"
      ? selectedSlot.remainingCapacity
      : 1,
  );

  const loadAvailability = (productId: string, year: number, month: number) => {
    if (!productId) return;
    availabilityFetcher.submit(
      {
        intent: "loadAvailability",
        bookableProductId: productId,
        locationId,
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
  }, [bookableProductId, viewYear, viewMonth, locationId]);

  useEffect(() => {
    if (selectedSlot) {
      setQuantity(1);
    }
  }, [selectedSlot]);

  useEffect(() => {
    if (!date || selectedBookingType !== "SLOT") return;
    setSelectedSlot(null);
    slotsFetcher.submit(
      { intent: "loadSlots", bookableProductId, locationId, date },
      { method: "POST" },
    );
  }, [locationId]);

  useEffect(() => {
    if (createFetcher.data?.intent !== "createBooking") return;
    const result = createFetcher.data;
    if (!("results" in result) || !result.results) return;

    const results = result.results;
    const createdCount = result.createdCount ?? 0;
    const failedCount = result.failedCount ?? 0;

    shopify.toast.show(
      failedCount > 0
        ? `Created ${createdCount} of ${createdCount + failedCount} booking(s)`
        : `Created ${createdCount} booking(s)`,
    );

    if (failedCount === 0) {
      setQueuedSlots([]);
      setCustomFieldValues({});
      setCustomerName("");
      setNameTouched(false);
      setCustomerEmail("");
      setEmailTouched(false);
      setCustomerPhone("");
      setSubmitAttempted(false);
    } else {
      setQueuedSlots((prev) =>
        prev
          .map((entry) => {
            const match = results.find(
              (r) =>
                r.bookableProductId === entry.bookableProductId &&
                r.date === entry.date &&
                r.slotStart === entry.slot.start,
            );
            if (!match) return entry;
            return match.ok ? null : { ...entry, error: match.error };
          })
          .filter((entry): entry is (typeof prev)[number] => entry !== null),
      );
    }
    loadAvailability(bookableProductId, viewYear, viewMonth);
    if (date) {
      slotsFetcher.submit(
        { intent: "loadSlots", bookableProductId, locationId, date },
        { method: "POST" },
      );
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
    setCheckoutDate("");
    if (selectedBookingType === "FULL_DAY") {
      setSelectedSlot({
        start: "00:00",
        end: "23:59",
        startsAt: `${dateStr}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
      return;
    }
    if (selectedBookingType === "MULTI_DAY") {
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot(null);
    slotsFetcher.submit(
      { intent: "loadSlots", bookableProductId, locationId, date: dateStr },
      { method: "POST" },
    );
  };

  const handleSetCheckoutDate = (value: string) => {
    setCheckoutDate(value);
    if (date && value && value > date) {
      setSelectedSlot({
        start: "00:00",
        end: "00:00",
        startsAt: `${date}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
    } else {
      setSelectedSlot(null);
    }
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const multiDayStayLengthMessage = (() => {
    if (selectedBookingType !== "MULTI_DAY") return null;
    const min = selectedProduct?.minNights ?? null;
    const max = selectedProduct?.maxNights ?? null;
    if (min !== null && max !== null) {
      return `Stay must be between ${min} and ${max} nights.`;
    }
    if (min !== null) return `Minimum stay is ${min} nights.`;
    if (max !== null) return `Maximum stay is ${max} nights.`;
    return null;
  })();

  const nameError =
    (nameTouched || submitAttempted) && !customerName.trim()
      ? "Name is required"
      : undefined;

  const emailError =
    (emailTouched || submitAttempted) && !customerEmail.trim()
      ? "Email is required"
      : (emailTouched || submitAttempted) &&
          customerEmail !== "" &&
          !isValidEmail(customerEmail)
        ? "Please enter a valid email address"
        : undefined;

  const handleAddToList = () => {
    if (!date || !selectedSlot) return;
    if (selectedBookingType === "MULTI_DAY" && !checkoutDate) return;
    const alreadyQueued = queuedSlots.some(
      (entry) =>
        entry.bookableProductId === bookableProductId &&
        entry.date === date &&
        entry.slot.startsAt === selectedSlot.startsAt,
    );
    if (!alreadyQueued) {
      const productTitle =
        products.find((p) => p.id === bookableProductId)?.title ?? "";
      setQueuedSlots((prev) => [
        ...prev,
        {
          bookableProductId,
          productTitle,
          date,
          slot: selectedSlot,
          endDate: selectedBookingType === "MULTI_DAY" ? checkoutDate : null,
          quantity,
        },
      ]);
    }
    setDate("");
    setCheckoutDate("");
    setSelectedSlot(null);
  };

  const handleRemoveQueued = (index: number) => {
    setQueuedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateBooking = () => {
    setSubmitAttempted(true);
    setNameTouched(true);
    setEmailTouched(true);

    if (
      queuedSlots.length === 0 ||
      !customerName.trim() ||
      !customerEmail.trim() ||
      !isValidEmail(customerEmail)
    ) {
      return;
    }

    const selectedLocation = locations.find((l) => l.id === locationId);

    createFetcher.submit(
      {
        intent: "createBooking",
        location: selectedLocation?.name ?? "",
        locationId: selectedLocation?.id ?? "",
        customFieldResponses: JSON.stringify(customFieldValues),
        slots: JSON.stringify(
          queuedSlots.map((entry) => ({
            bookableProductId: entry.bookableProductId,
            date: entry.date,
            slotStart: entry.slot.start,
            endDate: entry.endDate ?? null,
            quantity: entry.quantity,
          })),
        ),
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
  const isLoadingSlots = slotsFetcher.state !== "idle";
  const isCreatingBooking = createFetcher.state !== "idle";

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

      {locations.length > 0 && (
        <s-section heading="Location">
          <s-select
            label="Location"
            value={locationId}
            onChange={(e: FieldChangeEvent) =>
              setLocationId(e.currentTarget.value)
            }
          >
            {locations.map((l) => (
              <s-option key={l.id} value={l.id}>
                {l.name}
              </s-option>
            ))}
          </s-select>
        </s-section>
      )}

      <s-section heading="Date">
        {multiDayStayLengthMessage && (
          <s-banner tone="info">{multiDayStayLengthMessage}</s-banner>
        )}
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

      {date && selectedBookingType === "MULTI_DAY" && (
        <s-section heading="Check-out date">
          {multiDayStayLengthMessage && (
            <s-banner tone="info">{multiDayStayLengthMessage}</s-banner>
          )}
          <s-text-field
            label="Check-out"
            type="date"
            value={checkoutDate}
            onChange={(e: FieldChangeEvent) =>
              handleSetCheckoutDate(e.currentTarget.value)
            }
          ></s-text-field>
          {checkoutDate && checkoutDate <= date && (
            <s-banner tone="critical">
              Check-out must be after check-in.
            </s-banner>
          )}
        </s-section>
      )}

      {date && selectedBookingType === "FULL_DAY" && (
        <s-section heading="Booking">
          <s-paragraph>Whole day {"\u2014"} {date}</s-paragraph>
        </s-section>
      )}

      {date &&
        (selectedBookingType === "SLOT" || selectedBookingType === "BUNDLE") && (
          <s-section heading="Available times">
            {isLoadingSlots ? (
              <s-paragraph>Loading available times…</s-paragraph>
            ) : slots.length === 0 ? (
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
                    {formatTimeRangeDisplay(slot.start, slot.end)}
                    {!slot.available
                      ? " (Booked)"
                      : typeof slot.remainingCapacity === "number"
                        ? ` (${
                            slot.remainingCapacity === 1
                              ? "1 spot left"
                              : `${slot.remainingCapacity} spots left`
                          })`
                        : ""}
                  </s-button>
                ))}
              </s-stack>
            )}
          </s-section>
        )}

      {selectedSlot && (
        <s-section heading="Quantity">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-button
              variant="tertiary"
              {...(quantity <= 1 ? { disabled: true } : {})}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </s-button>
            <span style={{ minWidth: "2rem", textAlign: "center" }}>
              {quantity}
            </span>
            <s-button
              variant="tertiary"
              {...(quantity >= maxQuantity ? { disabled: true } : {})}
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            >
              +
            </s-button>
            {maxQuantity <= 5 && (
              <s-text tone="subdued">Only {maxQuantity} left for this slot.</s-text>
            )}
          </s-stack>

          <s-button variant="primary" onClick={handleAddToList}>
            Add to list
          </s-button>
        </s-section>
      )}

      {queuedSlots.length > 0 && (
        <s-section heading="Slots to book">
          <s-stack direction="block" gap="small">
            {queuedSlots.map((entry, index) => (
              <s-stack
                key={entry.bookableProductId + entry.date + entry.slot.startsAt}
                direction="inline"
                gap="small"
                alignItems="center"
              >
                <s-text>
                  <b>{entry.productTitle}</b> —{" "}
                  {(() => {
                    const entryType =
                      products.find((p) => p.id === entry.bookableProductId)
                        ?.bookingType ?? "SLOT";
                    if (entryType === "FULL_DAY") {
                      return `${entry.date} \u00b7 Whole day`;
                    }
                    if (entryType === "MULTI_DAY") {
                      return `${entry.date} \u2192 ${entry.endDate ?? "—"}`;
                    }
                    return `${entry.date} | ${formatTimeRangeDisplay(entry.slot.start, entry.slot.end)}`;
                  })()}
                  {entry.quantity > 1 ? ` × ${entry.quantity}` : ""}
                </s-text>
                {entry.error && (
                  <s-text tone="critical">{entry.error}</s-text>
                )}
                <s-button
                  variant="tertiary"
                  onClick={() => handleRemoveQueued(index)}
                  {...(isCreatingBooking ? { disabled: true } : {})}
                >
                  Remove
                </s-button>
              </s-stack>
            ))}
          </s-stack>
        </s-section>
      )}

      {customFields.length > 0 && (
        <s-section heading="Notes">
          <s-stack direction="block" gap="base">
            {customFields.map((field) => (
              <s-text-field
                key={field.fieldKey}
                label={field.label}
                {...(field.required ? { required: true } : {})}
                value={customFieldValues[field.fieldKey] ?? ""}
                onChange={(e: FieldChangeEvent) => {
                  const value = e.currentTarget.value;
                  setCustomFieldValues((prev) => ({
                    ...prev,
                    [field.fieldKey]: value,
                  }));
                }}
              ></s-text-field>
            ))}
          </s-stack>
        </s-section>
      )}

      {queuedSlots.length > 0 && (
        <s-section heading="Customer details">
          <s-stack direction="inline" gap="base">
            <s-text-field
              label="Name"
              required
              value={customerName}
              error={nameError}
              onChange={(e: FieldChangeEvent) =>
                setCustomerName(e.currentTarget.value)
              }
              onBlur={() => setNameTouched(true)}
            ></s-text-field>
              <s-text-field
                label="Email"
                required
                value={customerEmail}
                error={emailError}
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

          {submitAttempted && (nameError || emailError) && (
            <s-banner tone="critical">
              Please fix the highlighted fields before creating this booking.
            </s-banner>
          )}

          {}
          <s-button
            variant="primary"
            onClick={handleCreateBooking}
            {...(isCreatingBooking ? { loading: true } : {})}
          >
            {queuedSlots.length > 1
              ? `Create ${queuedSlots.length} bookings`
              : "Create booking"}
          </s-button>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};