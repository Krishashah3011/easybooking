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
import { WEEKDAY_LABELS } from "../models/weekday-labels";
import { BOOKING_TYPES, BOOKING_TYPE_LABELS } from "../models/bookingTypes";
import { getBookingSettings } from "../models/bookingSettings.server";
import {
  ensureBookableProduct,
  parseBookableProductForm,
  toBookableProductFormValues,
  upsertBookableProductOverrides,
  type BookableProductFieldErrors,
  type BookableProductFormValues,
} from "../models/bookableProduct.server";
import {
  addBlackoutDate,
  deleteBlackoutDate,
  listProductBlackoutDates,
  parseBlackoutDateForm,
} from "../models/blackoutDate.server";
import { listEnabledLocations } from "../models/bookingLocation.server";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  const response = await admin.graphql(
    `#graphql
      query BookingProductLookup($id: ID!) {
        product(id: $id) {
          id
          title
        }
      }`,
    { variables: { id: productId } },
  );
  const responseJson = await response.json();
  const product = responseJson.data?.product;

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  const bookableProduct = await ensureBookableProduct(
    session.shop,
    productId,
    product.title,
  );
  const [shopSettings, blackoutDates, enabledLocations] = await Promise.all([
    getBookingSettings(session.shop),
    listProductBlackoutDates(session.shop, bookableProduct.id),
    listEnabledLocations(session.shop),
  ]);

  return {
    productId,
    productTitle: product.title as string,
    values: toBookableProductFormValues(bookableProduct),
    hasLocations: enabledLocations.length > 0,
    shopDefaults: {
      workingDays: shopSettings.workingDays,
      dailyStartTime: shopSettings.dailyStartTime,
      dailyEndTime: shopSettings.dailyEndTime,
      slotDurationMinutes: shopSettings.slotDurationMinutes,
      bufferMinutes: shopSettings.bufferMinutes,
      minAdvanceHours: shopSettings.minAdvanceHours,
      maxAdvanceDays: shopSettings.maxAdvanceDays,
      maxBookingsPerSlot: shopSettings.maxBookingsPerSlot,
    },
    blackoutDates: blackoutDates.map(
      (b: { id: string; date: Date; reason: string | null }) => ({
        id: b.id,
        date: b.date.toISOString().slice(0, 10),
        reason: b.reason,
      }),
    ),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "saveOverrides" | "addBlackoutDate" | "deleteBlackoutDate" | "";

  if (intent === "saveOverrides") {
    const productTitle = String(formData.get("productTitle") ?? "");
    const { values, errors } = parseBookableProductForm(formData);

    if (Object.keys(errors).length > 0) {
      return { intent, ok: false as const, errors, values };
    }

    if (values.isEnabled) {
      const enabledLocations = await listEnabledLocations(session.shop);
      if (enabledLocations.length === 0) {
        return {
          intent,
          ok: false as const,
          errors: {
            isEnabled:
              "Add at least one location in Booking Settings before enabling booking for a product.",
          },
          values,
        };
      }
    }

    const saved = await upsertBookableProductOverrides(
      session.shop,
      productId,
      productTitle,
      values,
    );
    return {
      intent,
      ok: true as const,
      errors: {},
      values: toBookableProductFormValues(saved),
    };
  }

  if (intent === "addBlackoutDate") {
    const bookableProduct = await ensureBookableProduct(
      session.shop,
      productId,
      String(formData.get("productTitle") ?? ""),
    );
    const { date, reason, errors } = parseBlackoutDateForm(formData);
    if (!date) {
      return { intent, ok: false as const, blackoutErrors: errors };
    }
    await addBlackoutDate(session.shop, date, reason, bookableProduct.id);
    return { intent, ok: true as const, blackoutErrors: {} };
  }

  if (intent === "deleteBlackoutDate") {
    const id = String(formData.get("id") ?? "");
    await deleteBlackoutDate(session.shop, id);
    return { intent, ok: true as const };
  }

  return { intent, ok: false as const };
};

