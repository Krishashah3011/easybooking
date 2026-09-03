import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useOutletContext } from "react-router";
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
import type { RegisterSave } from "./app.settings";

type FieldChangeEvent = { currentTarget: { value: string } };

const ACCENT = "#073E74";
const LINE_BORDER = "#DBDBDB";
const INPUT_BORDER = "#E9E9EA";
const LABEL_GREY = "#373737";
const TEXT_BLACK = "#000000";

const styles: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px 10px 13px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
    borderRadius: "4px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    width: "100%",
  },
  title: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER}`,
    margin: 0,
    width: "100%",
  },
  daysGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
  },
  daysRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 20px",
    width: "100%",
    alignSelf: "stretch",
  },
  dayItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    height: "24px",
  },
  checkbox: {
    boxSizing: "border-box",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: `1.5px solid ${ACCENT}`,
    background: "#FFFFFF",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
  checkboxDot: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: ACCENT,
  },
  dayLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
    cursor: "pointer",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
    flexWrap: "wrap",
  },
  fieldGroupHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldGroupThird: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "1 1 220px",
    minWidth: 0,
  },
  fieldLabelGrey: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY,
    margin: 0,
  },
  fieldLabelBlack: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
  },
  inputBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "4px",
  },
  textInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
    padding: 0,
  },
  hintText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: LABEL_GREY,
    margin: 0,
  },
};

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div style={styles.dayItem}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        style={styles.checkbox}
        onClick={onChange}
      >
        {checked && <span style={styles.checkboxDot} />}
      </button>
      <p style={styles.dayLabel} onClick={onChange}>
        {label}
      </p>
    </div>
  );
}

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
  const { registerSave } = useOutletContext<{ registerSave: RegisterSave }>();

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

  // Hand this page's save action + saving state up to the shared
  // "Save Settings" button in the settings header, and hand it back
  // (null) on unmount so leaving this tab doesn't leave it wired to
  // a stale handler.
  useEffect(() => {
    registerSave(handleSave, isSaving);
    return () => registerSave(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSave, values, isSaving]);

  return (
    <>
      <style>{`
        .no-spinner-input::-webkit-outer-spin-button,
        .no-spinner-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner-input {
          -moz-appearance: textfield;
        }
      `}</style>

      <div style={styles.card}>
        <div style={styles.headerLeft}>
          <p style={styles.title}>Working Days</p>
          <p style={styles.descText}>
            Choose which days of the week customers can book appointments on.
          </p>
        </div>
        <hr style={styles.divider} />
        <div style={styles.daysGroup}>
          <div style={styles.daysRow}>
            <Checkbox
              checked={allWeekdaysSelected}
              onChange={toggleSelectAllWorkingDays}
              label="Select All"
            />
          </div>
          <div style={styles.daysRow}>
            {WEEKDAY_LABELS.map((day) => (
              <Checkbox
                key={day.value}
                checked={values.workingDays.includes(day.value)}
                onChange={() => toggleWorkingDay(day.value)}
                label={day.label}
              />
            ))}
          </div>
        </div>
        {errors.workingDays && (
          <p style={{ ...styles.hintText, color: "#D82C0D" }}>
            {errors.workingDays}
          </p>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.headerLeft}>
          <p style={styles.title}>Daily Booking Window</p>
          <p style={styles.descText}>
            The earliest and latest time a slot can start each working day.
          </p>
        </div>
        <hr style={styles.divider} />
        <div style={styles.fieldsRow}>
          <div style={styles.fieldGroupHalf}>
            <p style={styles.fieldLabelGrey}>Start Time</p>
            <div style={styles.inputBox}>
              <input
                type="text"
                style={styles.textInput}
                placeholder="09:00"
                value={values.dailyStartTime}
                onChange={(e: FieldChangeEvent) =>
                  setField("dailyStartTime", e.currentTarget.value)
                }
              />
            </div>
            <p style={styles.hintText}>24-hour format, hh:mm</p>
            {errors.dailyStartTime && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.dailyStartTime}
              </p>
            )}
          </div>
          <div style={styles.fieldGroupHalf}>
            <p style={styles.fieldLabelGrey}>End Time</p>
            <div style={styles.inputBox}>
              <input
                type="text"
                style={styles.textInput}
                placeholder="17:00"
                value={values.dailyEndTime}
                onChange={(e: FieldChangeEvent) =>
                  setField("dailyEndTime", e.currentTarget.value)
                }
              />
            </div>
            <p style={styles.hintText}>24-hour format, hh:mm</p>
            {errors.dailyEndTime && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.dailyEndTime}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.headerLeft}>
          <p style={styles.title}>Slot Configuration</p>
        </div>
        <hr style={styles.divider} />
        <div style={styles.fieldsRow}>
          <div style={styles.fieldGroupThird}>
            <p style={styles.fieldLabelBlack}>Slot Duration (minutes)</p>
            <div style={styles.inputBox}>
              <input
                type="number"
                className="no-spinner-input"
                style={styles.textInput}
                value={values.slotDurationMinutes}
                min={5}
                step={5}
                onChange={(e: FieldChangeEvent) =>
                  setField(
                    "slotDurationMinutes",
                    Number(e.currentTarget.value),
                  )
                }
              />
            </div>
            {errors.slotDurationMinutes && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.slotDurationMinutes}
              </p>
            )}
          </div>
          <div style={styles.fieldGroupThird}>
            <p style={styles.fieldLabelBlack}>
              Buffer Time Between Slots (minutes)
            </p>
            <div style={styles.inputBox}>
              <input
                type="number"
                className="no-spinner-input"
                style={styles.textInput}
                value={values.bufferMinutes}
                min={0}
                step={5}
                onChange={(e: FieldChangeEvent) =>
                  setField("bufferMinutes", Number(e.currentTarget.value))
                }
              />
            </div>
            {errors.bufferMinutes && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.bufferMinutes}
              </p>
            )}
          </div>
          <div style={styles.fieldGroupThird}>
            <p style={styles.fieldLabelBlack}>Max Bookings Per Slot</p>
            <div style={styles.inputBox}>
              <input
                type="number"
                className="no-spinner-input"
                style={styles.textInput}
                value={values.maxBookingsPerSlot}
                min={1}
                step={1}
                onChange={(e: FieldChangeEvent) =>
                  setField(
                    "maxBookingsPerSlot",
                    Number(e.currentTarget.value),
                  )
                }
              />
            </div>
            {errors.maxBookingsPerSlot && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.maxBookingsPerSlot}
              </p>
            )}
          </div>
        </div>
      </div>

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