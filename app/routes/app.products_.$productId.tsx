import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
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
  excludeShopBlackoutDateForProduct,
  listProductBlackoutDates,
  listProductBlackoutExclusions,
  listShopBlackoutDates,
  parseBlackoutDateForm,
  type BlackoutDateFieldErrors,
} from "../models/blackoutDate.server";
import { listEnabledLocations } from "../models/bookingLocation.server";
import {
  BLUE,
  BORDER,
  LICENSE_BORDER,
  TEXT_DARK,
  TEXT_MUTED,
  styles as pageStyles,
  saveWrapperStyle,
  saveButtonStyle,
} from "../components/SettingsUI";

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
  const [shopSettings, blackoutDates, shopBlackoutDates, productExclusions, enabledLocations] =
    await Promise.all([
      getBookingSettings(session.shop),
      listProductBlackoutDates(session.shop, bookableProduct.id),
      listShopBlackoutDates(session.shop),
      listProductBlackoutExclusions(session.shop, bookableProduct.id),
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
    blackoutDates: [
      ...shopBlackoutDates
        .filter((b: { date: Date }) => !productExclusions.has(b.date.toISOString().slice(0, 10)))
        .map((b: { id: string; date: Date; reason: string | null }) => ({
          id: b.id,
          date: b.date.toISOString().slice(0, 10),
          reason: b.reason,
          source: "shop" as const,
        })),
      ...blackoutDates.map(
        (b: { id: string; date: Date; reason: string | null }) => ({
          id: b.id,
          date: b.date.toISOString().slice(0, 10),
          reason: b.reason,
          source: "product" as const,
        }),
      ),
    ],
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    | "saveOverrides"
    | "addBlackoutDate"
    | "deleteBlackoutDate"
    | "excludeBlackoutDate"
    | "";

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

  if (intent === "excludeBlackoutDate") {
    const bookableProduct = await ensureBookableProduct(
      session.shop,
      productId,
      String(formData.get("productTitle") ?? ""),
    );
    const date = String(formData.get("date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { intent, ok: false as const };
    }
    await excludeShopBlackoutDateForProduct(session.shop, bookableProduct.id, date);
    return { intent, ok: true as const };
  }

  return { intent, ok: false as const };
};

const ERROR_RED = "#D82C0D";
const INPUT_BORDER = LICENSE_BORDER;

const ui: Record<string, React.CSSProperties> = {
  root: { fontFamily: "Inter" },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  headerActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  closeButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    width: "40px",
    height: "40px",
    padding: "10px",
    borderRadius: "4px",
    textDecoration: "none",
  },
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px 10px 13px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "4px",
  },
  toggleCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "4px",
  },
  toggleRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "128px",
    width: "100%",
  },
  toggleText: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "4px",
  },
  cardHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    width: "100%",
  },
  cardHeaderText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    minWidth: 0,
  },
  title: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_DARK,
    margin: 0,
  },
  descRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_DARK,
    margin: 0,
  },
  chevronButton: {
    width: "20px",
    height: "20px",
    minWidth: "20px",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  daysGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
  },
  daysRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 20px",
    width: "100%",
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
    border: `1.5px solid ${BLUE}`,
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
    background: BLUE,
  },
  dayLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    margin: 0,
    cursor: "pointer",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    width: "100%",
  },
  fieldHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldThird: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 220px",
    minWidth: 0,
  },
  fieldFixed: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "200px",
    flex: "none",
  },
  fieldGrow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldLabelGrey: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_MUTED,
    margin: 0,
  },
  fieldLabelBlack: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
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
    position: "relative",
  },
  timeInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_DARK,
    padding: 0,
  },
  numberInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    padding: 0,
  },
  dateInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_DARK,
    padding: 0,
    cursor: "pointer",
  },
  select: {
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    width: "100%",
    height: "34px",
    padding: "5px 34px 5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "4px",
    outline: "none",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    cursor: "pointer",
  },
  selectWrap: {
    position: "relative",
    width: "100%",
  },
  selectChevron: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    pointerEvents: "none",
  },
  stepperWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "14px",
    height: "16px",
    marginLeft: "4px",
    overflow: "hidden",
  },
  stepperBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "14px",
    height: "8px",
    padding: 0,
    margin: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    lineHeight: 0,
    flexShrink: 0,
  },
  hintText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED,
    margin: 0,
  },
  errorText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: ERROR_RED,
    margin: 0,
  },
  toggleButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "46px",
    height: "24px",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  },
  toggleOff: {
    position: "relative",
    display: "block",
    boxSizing: "border-box",
    width: "46px",
    height: "24px",
    borderRadius: "12px",
    background: "#E4E4E4",
    border: `1px solid ${BORDER}`,
  },
  toggleKnob: {
    position: "absolute",
    top: "50%",
    left: "3px",
    transform: "translateY(-50%)",
    width: "17px",
    height: "17px",
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
  },
  addButton: {
    alignSelf: "flex-end",
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    gap: "4px",
    minWidth: "188px",
    height: "42px",
    background: BLUE,
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  plusWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "3px",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  columnHeaderRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "20px",
    width: "100%",
  },
  columnHeaderCell: {
    flex: "1 1 0",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    margin: 0,
  },
  rowWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "20px",
    width: "100%",
    height: "40px",
  },
  rowCell: {
    flex: "1 1 0",
    alignSelf: "center",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    margin: 0,
  },
  actionsCell: {
    flex: "1 1 0",
    alignSelf: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: "44px",
    height: "40px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
};

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="904 27 20 20"
      fill="none"
      aria-hidden="true"
      overflow="visible"
      style={{ display: "block" }}
    >
      <path
        d="M904 47L914 37L924 47M924 27L913.998 37L904 27"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <path
        d="M1 1l3.15 3.433c.395.431.593.647.837.694.093.018.189.018.282 0 .244-.047.442-.263.837-.694L9.25 1"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="6"
      viewBox="0 0 11 6"
      fill="none"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path
        d="M1 1L5.5 5L10 1"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        ...ui.toggleButton,
        ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
      }}
    >
      {checked ? (
        <img src="/enable.svg" width={46} height={24} alt="" />
      ) : (
        <span style={ui.toggleOff}>
          <span style={ui.toggleKnob} />
        </span>
      )}
    </button>
  );
}

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
    <div style={ui.dayItem}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        style={ui.checkbox}
        onClick={onChange}
      >
        {checked && <span style={ui.checkboxDot} />}
      </button>
      <p style={ui.dayLabel} onClick={onChange}>
        {label}
      </p>
    </div>
  );
}