export default function BookableProductPage() {
  const {
    productId,
    productTitle,
    values: initialValues,
    hasLocations,
    shopDefaults,
    blackoutDates,
  } = useLoaderData<typeof loader>();
  const overridesFetcher = useFetcher<typeof action>();
  const blackoutFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [values, setValues] =
    useState<BookableProductFormValues>(initialValues);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [newBlackoutReason, setNewBlackoutReason] = useState("");

  const errors: BookableProductFieldErrors =
    overridesFetcher.data?.intent === "saveOverrides"
      ? (overridesFetcher.data.errors ?? {})
      : {};
  const isSaving =
    overridesFetcher.state === "submitting" ||
    overridesFetcher.state === "loading";

  useEffect(() => {
    if (
      overridesFetcher.data?.intent === "saveOverrides" &&
      overridesFetcher.data.ok
    ) {
      setValues(overridesFetcher.data.values);
      shopify.toast.show("Product booking settings saved");
    }
  }, [overridesFetcher.data, shopify]);

  useEffect(() => {
    if (
      blackoutFetcher.data?.intent === "addBlackoutDate" &&
      blackoutFetcher.data.ok
    ) {
      setNewBlackoutDate("");
      setNewBlackoutReason("");
    }
  }, [blackoutFetcher.data]);

  const setField = <K extends keyof BookableProductFormValues>(
    key: K,
    value: BookableProductFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleWorkingDay = (day: number) => {
    setValues((prev) => {
      const current = prev.workingDays ?? [];
      const has = current.includes(day);
      const workingDays = has
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b);
      return { ...prev, workingDays };
    });
  };

  const allWeekdaysSelected = WEEKDAY_LABELS.every((day) =>
    (values.workingDays ?? []).includes(day.value),
  );

  const toggleSelectAllWorkingDays = () => {
    setValues((prev) => ({
      ...prev,
      workingDays: allWeekdaysSelected
        ? []
        : WEEKDAY_LABELS.map((day) => day.value),
    }));
  };

  const handleSave = () => {
    overridesFetcher.submit(
      {
        intent: "saveOverrides",
        productTitle,
        isEnabled: String(values.isEnabled),
        bookingType: values.bookingType,
        workingDays: values.workingDays ? values.workingDays.join(",") : "",
        dailyStartTime: values.dailyStartTime ?? "",
        dailyEndTime: values.dailyEndTime ?? "",
        slotDurationMinutes:
          values.slotDurationMinutes !== null
            ? String(values.slotDurationMinutes)
            : "",
        bufferMinutes:
          values.bufferMinutes !== null ? String(values.bufferMinutes) : "",
        minAdvanceHours:
          values.minAdvanceHours !== null ? String(values.minAdvanceHours) : "",
        maxAdvanceDays:
          values.maxAdvanceDays !== null ? String(values.maxAdvanceDays) : "",
        maxBookingsPerSlot:
          values.maxBookingsPerSlot !== null
            ? String(values.maxBookingsPerSlot)
            : "",
        bookingStartDate: values.bookingStartDate ?? "",
        bookingEndDate: values.bookingEndDate ?? "",
        minNights: values.minNights !== null ? String(values.minNights) : "",
        maxNights: values.maxNights !== null ? String(values.maxNights) : "",
        bundleSessionCount:
          values.bundleSessionCount !== null
            ? String(values.bundleSessionCount)
            : "",
        bundleSessionDurationMinutes:
          values.bundleSessionDurationMinutes !== null
            ? String(values.bundleSessionDurationMinutes)
            : "",
        bundleValidityDays:
          values.bundleValidityDays !== null
            ? String(values.bundleValidityDays)
            : "",
      },
      { method: "POST" },
    );
  };

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate) return;
    blackoutFetcher.submit(
      {
        intent: "addBlackoutDate",
        productTitle,
        date: newBlackoutDate,
        reason: newBlackoutReason,
      },
      { method: "POST" },
    );
  };

  const handleDeleteBlackoutDate = (id: string) => {
    blackoutFetcher.submit(
      { intent: "deleteBlackoutDate", id },
      { method: "POST" },
    );
  };

  return (
    <s-page heading={productTitle} inlineSize="large" style={{ width: "950px", maxWidth: "950px", boxSizing: "border-box", marginInline: "auto" }}>
      <s-link slot="breadcrumb-actions" href="/app/products">
        Products
      </s-link>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Booking">
        {!hasLocations && (
          <s-banner tone="warning" heading="No locations configured">
            <s-paragraph>
              Booking needs at least one location so every slot has a
              timezone to anchor to.
            </s-paragraph>
            <s-link href="/app/booking-settings/locations">
              Go to Locations
            </s-link>
          </s-banner>
        )}
        <s-switch
          label="Booking enabled for this product"
          checked={values.isEnabled}
          disabled={!hasLocations && !values.isEnabled}
          onChange={() => setField("isEnabled", !values.isEnabled)}
        ></s-switch>
        {errors.isEnabled && (
          <s-banner tone="critical">{errors.isEnabled}</s-banner>
        )}
      </s-section>

      <s-section heading="Booking type">
        <s-paragraph>
          Choose how this product is booked. Changing this only affects what
          settings apply below — existing bookings aren&apos;t touched.
        </s-paragraph>
        <s-select
          label="Booking type"
          value={values.bookingType}
          onChange={(e: FieldChangeEvent) =>
            setField(
              "bookingType",
              e.currentTarget.value as BookableProductFormValues["bookingType"],
            )
          }
        >
          {BOOKING_TYPES.map((type) => (
            <s-option key={type} value={type}>
              {BOOKING_TYPE_LABELS[type]}
            </s-option>
          ))}
        </s-select>
      </s-section>

      {(values.bookingType === "SLOT" ||
        values.bookingType === "FULL_DAY" ||
        values.bookingType === "BUNDLE") && (
      <s-section heading="Working days">
        <s-paragraph>
          Leave every day unchecked below and this product will use the shop
          default instead. Check any day to set a custom schedule just for this
          product.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-checkbox
            label="Select all"
            checked={allWeekdaysSelected}
            onChange={toggleSelectAllWorkingDays}
          ></s-checkbox>
        </s-stack>
        <s-stack direction="inline" gap="base">
          {WEEKDAY_LABELS.map((day) => (
            <s-checkbox
              key={day.value}
              label={day.label}
              checked={(values.workingDays ?? []).includes(day.value)}
              onChange={() => toggleWorkingDay(day.value)}
            ></s-checkbox>
          ))}
        </s-stack>
        {errors.workingDays && (
          <s-banner tone="critical">{errors.workingDays}</s-banner>
        )}
      </s-section>
      )}

      {(values.bookingType === "SLOT" ||
        values.bookingType === "BUNDLE" ||
        values.bookingType === "FULL_DAY") && (
      <s-section heading="Daily booking window">
        <s-stack direction="inline" gap="base">
          <s-text-field
            label="Start time"
            placeholder={shopDefaults.dailyStartTime}
            details="Blank = use shop default"
            value={values.dailyStartTime ?? ""}
            error={errors.dailyStartTime}
            onChange={(e: FieldChangeEvent) =>
              setField("dailyStartTime", e.currentTarget.value || null)
            }
          ></s-text-field>
          <s-text-field
            label="End time"
            placeholder={shopDefaults.dailyEndTime}
            details="Blank = use shop default"
            value={values.dailyEndTime ?? ""}
            error={errors.dailyEndTime}
            onChange={(e: FieldChangeEvent) =>
              setField("dailyEndTime", e.currentTarget.value || null)
            }
          ></s-text-field>
        </s-stack>
      </s-section>
      )}

      {values.bookingType === "SLOT" && (
      <s-section heading="Slot configuration">
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Slot duration (minutes)"
            placeholder={String(shopDefaults.slotDurationMinutes)}
            details="Blank = use shop default"
            value={
              values.slotDurationMinutes !== null
                ? String(values.slotDurationMinutes)
                : ""
            }
            min={5}
            step={5}
            error={errors.slotDurationMinutes}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "slotDurationMinutes",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Buffer time (minutes)"
            placeholder={String(shopDefaults.bufferMinutes)}
            details="Blank = use shop default"
            value={
              values.bufferMinutes !== null ? String(values.bufferMinutes) : ""
            }
            min={0}
            step={5}
            error={errors.bufferMinutes}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "bufferMinutes",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Max bookings per slot"
            placeholder={String(shopDefaults.maxBookingsPerSlot)}
            details="Blank = use shop default"
            value={
              values.maxBookingsPerSlot !== null
                ? String(values.maxBookingsPerSlot)
                : ""
            }
            min={1}
            step={1}
            error={errors.maxBookingsPerSlot}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "maxBookingsPerSlot",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
        </s-stack>
      </s-section>
      )}

      {values.bookingType === "FULL_DAY" && (
      <s-section heading="Capacity">
        <s-number-field
          label="Max bookings per day"
          placeholder={String(shopDefaults.maxBookingsPerSlot)}
          details="How many units of this product can be booked for the same day (e.g. number of identical venues/rooms). Blank = use shop default"
          value={
            values.maxBookingsPerSlot !== null
              ? String(values.maxBookingsPerSlot)
              : ""
          }
          min={1}
          step={1}
          error={errors.maxBookingsPerSlot}
          onChange={(e: FieldChangeEvent) =>
            setField(
              "maxBookingsPerSlot",
              e.currentTarget.value === "" ? null : Number(e.currentTarget.value),
            )
          }
        ></s-number-field>
      </s-section>
      )}

      {values.bookingType === "MULTI_DAY" && (
      <>
      <s-section heading="Multi-day settings">
        <s-paragraph>
          The number of nights a customer can book in one go for this
          product.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Minimum nights"
            value={values.minNights !== null ? String(values.minNights) : ""}
            min={1}
            step={1}
            error={errors.minNights}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "minNights",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Maximum nights"
            value={values.maxNights !== null ? String(values.maxNights) : ""}
            min={1}
            step={1}
            error={errors.maxNights}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "maxNights",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
        </s-stack>
      </s-section>

      <s-section heading="Capacity">
        <s-number-field
          label="Rooms/units available"
          placeholder={String(shopDefaults.maxBookingsPerSlot)}
          details="How many identical rooms or units can be booked for the same night (e.g. number of rooms of this type). Blank = use shop default"
          value={
            values.maxBookingsPerSlot !== null
              ? String(values.maxBookingsPerSlot)
              : ""
          }
          min={1}
          step={1}
          error={errors.maxBookingsPerSlot}
          onChange={(e: FieldChangeEvent) =>
            setField(
              "maxBookingsPerSlot",
              e.currentTarget.value === "" ? null : Number(e.currentTarget.value),
            )
          }
        ></s-number-field>
      </s-section>
      </>
      )}

      {values.bookingType === "BUNDLE" && (
      <s-section heading="Bundle settings">
        <s-paragraph>
          How many sessions make up one bundle purchase, how long each
          session runs, and how many days the customer has to use them all.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Sessions per bundle"
            value={
              values.bundleSessionCount !== null
                ? String(values.bundleSessionCount)
                : ""
            }
            min={2}
            step={1}
            error={errors.bundleSessionCount}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "bundleSessionCount",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Session duration (minutes)"
            value={
              values.bundleSessionDurationMinutes !== null
                ? String(values.bundleSessionDurationMinutes)
                : ""
            }
            min={5}
            step={5}
            error={errors.bundleSessionDurationMinutes}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "bundleSessionDurationMinutes",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Validity window (days)"
            details="How many days after purchase the customer can use all sessions"
            value={
              values.bundleValidityDays !== null
                ? String(values.bundleValidityDays)
                : ""
            }
            min={1}
            step={1}
            error={errors.bundleValidityDays}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "bundleValidityDays",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
        </s-stack>
      </s-section>
      )}

      <s-section heading="Advance booking rules">
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Minimum advance booking time (hours)"
            placeholder={String(shopDefaults.minAdvanceHours)}
            details="Blank = use shop default"
            value={
              values.minAdvanceHours !== null
                ? String(values.minAdvanceHours)
                : ""
            }
            min={0}
            step={1}
            error={errors.minAdvanceHours}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "minAdvanceHours",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
          <s-number-field
            label="Maximum advance booking (days)"
            placeholder={String(shopDefaults.maxAdvanceDays)}
            details="Blank = use shop default"
            value={
              values.maxAdvanceDays !== null
                ? String(values.maxAdvanceDays)
                : ""
            }
            min={1}
            step={1}
            error={errors.maxAdvanceDays}
            onChange={(e: FieldChangeEvent) =>
              setField(
                "maxAdvanceDays",
                e.currentTarget.value === ""
                  ? null
                  : Number(e.currentTarget.value),
              )
            }
          ></s-number-field>
        </s-stack>
      </s-section>

      <s-section heading="Booking start & end date">
        <s-stack direction="inline" gap="base">
          <s-date-field
            label="Booking start date"
            details="Blank = use shop default"
            value={values.bookingStartDate ?? ""}
            error={errors.bookingStartDate}
            onChange={(e: FieldChangeEvent) =>
              setField("bookingStartDate", e.currentTarget.value || null)
            }
          ></s-date-field>
          <s-date-field
            label="Booking end date"
            details="Blank = use shop default"
            value={values.bookingEndDate ?? ""}
            error={errors.bookingEndDate}
            onChange={(e: FieldChangeEvent) =>
              setField("bookingEndDate", e.currentTarget.value || null)
            }
          ></s-date-field>
        </s-stack>
      </s-section>

      <s-section heading="Blackout dates for this product">
        <s-paragraph>
          Dates this specific product can&apos;t be booked on — e.g. maintenance
          or a specific staff member&apos;s day off — on top of any shop-wide
          blackout dates.
        </s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-date-field
            label="Date"
            value={newBlackoutDate}
            onChange={(e: FieldChangeEvent) =>
              setNewBlackoutDate(e.currentTarget.value)
            }
          ></s-date-field>
          <s-text-field
            label="Reason (optional)"
            value={newBlackoutReason}
            onChange={(e: FieldChangeEvent) =>
              setNewBlackoutReason(e.currentTarget.value)
            }
          ></s-text-field>
          <s-button onClick={handleAddBlackoutDate}>Add blackout date</s-button>
        </s-stack>

        {blackoutDates.length > 0 && (
          <s-table>
            <s-table-header-row>
              <s-table-header>Date</s-table-header>
              <s-table-header>Reason</s-table-header>
              <s-table-header>Remove</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {blackoutDates.map(
                (b: { id: string; date: string; reason: string | null }) => (
                  <s-table-row key={b.id}>
                    <s-table-cell>{b.date}</s-table-cell>
                    <s-table-cell>{b.reason ?? "—"}</s-table-cell>
                    <s-table-cell>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDeleteBlackoutDate(b.id)}
                      >
                        Remove
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ),
              )}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section slot="aside" heading="Product ID">
        <s-paragraph>{productId}</s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};