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
import {
  getBookingSettings,
  parseBookingSettingsForm,
  toFormValues,
  upsertBookingSettings,
  type BookingSettingsFieldErrors,
  type BookingSettingsFormValues,
} from "../models/bookingSettings.server";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getBookingSettings(session.shop);
  return {
    values: toFormValues(settings),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { values, errors } = parseBookingSettingsForm(formData);

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values };
  }

  const saved = await upsertBookingSettings(session.shop, values);
  return { ok: true as const, errors: {}, values: toFormValues(saved) };
};

export default function BookingSettingsPage() {
  const { values: initialValues } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [values, setValues] =
    useState<BookingSettingsFormValues>(initialValues);

  const errors: BookingSettingsFieldErrors = fetcher.data?.errors ?? {};
  const isSaving =
    fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.ok) {
      setValues(fetcher.data.values);
      shopify.toast.show("Booking settings saved");
    }
  }, [fetcher.data, shopify]);

  const setField = <K extends keyof BookingSettingsFormValues>(
    key: K,
    value: BookingSettingsFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleWorkingDay = (day: number) => {
    setValues((prev) => {
      const has = prev.workingDays.includes(day);
      const workingDays = has
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort((a, b) => a - b);
      return { ...prev, workingDays };
    });
  };

  const allWeekdaysSelected = WEEKDAY_LABELS.every((day) =>
    values.workingDays.includes(day.value),
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
    fetcher.submit(
      {
        workingDays: values.workingDays.join(","),
        dailyStartTime: values.dailyStartTime,
        dailyEndTime: values.dailyEndTime,
        slotDurationMinutes: String(values.slotDurationMinutes),
        bufferMinutes: String(values.bufferMinutes),
        minAdvanceHours: String(values.minAdvanceHours),
        maxAdvanceDays: String(values.maxAdvanceDays),
        maxBookingsPerSlot: String(values.maxBookingsPerSlot),
        bookingStartDate: values.bookingStartDate ?? "",
        bookingEndDate: values.bookingEndDate ?? "",
        emailFromName: values.emailFromName ?? "",
      },
      { method: "POST" }, 
    );
  };

  return (
    <>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Working days">
        <s-paragraph>
          Choose which days of the week customers can book appointments on.
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
              checked={values.workingDays.includes(day.value)}
              onChange={() => toggleWorkingDay(day.value)}
            ></s-checkbox>
          ))}
        </s-stack>
        {errors.workingDays && (
          <s-banner tone="critical">{errors.workingDays}</s-banner>
        )}
      </s-section>

      <s-section heading="Daily booking window">
        <s-paragraph>
          The earliest and latest time a slot can start each working day.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-text-field
            label="Start time"
            placeholder="09:00"
            details="24-hour format, HH:mm"
            value={values.dailyStartTime}
            error={errors.dailyStartTime}
            onChange={(e: FieldChangeEvent) =>
              setField("dailyStartTime", e.currentTarget.value)
            }
          ></s-text-field>
          <s-text-field
            label="End time"
            placeholder="17:00"
            details="24-hour format, HH:mm"
            value={values.dailyEndTime}
            error={errors.dailyEndTime}
            onChange={(e: FieldChangeEvent) =>
              setField("dailyEndTime", e.currentTarget.value)
            }
          ></s-text-field>
        </s-stack>
      </s-section>

      <s-section heading="Slot configuration">
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Slot duration (minutes)"
            value={String(values.slotDurationMinutes)}
            min={5}
            step={5}
            error={errors.slotDurationMinutes}
            onChange={(e: FieldChangeEvent) =>
              setField("slotDurationMinutes", Number(e.currentTarget.value))
            }
          ></s-number-field>
          <s-number-field
            label="Buffer time between slots (minutes)"
            value={String(values.bufferMinutes)}
            min={0}
            step={5}
            error={errors.bufferMinutes}
            onChange={(e: FieldChangeEvent) =>
              setField("bufferMinutes", Number(e.currentTarget.value))
            }
          ></s-number-field>
          <s-number-field
            label="Max bookings per slot (capacity)"
            value={String(values.maxBookingsPerSlot)}
            min={1}
            step={1}
            error={errors.maxBookingsPerSlot}
            onChange={(e: FieldChangeEvent) =>
              setField("maxBookingsPerSlot", Number(e.currentTarget.value))
            }
          ></s-number-field>
        </s-stack>
      </s-section>

      <s-section heading="Advance booking rules">
        <s-stack direction="inline" gap="base">
          <s-number-field
            label="Minimum advance booking time (hours)"
            value={String(values.minAdvanceHours)}
            min={0}
            step={1}
            error={errors.minAdvanceHours}
            onChange={(e: FieldChangeEvent) =>
              setField("minAdvanceHours", Number(e.currentTarget.value))
            }
          ></s-number-field>
          <s-number-field
            label="Maximum advance booking (days)"
            value={String(values.maxAdvanceDays)}
            min={1}
            step={1}
            error={errors.maxAdvanceDays}
            onChange={(e: FieldChangeEvent) =>
              setField("maxAdvanceDays", Number(e.currentTarget.value))
            }
          ></s-number-field>
        </s-stack>
      </s-section>

      <s-section heading="Booking start & end date">
        <s-paragraph>
          Optional. Restricts the overall window bookings are accepted in —
          leave blank for no restriction (e.g. a seasonal service).
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-date-field
            label="Booking start date"
            value={values.bookingStartDate ?? ""}
            error={errors.bookingStartDate}
            onChange={(e: FieldChangeEvent) =>
              setField("bookingStartDate", e.currentTarget.value || null)
            }
          ></s-date-field>
          <s-date-field
            label="Booking end date"
            value={values.bookingEndDate ?? ""}
            error={errors.bookingEndDate}
            onChange={(e: FieldChangeEvent) =>
              setField("bookingEndDate", e.currentTarget.value || null)
            }
          ></s-date-field>
        </s-stack>
      </s-section>

      <s-section heading="Email notifications">
        <s-paragraph>
          The display name customers see as the sender on booking
          confirmation, reminder, and cancellation emails. Leave blank to
          use the default.
        </s-paragraph>
        <s-text-field
          label="Sender name"
          placeholder="Bookings"
          details={`Shown as e.g. "Acme Bookings <bookings@yourdomain.com>" — the email address itself can't be changed here.`}
          value={values.emailFromName ?? ""}
          error={errors.emailFromName}
          onChange={(e: FieldChangeEvent) =>
            setField("emailFromName", e.currentTarget.value || null)
          }
        ></s-text-field>
      </s-section>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};