function NumberStepper({
  onIncrement,
  onDecrement,
  label,
}: {
  onIncrement: () => void;
  onDecrement: () => void;
  label: string;
}) {
  return (
    <div style={ui.stepperWrap}>
      <button
        type="button"
        style={ui.stepperBtn}
        onClick={onIncrement}
        aria-label={`Increase ${label}`}
        tabIndex={-1}
      >
        <span style={{ display: "flex", transform: "rotate(180deg)" }}>
          <ChevronDownIcon />
        </span>
      </button>
      <button
        type="button"
        style={ui.stepperBtn}
        onClick={onDecrement}
        aria-label={`Decrease ${label}`}
        tabIndex={-1}
      >
        <ChevronDownIcon />
      </button>
    </div>
  );
}

type FieldSize = "half" | "third" | "fixed" | "grow";

function fieldSizeStyle(size: FieldSize): React.CSSProperties {
  if (size === "third") return ui.fieldThird;
  if (size === "fixed") return ui.fieldFixed;
  if (size === "grow") return ui.fieldGrow;
  return ui.fieldHalf;
}

function FieldGroup({
  label,
  grey,
  size = "half",
  hint,
  error,
  children,
}: {
  label: string;
  grey?: boolean;
  size?: FieldSize;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={fieldSizeStyle(size)}>
      <p style={grey ? ui.fieldLabelGrey : ui.fieldLabelBlack}>{label}</p>
      {children}
      {hint && <p style={ui.hintText}>{hint}</p>}
      {error && <p style={ui.errorText}>{error}</p>}
    </div>
  );
}

