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
import { computeSlotsForDate, type TimeSlot } from "../models/slotAvailability.server";
import { listShopBlackoutDates, listProductBlackoutDates } from "../models/blackoutDate.server";
import { createManualBooking } from "../models/booking.server";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const allProducts = await listBookableProducts(session.shop);
  const enabledProducts = allProducts.filter((p) => p.isEnabled);
  return {
    products: enabledProducts.map((p) => ({ id: p.id, title: p.productTitle })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as "loadSlots" | "createBooking" | "";

  if (intent === "loadSlots") {
    const bookableProductId = String(formData.get("bookableProductId") ?? "");
    const date = String(formData.get("date") ?? "");
    if (!bookableProductId || !date) {
      return { intent, ok: false as const, slots: [] as TimeSlot[] };
    }

    const bookableProduct = await listBookableProducts(session.shop).then(
      (products) => products.find((p) => p.id === bookableProductId),
    );
    if (!bookableProduct) {
      return { intent, ok: false as const, slots: [] as TimeSlot[] };
    }

    const [shopSettings, shopBlackouts, productBlackouts] = await Promise.all([
      getBookingSettings(session.shop),
      listShopBlackoutDates(session.shop),
      listProductBlackoutDates(session.shop, bookableProductId),
    ]);

    const blackoutDates = new Set<string>([
      ...shopBlackouts.map((b: { date: Date }) => b.date.toISOString().slice(0, 10)),
      ...productBlackouts.map((b: { date: Date }) => b.date.toISOString().slice(0, 10)),
    ]);

    const effectiveSettings = resolveEffectiveSettings(
      shopSettings,
      bookableProduct,
    );
    const slots = computeSlotsForDate(effectiveSettings, date, blackoutDates);

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
  const { products } = useLoaderData<typeof loader>();
  const slotsFetcher = useFetcher<typeof action>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [bookableProductId, setBookableProductId] = useState(
    products[0]?.id ?? "",
  );
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const slots: TimeSlot[] =
    slotsFetcher.data?.intent === "loadSlots" && slotsFetcher.data.ok
      ? slotsFetcher.data.slots
      : [];

  const createError =
    createFetcher.data?.intent === "createBooking" && !createFetcher.data.ok
      ? createFetcher.data.error
      : null;

  useEffect(() => {
    if (createFetcher.data?.intent === "createBooking" && createFetcher.data.ok) {
      shopify.toast.show("Booking created");
      setSelectedSlot(null);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
    }
  }, [createFetcher.data, shopify]);

  const handleCheckAvailability = () => {
    if (!bookableProductId || !date) return;
    setSelectedSlot(null);
    slotsFetcher.submit(
      { intent: "loadSlots", bookableProductId, date },
      { method: "POST" },
    );
  };

  const handleCreateBooking = () => {
    if (!bookableProductId || !date || !selectedSlot || !customerName) return;
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

  return (
    <s-page heading="New Booking">
      <s-section heading="Product and date">
        <s-stack direction="inline" gap="base">
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
          <s-date-field
            label="Date"
            value={date}
            onChange={(e: FieldChangeEvent) => setDate(e.currentTarget.value)}
          ></s-date-field>
          <s-button onClick={handleCheckAvailability}>
            Check availability
          </s-button>
        </s-stack>
      </s-section>

      {slotsFetcher.data?.intent === "loadSlots" && (
        <s-section heading="Available times">
          {slots.length === 0 ? (
            <s-paragraph>No open slots on this date.</s-paragraph>
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
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot.start} – {slot.end}
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
              value={customerName}
              onChange={(e: FieldChangeEvent) =>
                setCustomerName(e.currentTarget.value)
              }
            ></s-text-field>
            <s-text-field
              label="Email (optional)"
              value={customerEmail}
              onChange={(e: FieldChangeEvent) =>
                setCustomerEmail(e.currentTarget.value)
              }
            ></s-text-field>
            <s-text-field
              label="Phone (optional)"
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
            {...(!customerName ? { disabled: true } : {})}
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