function Card({
  title,
  description,
  collapsible,
  open = true,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={ui.card}>
      <div
        style={{
          ...ui.cardHeaderRow,
          ...(collapsible ? { cursor: "pointer" } : {}),
        }}
        onClick={collapsible ? onToggle : undefined}
      >
        <div style={ui.cardHeaderText}>
          <p style={ui.title}>{title}</p>
          {description && (
            <div style={ui.descRow}>
              <p style={ui.descText}>{description}</p>
            </div>
          )}
        </div>
        {collapsible && (
          <button
            type="button"
            style={ui.chevronButton}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
          >
            <CollapseChevron open={open} />
          </button>
        )}
      </div>
      {open && (
        <>
          <hr style={ui.divider} />
          {children}
        </>
      )}
    </div>
  );
}

type TwelveHourParts = { hour: string; minute: string; period: "AM" | "PM" };

function to12HourParts(value: string | null | undefined): TwelveHourParts {
  const match = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  if (!match) return { hour: "", minute: "", period: "AM" };
  const hour24 = Number(match[1]);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour: String(hour12), minute: match[2], period };
}

function fromTwelveHourParts(parts: TwelveHourParts): string | null {
  const hour12 = Number(parts.hour);
  const minute = Number(parts.minute);
  if (
    !parts.hour ||
    !parts.minute ||
    parts.minute.length < 2 ||
    !Number.isFinite(hour12) ||
    hour12 < 1 ||
    hour12 > 12 ||
    !Number.isFinite(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  let hour24 = hour12 % 12;
  if (parts.period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function sanitizeHourInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  const n = Math.min(12, Math.max(0, Number(digits)));
  return n === 0 ? digits : String(n);
}

function sanitizeMinuteInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  const n = Math.min(59, Number(digits));
  return String(n).padStart(digits.length, "0").slice(0, 2);
}

function TimeField({
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  error?: string;
  onChange: (next: string | null) => void;
}) {
  const [parts, setParts] = useState(() => to12HourParts(value));

  useEffect(() => {
    if (fromTwelveHourParts(parts) !== value) {
      setParts(to12HourParts(value));
    }
  }, [value]);

  const commit = (next: TwelveHourParts) => {
    setParts(next);
    onChange(fromTwelveHourParts(next));
  };

  const placeholderParts = to12HourParts(
    /^\d{1,2}:\d{2}$/.test(placeholder) ? placeholder : null,
  );

  return (
    <FieldGroup label={label} grey hint="12-hour format, hh:mm AM/PM" error={error}>
      <div style={{ ...ui.inputBox, gap: "6px" }}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          style={{ ...ui.timeInput, flex: "0 0 22px", textAlign: "right" }}
          placeholder={placeholderParts.hour || "09"}
          value={parts.hour}
          onChange={(e: FieldChangeEvent) =>
            commit({ ...parts, hour: sanitizeHourInput(e.currentTarget.value) })
          }
        />
        <span style={{ color: TEXT_DARK }}>:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          style={{ ...ui.timeInput, flex: "0 0 22px" }}
          placeholder={placeholderParts.minute || "00"}
          value={parts.minute}
          onChange={(e: FieldChangeEvent) =>
            commit({ ...parts, minute: sanitizeMinuteInput(e.currentTarget.value) })
          }
        />
        <button
          type="button"
          onClick={() =>
            commit({ ...parts, period: parts.period === "AM" ? "PM" : "AM" })
          }
          style={{
            marginLeft: "auto",
            flex: "0 0 auto",
            border: `1px solid ${INPUT_BORDER}`,
            borderRadius: "4px",
            background: "#fff",
            color: TEXT_DARK,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            padding: "3px 8px",
            cursor: "pointer",
          }}
        >
          {parts.period}
        </button>
      </div>
    </FieldGroup>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  base,
  min,
  step,
  size = "half",
  hint,
  error,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  base?: number;
  min: number;
  step: number;
  size?: FieldSize;
  hint?: string;
  error?: string;
  onChange: (next: number | null) => void;
}) {
  const current = value ?? base ?? min;
  return (
    <FieldGroup label={label} size={size} hint={hint} error={error}>
      <div style={ui.inputBox}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          className="pc-no-spinner"
          style={ui.numberInput}
          placeholder={placeholder}
          value={value ?? ""}
          aria-label={label}
          onFocus={(e: { currentTarget: HTMLInputElement }) =>
            e.currentTarget.select()
          }
          onChange={(e: FieldChangeEvent) => {
            const digits = e.currentTarget.value.replace(/\D/g, "").slice(0, 4);
            onChange(digits === "" ? null : Number(digits));
          }}
        />
        <NumberStepper
          label={label.toLowerCase()}
          onIncrement={() => onChange(current + step)}
          onDecrement={() => onChange(Math.max(min, current - step))}
        />
      </div>
    </FieldGroup>
  );
}

function DateField({
  label,
  value,
  grey,
  size = "half",
  error,
  onChange,
}: {
  label: string;
  value: string;
  grey?: boolean;
  size?: FieldSize;
  error?: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.focus();
    }
  };
  return (
    <FieldGroup label={label} grey={grey} size={size} error={error}>
      <div
        style={{ ...ui.inputBox, cursor: "pointer" }}
        onClick={openPicker}
      >
        <img src="/date-icon.svg" width={18} height={20} alt="" />
        <input
          ref={ref}
          type="date"
          className="pc-date-input"
          style={ui.dateInput}
          value={value}
          onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
        />
      </div>
    </FieldGroup>
  );
}

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
  const [blackoutOpen, setBlackoutOpen] = useState(false);

  const errors: BookableProductFieldErrors =
    overridesFetcher.data?.intent === "saveOverrides"
      ? (overridesFetcher.data.errors ?? {})
      : {};
  const isSaving =
    overridesFetcher.state === "submitting" ||
    overridesFetcher.state === "loading";
  const blackoutErrors: BlackoutDateFieldErrors =
    blackoutFetcher.data && "blackoutErrors" in blackoutFetcher.data
      ? (blackoutFetcher.data.blackoutErrors ?? {})
      : {};
  const isBlackoutBusy = blackoutFetcher.state !== "idle";
  const isAddingBlackout =
    isBlackoutBusy &&
    String(blackoutFetcher.formData?.get("intent") ?? "") ===
      "addBlackoutDate";
  const numericProductId = productId.split("/").pop() ?? productId;

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

  const handleExcludeBlackoutDate = (date: string) => {
    blackoutFetcher.submit(
      { intent: "excludeBlackoutDate", productTitle, date },
      { method: "POST" },
    );
  };

  return (
    <s-page inlineSize="large">
      <div style={ui.root}>
        <style>{`
          .pc-no-spinner::-webkit-outer-spin-button,
          .pc-no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .pc-no-spinner {
            -moz-appearance: textfield;
          }
          .pc-date-input::-webkit-calendar-picker-indicator {
            opacity: 0;
            position: absolute;
            right: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
          }
        `}</style>

        <div style={pageStyles.outerCard}>
          <div style={pageStyles.headerRow}>
            <div style={{ minWidth: 0 }}>
              <h1 style={pageStyles.heading}>{productTitle}</h1>
              <p style={pageStyles.pageSubtitle}>
                Product ID: {numericProductId}
              </p>
            </div>
            <div style={ui.headerActions}>
              <div style={saveWrapperStyle()}>
                <button
                  type="button"
                  style={saveButtonStyle(isSaving)}
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
              <Link
                to="/app/products"
                style={ui.closeButton}
                aria-label="Close and go back to Products"
                title="Back to Products"
              >
                <CloseIcon />
              </Link>
            </div>
          </div>

          <div style={ui.stack}>
            {!hasLocations && (
              <s-banner tone="warning" heading="No locations configured">
                <s-paragraph>
                  Booking needs at least one location so every slot has a
                  timezone to anchor to.
                </s-paragraph>
                <s-link href="/app/settings/locations">
                  Go to Locations
                </s-link>
              </s-banner>
            )}

            <div style={ui.toggleCard}>
              <div style={ui.toggleRow}>
                <div style={ui.toggleText}>
                  <p style={ui.fieldLabelBlack}>Bookings</p>
                  <p style={ui.hintText}>Booking enabled for this product</p>
                </div>
                <Toggle
                  checked={values.isEnabled}
                  disabled={!hasLocations && !values.isEnabled}
                  onChange={() => setField("isEnabled", !values.isEnabled)}
                  label="Booking enabled for this product"
                />
              </div>
              {errors.isEnabled && (
                <p style={ui.errorText}>{errors.isEnabled}</p>
              )}
            </div>

            <Card
              title="Booking Type"
              description="Choose how this product is booked. Changing this only affects what settings apply below — existing bookings aren’t touched."
            >
              <div style={ui.fieldsRow}>
                <FieldGroup label="Booking Type" size="grow">
                  <div style={ui.selectWrap}>
                    <select
                      style={ui.select}
                      value={values.bookingType}
                      aria-label="Booking Type"
                      onChange={(e: FieldChangeEvent) =>
                        setField(
                          "bookingType",
                          e.currentTarget
                            .value as BookableProductFormValues["bookingType"],
                        )
                      }
                    >
                      {BOOKING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {BOOKING_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <span style={ui.selectChevron}>
                      <ChevronDownIcon />
                    </span>
                  </div>
                </FieldGroup>
              </div>
            </Card>

            {(values.bookingType === "SLOT" ||
              values.bookingType === "FULL_DAY" ||
              values.bookingType === "BUNDLE") && (
              <Card
                title="Working Days"
                description="Leave every day unchecked below and this product will use the shop default instead. Check any day to set a custom schedule just for this product."
              >
                <div style={ui.daysGroup}>
                  <div style={ui.daysRow}>
                    <Checkbox
                      checked={allWeekdaysSelected}
                      onChange={toggleSelectAllWorkingDays}
                      label="Select All"
                    />
                  </div>
                  <div style={ui.daysRow}>
                    {WEEKDAY_LABELS.map((day) => (
                      <Checkbox
                        key={day.value}
                        checked={(values.workingDays ?? []).includes(
                          day.value,
                        )}
                        onChange={() => toggleWorkingDay(day.value)}
                        label={day.label}
                      />
                    ))}
                  </div>
                </div>
                {errors.workingDays && (
                  <p style={ui.errorText}>{errors.workingDays}</p>
                )}
              </Card>
            )}

            {(values.bookingType === "SLOT" ||
              values.bookingType === "BUNDLE" ||
              values.bookingType === "FULL_DAY") && (
              <Card
                title="Daily Booking Window"
                description="The earliest and latest time a slot can start each working day. Leave blank to use the shop default."
              >
                <div style={ui.fieldsRow}>
                  <TimeField
                    label="Start Time"
                    value={values.dailyStartTime}
                    placeholder={shopDefaults.dailyStartTime}
                    error={errors.dailyStartTime}
                    onChange={(next) => setField("dailyStartTime", next)}
                  />
                  <TimeField
                    label="End Time"
                    value={values.dailyEndTime}
                    placeholder={shopDefaults.dailyEndTime}
                    error={errors.dailyEndTime}
                    onChange={(next) => setField("dailyEndTime", next)}
                  />
                </div>
              </Card>
            )}

            {values.bookingType === "SLOT" && (
              <Card
                title="Slot Configuration"
                description="Leave any field blank to use the shop default."
              >
                <div style={ui.fieldsRow}>
                  <NumberField
                    label="Slot Duration (minutes)"
                    size="third"
                    value={values.slotDurationMinutes}
                    placeholder={String(shopDefaults.slotDurationMinutes)}
                    base={shopDefaults.slotDurationMinutes}
                    min={5}
                    step={5}
                    error={errors.slotDurationMinutes}
                    onChange={(next) => setField("slotDurationMinutes", next)}
                  />
                  <NumberField
                    label="Buffer Time Between Slots (minutes)"
                    size="third"
                    value={values.bufferMinutes}
                    placeholder={String(shopDefaults.bufferMinutes)}
                    base={shopDefaults.bufferMinutes}
                    min={0}
                    step={5}
                    error={errors.bufferMinutes}
                    onChange={(next) => setField("bufferMinutes", next)}
                  />
                  <NumberField
                    label="Max Bookings Per Slot"
                    size="third"
                    value={values.maxBookingsPerSlot}
                    placeholder={String(shopDefaults.maxBookingsPerSlot)}
                    base={shopDefaults.maxBookingsPerSlot}
                    min={1}
                    step={1}
                    error={errors.maxBookingsPerSlot}
                    onChange={(next) => setField("maxBookingsPerSlot", next)}
                  />
                </div>
              </Card>
            )}

            {values.bookingType === "FULL_DAY" && (
              <Card
                title="Capacity"
                description="How many units of this product can be booked for the same day (e.g. number of identical venues/rooms). Leave blank to use the shop default."
              >
                <div style={ui.fieldsRow}>
                  <NumberField
                    label="Max Bookings Per Day"
                    value={values.maxBookingsPerSlot}
                    placeholder={String(shopDefaults.maxBookingsPerSlot)}
                    base={shopDefaults.maxBookingsPerSlot}
                    min={1}
                    step={1}
                    error={errors.maxBookingsPerSlot}
                    onChange={(next) => setField("maxBookingsPerSlot", next)}
                  />
                </div>
              </Card>
            )}

            {values.bookingType === "MULTI_DAY" && (
              <>
                <Card
                  title="Multi-day Settings"
                  description="The number of nights a customer can book in one go for this product."
                >
                  <div style={ui.fieldsRow}>
                    <NumberField
                      label="Minimum Nights"
                      value={values.minNights}
                      min={1}
                      step={1}
                      error={errors.minNights}
                      onChange={(next) => setField("minNights", next)}
                    />
                    <NumberField
                      label="Maximum Nights"
                      value={values.maxNights}
                      min={1}
                      step={1}
                      error={errors.maxNights}
                      onChange={(next) => setField("maxNights", next)}
                    />
                  </div>
                </Card>

                <Card
                  title="Capacity"
                  description="How many identical rooms or units can be booked for the same night (e.g. number of rooms of this type). Leave blank to use the shop default."
                >
                  <div style={ui.fieldsRow}>
                    <NumberField
                      label="Rooms / Units Available"
                      value={values.maxBookingsPerSlot}
                      placeholder={String(shopDefaults.maxBookingsPerSlot)}
                      base={shopDefaults.maxBookingsPerSlot}
                      min={1}
                      step={1}
                      error={errors.maxBookingsPerSlot}
                      onChange={(next) => setField("maxBookingsPerSlot", next)}
                    />
                  </div>
                </Card>
              </>
            )}

            {values.bookingType === "BUNDLE" && (
              <Card
                title="Bundle Settings"
                description="How many sessions make up one bundle purchase, how long each session runs, and how many days the customer has to use them all."
              >
                <div style={ui.fieldsRow}>
                  <NumberField
                    label="Sessions Per Bundle"
                    size="third"
                    value={values.bundleSessionCount}
                    min={2}
                    step={1}
                    error={errors.bundleSessionCount}
                    onChange={(next) => setField("bundleSessionCount", next)}
                  />
                  <NumberField
                    label="Session Duration (minutes)"
                    size="third"
                    value={values.bundleSessionDurationMinutes}
                    min={5}
                    step={5}
                    error={errors.bundleSessionDurationMinutes}
                    onChange={(next) =>
                      setField("bundleSessionDurationMinutes", next)
                    }
                  />
                  <NumberField
                    label="Validity Window (days)"
                    size="third"
                    value={values.bundleValidityDays}
                    min={1}
                    step={1}
                    hint="How many days after purchase the customer can use all sessions"
                    error={errors.bundleValidityDays}
                    onChange={(next) => setField("bundleValidityDays", next)}
                  />
                </div>
              </Card>
            )}

            <Card
              title="Advance Booking Rules"
              description="Control how soon and how far ahead customers can book this product. Leave blank to use the shop default."
            >
              <div style={ui.fieldsRow}>
                <NumberField
                  label="Minimum Advance Booking Time (hours)"
                  value={values.minAdvanceHours}
                  placeholder={String(shopDefaults.minAdvanceHours)}
                  base={shopDefaults.minAdvanceHours}
                  min={0}
                  step={1}
                  error={errors.minAdvanceHours}
                  onChange={(next) => setField("minAdvanceHours", next)}
                />
                <NumberField
                  label="Maximum Advance Booking (days)"
                  value={values.maxAdvanceDays}
                  placeholder={String(shopDefaults.maxAdvanceDays)}
                  base={shopDefaults.maxAdvanceDays}
                  min={1}
                  step={1}
                  error={errors.maxAdvanceDays}
                  onChange={(next) => setField("maxAdvanceDays", next)}
                />
              </div>
            </Card>

            <Card
              title="Booking Start and End Date"
              description="Restricts the overall window bookings are accepted in for this product. Leave blank to use the shop default."
            >
              <div style={ui.fieldsRow}>
                <DateField
                  label="Booking Start Date"
                  value={values.bookingStartDate ?? ""}
                  error={errors.bookingStartDate}
                  onChange={(next) => setField("bookingStartDate", next || null)}
                />
                <DateField
                  label="Booking End Date"
                  value={values.bookingEndDate ?? ""}
                  error={errors.bookingEndDate}
                  onChange={(next) => setField("bookingEndDate", next || null)}
                />
              </div>
            </Card>

            <Card
              title="Add a Blackout Date"
              description="Dates this specific product can’t be booked on — e.g. maintenance or a specific staff member’s day off — on top of any shop-wide blackout dates."
              collapsible
              open={blackoutOpen}
              onToggle={() => setBlackoutOpen((prev) => !prev)}
            >
              <div style={ui.fieldsRow}>
                <DateField
                  label="Date"
                  grey
                  size="fixed"
                  value={newBlackoutDate}
                  error={blackoutErrors.date}
                  onChange={setNewBlackoutDate}
                />
                <FieldGroup label="Reason (Optional)" grey size="grow">
                  <div style={ui.inputBox}>
                    <input
                      type="text"
                      style={ui.timeInput}
                      placeholder="e.g. Maintenance"
                      value={newBlackoutReason}
                      onChange={(e: FieldChangeEvent) =>
                        setNewBlackoutReason(e.currentTarget.value)
                      }
                    />
                  </div>
                </FieldGroup>
              </div>

              <hr style={ui.divider} />

              <button
                type="button"
                style={{
                  ...ui.addButton,
                  ...(isAddingBlackout
                    ? { opacity: 0.6, cursor: "not-allowed" }
                    : {}),
                }}
                onClick={handleAddBlackoutDate}
                disabled={isAddingBlackout}
              >
                <span style={ui.addButtonLabel}>Add Blackout Date</span>
                <span style={ui.plusWrap}>
                  <PlusIcon />
                </span>
              </button>
            </Card>

            {blackoutDates.length > 0 && (
              <div style={ui.card}>
                <div style={ui.cardHeaderText}>
                  <p style={ui.title}>Current Blackout Dates</p>
                  <p style={ui.descText}>
                    This blackout dates block bookings for this product.
                  </p>
                </div>

                <hr style={ui.divider} />

                <div style={ui.columnHeaderRow}>
                  <p style={ui.columnHeaderCell}>Date</p>
                  <p style={ui.columnHeaderCell}>Reason</p>
                  <p style={{ ...ui.columnHeaderCell, textAlign: "center" }}>
                    Actions
                  </p>
                </div>

                <hr style={ui.divider} />

                {blackoutDates.map(
                  (b: {
                    id: string;
                    date: string;
                    reason: string | null;
                    source: "shop" | "product";
                  }) => (
                    <div key={b.id} style={{ width: "100%" }}>
                      <div style={ui.rowWrap}>
                        <p style={ui.rowCell}>{b.date}</p>
                        <p style={ui.rowCell}>{b.reason ?? "—"}</p>
                        <div style={ui.actionsCell}>
                          <button
                            type="button"
                            style={ui.deleteButton}
                            onClick={() =>
                              b.source === "shop"
                                ? handleExcludeBlackoutDate(b.date)
                                : handleDeleteBlackoutDate(b.id)
                            }
                            disabled={isBlackoutBusy}
                            aria-label="Delete blackout date"
                          >
                            <img
                              src="/delete-icon.svg"
                              width={44}
                              height={40}
                              alt="Delete"
                              style={{ display: "block" }}
                            />
                          </button>
                        </div>
                      </div>
                      <hr style={ui.divider} />
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};