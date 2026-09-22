import { useEffect, useRef, useState } from "react";
import type { Booking, BookingType } from "@prisma/client";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
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
import { resolveBookingContextById } from "../models/booking-context.server";
import {
  createManualBooking,
  sendManualBookingEmailsInBackground,
  getBookedCountsInRange,
  getBookedNightCountsInRange,
} from "../models/booking.server";
import { listEnabledLocations } from "../models/bookingLocation.server";
import { listCustomFields, toPublicField } from "../models/customBookingField.server";
import { formatDateDisplay, formatTimeRangeDisplay } from "../utils/format";
import {
  BLUE,
  BORDER,
  LICENSE_BORDER,
  TEXT_DARK,
  TEXT_MUTED,
  styles as settingsStyles,
  saveWrapperStyle,
  saveButtonStyle,
} from "../components/SettingsUI";

const WEEKDAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const CAL_BLUE = "#0060E6";
const BLUE_TINT = "rgba(0, 96, 230, 0.08)";
const NAV_ARROW = "#4C4C4C";
const DISABLED_DATE = "#ADADAD";
const MONTH_PICKER_SPAN = 24;

const CAL_TEXT = "#1A1A1A";
const PLACEHOLDER = "#6E6E6E";

const S = {
  outerCard: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
  } as React.CSSProperties,
  headerRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    minHeight: "42px",
  } as React.CSSProperties,
  headerTitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "18px",
    lineHeight: "22px",
    letterSpacing: "0.02em",
    color: TEXT_DARK,
  } as React.CSSProperties,
  headerActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    flex: "none",
  } as React.CSSProperties,
  iconButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "40px",
    height: "40px",
    padding: "10px",
    boxSizing: "border-box",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: BLUE,
    textDecoration: "none",
  } as React.CSSProperties,
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "4px",
  } as React.CSSProperties,
  cardHeading: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    color: TEXT_DARK,
  } as React.CSSProperties,
  innerCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "12px",
    padding: "10px 10px 13px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "4px",
  } as React.CSSProperties,
  dateTimeCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "12px",
    padding: "10px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "4px",
  } as React.CSSProperties,
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: "12px",
  } as React.CSSProperties,
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: "1 1 220px",
    minWidth: "160px",
  } as React.CSSProperties,
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
  } as React.CSSProperties,
  input: {
    width: "100%",
    boxSizing: "border-box",
    height: "34px",
    padding: "5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontSize: "14px",
    color: TEXT_DARK,
  } as React.CSSProperties,
  selectWrap: {
    position: "relative",
    width: "100%",
  } as React.CSSProperties,
  select: {
    width: "100%",
    boxSizing: "border-box",
    height: "34px",
    padding: "5px 34px 5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontSize: "14px",
    color: TEXT_DARK,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    textOverflow: "ellipsis",
    cursor: "pointer",
  } as React.CSSProperties,
  selectChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    display: "block",
  } as React.CSSProperties,
  qtyNoteRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
  } as React.CSSProperties,
  qtyBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "0 0 auto",
    minWidth: "110px",
  } as React.CSSProperties,
  noteBlock: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: "12px",
    flex: "1 1 240px",
    minWidth: 0,
  } as React.CSSProperties,
  noteField: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "1 1 220px",
    minWidth: 0,
  } as React.CSSProperties,
  qtyNoteLabelRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "8px",
    minHeight: "17px",
    width: "100%",
  } as React.CSSProperties,
  qtyNoteLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  qtyNoteHint: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  quantityBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "5px 10px",
    gap: "20px",
    width: "110px",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
  } as React.CSSProperties,
  quantityStepBtn: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "20px",
    height: "20px",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  } as React.CSSProperties,
  quantityValue: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK,
  } as React.CSSProperties,
  calendarLayout: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    columnGap: "32px",
    rowGap: "24px",
    width: "100%",
  } as React.CSSProperties,
  calendarColumn: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 532px",
    minWidth: 0,
  } as React.CSSProperties,
  monthsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    columnGap: "32px",
    rowGap: "24px",
    width: "100%",
  } as React.CSSProperties,
  monthPane: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 250px",
    minWidth: "250px",
  } as React.CSSProperties,
  monthHeader: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: "38px",
    padding: "0 max(0px, calc((100% / 7 - 38px) / 2))",
    marginBottom: "32px",
  } as React.CSSProperties,
  navBtn: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "38px",
    height: "38px",
    padding: 0,
    border: "none",
    borderRadius: "999px",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  } as React.CSSProperties,
  navBtnNext: {
    background: BLUE_TINT,
  } as React.CSSProperties,
  monthPicker: {
    position: "relative",
    display: "inline-flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    boxSizing: "border-box",
    minWidth: 0,
    height: "38px",
    padding: "0 4px",
    cursor: "pointer",
  } as React.CSSProperties,
  monthPickerText: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "21px",
    color: CAL_TEXT,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  monthPickerSelect: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    border: "none",
    opacity: 0,
    cursor: "pointer",
    fontFamily: "Inter",
    fontSize: "14px",
  } as React.CSSProperties,
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    marginBottom: "16px",
  } as React.CSSProperties,
  weekdayLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "12px",
    textTransform: "uppercase",
    color: CAL_TEXT,
    textAlign: "center",
  } as React.CSSProperties,
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    rowGap: "8px",
  } as React.CSSProperties,
  dayBtn: (
    selected: boolean,
    inRange: boolean,
    available: boolean,
  ): React.CSSProperties => ({
    justifySelf: "center",
    width: "100%",
    maxWidth: "44px",
    aspectRatio: "1 / 1",
    padding: 0,
    border: "none",
    borderRadius: "999px",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "24px",
    cursor: available ? "pointer" : "not-allowed",
    background: selected
      ? CAL_BLUE
      : inRange
        ? "rgba(0, 96, 230, 0.12)"
        : "transparent",
    color: selected ? "#FFFFFF" : available ? CAL_TEXT : DISABLED_DATE,
  }),
  slotsColumn: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: "0 1 222px",
    width: "222px",
    minWidth: "100px",
    maxWidth: "100%",
    maxHeight: "350px",
    overflowY: "auto",
  } as React.CSSProperties,
  slotsHint: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "13px",
    lineHeight: "18px",
    color: TEXT_MUTED,
    margin: 0,
  } as React.CSSProperties,
  timeSlotBtn: (active: boolean, disabled: boolean): React.CSSProperties => ({
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flex: "none",
    padding: "12px 24px",
    width: "100%",
    minHeight: "45px",
    border: `1px solid ${CAL_BLUE}`,
    borderRadius: "28px",
    background: active ? CAL_BLUE : "#FFFFFF",
    color: active ? "#FFFFFF" : CAL_TEXT,
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "21px",
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  }),
  chip: (tone: "info" | "ok"): React.CSSProperties => ({
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "16px",
    padding: "5px 10px",
    borderRadius: "999px",
    background: tone === "ok" ? "#e3f6e8" : BLUE_TINT,
  }),
  chipText: (tone: "info" | "ok"): React.CSSProperties => ({
    fontFamily: "Inter",
    fontSize: "13px",
    fontWeight: 600,
    color: tone === "ok" ? "#1a7f37" : CAL_BLUE,
  }),
};

type FieldChangeEvent = { currentTarget: { value: string } };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function CollapseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M0 20L10 10L20 20M20 0L9.998 10L0 0"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectChevron() {
  return (
    <svg
      width="12"
      height="7"
      viewBox="0 0 12 7"
      fill="none"
      aria-hidden="true"
      style={S.selectChevron}
    >
      <path
        d="M1 1L6 6L11 1"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10H15" stroke={BLUE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusStepIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 5V15M15 10H5" stroke={BLUE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function splitFieldLabel(label: string): { title: string; hint: string | null } {
  const match = /^(.*?)\s*(\([^()]+\))\s*$/.exec(label.trim());
  if (match && match[1]) return { title: match[1], hint: match[2] };
  return { title: label, hint: null };
}

function NavChevron({
  direction,
  color,
}: {
  direction: "left" | "right";
  color: string;
}) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="22 22 14 14"
      fill="none"
      aria-hidden="true"
      style={{
        display: "block",
        transform: direction === "right" ? "scaleX(-1)" : undefined,
      }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32.4806 34.9941C32.8398 34.6529 32.8398 34.0998 32.4806 33.7586L27.4706 29L32.4806 24.2414C32.8398 23.9002 32.8398 23.3471 32.4806 23.0059C32.1214 22.6647 31.539 22.6647 31.1798 23.0059L25.5194 28.3822C25.1602 28.7234 25.1602 29.2766 25.5194 29.6178L31.1798 34.9941C31.539 35.3353 32.1214 35.3353 32.4806 34.9941Z"
        fill={color}
      />
    </svg>
  );
}

function DropdownChevron() {
  return (
    <svg
      width="14"
      height="12"
      viewBox="192.5 23 14 12"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M205.494 25.5194C205.153 25.1602 204.6 25.1602 204.259 25.5194L199.5 30.5294L194.741 25.5194C194.4 25.1602 193.847 25.1602 193.506 25.5194C193.165 25.8786 193.165 26.461 193.506 26.8202L198.882 32.4806C199.223 32.8398 199.777 32.8398 200.118 32.4806L205.494 26.8202C205.835 26.461 205.835 25.8786 205.494 25.5194Z"
        fill={TEXT_DARK}
      />
    </svg>
  );
}

type QueuedEntry = {
  bookableProductId: string;
  productTitle: string;
  date: string;
  slot: TimeSlot;
  endDate?: string | null;
  quantity: number;
  error?: string;
};

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
      bundleSessionCount: p.bundleSessionCount,
      bundleValidityDays: p.bundleValidityDays,
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
  const context = await resolveBookingContextById(shop, bookableProductId, locationId);
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

    return {
      intent,
      ok: true as const,
      availableDates,
      dailyStartTime: resolved.effectiveSettings.dailyStartTime,
      dailyEndTime: resolved.effectiveSettings.dailyEndTime,
    };
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
    const createdBookings: {
      booking: Booking;
      productTitle: string;
      bookingType: BookingType;
    }[] = [];
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
      if (result.ok) {
        createdBookings.push({
          booking: result.booking,
          productTitle: result.productTitle,
          bookingType: result.bookingType,
        });
      }
      results.push({
        bookableProductId: slot.bookableProductId,
        date: slot.date,
        slotStart: slot.slotStart,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
      });
    }

    sendManualBookingEmailsInBackground(session.shop, createdBookings);

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
  const secondMonthFetcher = useFetcher<typeof action>();
  const slotsFetcher = useFetcher<typeof action>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const today = new Date();

  const [bookableProductId, setBookableProductId] = useState("");
  const selectedProduct = products.find((p) => p.id === bookableProductId);
  const selectedBookingType = selectedProduct?.bookingType ?? "SLOT";
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth() + 1);
  const [date, setDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [locationId, setLocationId] = useState("");
  const readyForCalendar =
    Boolean(bookableProductId) && (locations.length === 0 || Boolean(locationId));
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [queuedSlots, setQueuedSlots] = useState<QueuedEntry[]>([]);
  const submittedRef = useRef<QueuedEntry[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const bundleSessionsQueued = queuedSlots.filter(
    (entry) => entry.bookableProductId === bookableProductId,
  );
  const bundleSessionCount = selectedProduct?.bundleSessionCount ?? null;
  const bundleSessionsRemaining =
    bundleSessionCount !== null
      ? Math.max(0, bundleSessionCount - bundleSessionsQueued.length)
      : null;
  const bundleComplete =
    bundleSessionCount !== null && bundleSessionsRemaining === 0;

  const bundleValidityDays =
    selectedBookingType === "BUNDLE"
      ? (selectedProduct?.bundleValidityDays ?? null)
      : null;
  const bundleQueuedDates = bundleSessionsQueued.map((entry) => entry.date).sort();
  const bundleWindowStart = bundleValidityDays ? (bundleQueuedDates[0] ?? null) : null;
  const addDaysToIso = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const bundleValidityDeadline =
    bundleValidityDays && bundleWindowStart
      ? addDaysToIso(bundleWindowStart, bundleValidityDays)
      : null;

  const availableDates: string[] =
    availabilityFetcher.data?.intent === "loadAvailability" &&
    availabilityFetcher.data.ok
      ? availabilityFetcher.data.availableDates
      : [];

  const fullDayStartTime: string =
    availabilityFetcher.data?.intent === "loadAvailability" &&
    availabilityFetcher.data.ok
      ? availabilityFetcher.data.dailyStartTime
      : "00:00";

  const fullDayEndTime: string =
    availabilityFetcher.data?.intent === "loadAvailability" &&
    availabilityFetcher.data.ok
      ? availabilityFetcher.data.dailyEndTime
      : "23:59";

  const isTwoMonthType = true;

  const todayMonthIndex = today.getUTCFullYear() * 12 + today.getUTCMonth();

  const monthPickerOptions = (shownIndex: number, offset: number) => {
    const start = todayMonthIndex + offset;
    const end = start + MONTH_PICKER_SPAN - 1;
    const from = Math.min(start, shownIndex);
    const to = Math.max(end, shownIndex);
    const options: Array<{ value: number; label: string }> = [];
    for (let i = from; i <= to; i += 1) {
      options.push({
        value: i,
        label: `${MONTH_NAMES[i % 12]} ${Math.floor(i / 12)}`,
      });
    }
    return options;
  };

  const jumpToMonthIndex = (index: number) => {
    setViewYear(Math.floor(index / 12));
    setViewMonth((index % 12) + 1);
  };

  let secondYear = viewYear;
  let secondMonth = viewMonth + 1;
  if (secondMonth > 12) {
    secondMonth = 1;
    secondYear += 1;
  }

  const secondMonthDates: string[] =
    secondMonthFetcher.data?.intent === "loadAvailability" &&
    secondMonthFetcher.data.ok
      ? secondMonthFetcher.data.availableDates
      : [];

  const slots: TimeSlot[] =
    slotsFetcher.data?.intent === "loadSlots" && slotsFetcher.data.ok
      ? slotsFetcher.data.slots
      : [];

  const createResult =
    createFetcher.data?.intent === "createBooking" ? createFetcher.data : null;
  const createError =
    createResult && "error" in createResult ? createResult.error : null;

  const quantityLocked =
    selectedBookingType === "BUNDLE" && bundleSessionsQueued.length > 0;

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

  const loadSecondMonthAvailability = (
    productId: string,
    year: number,
    month: number,
  ) => {
    if (!productId) return;
    secondMonthFetcher.submit(
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
    setCheckoutDate("");
    setCheckoutError(null);
    setSelectedSlot(null);
    if (!readyForCalendar) return;
    loadAvailability(bookableProductId, viewYear, viewMonth);
    if (isTwoMonthType) {
      loadSecondMonthAvailability(bookableProductId, secondYear, secondMonth);
    }
  }, [bookableProductId, viewYear, viewMonth, locationId, isTwoMonthType, readyForCalendar]);

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

    setDate("");
    setCheckoutDate("");
    setSelectedSlot(null);

    if (failedCount === 0) {
      setQueuedSlots([]);
      setCustomFieldValues({});
      setCustomerName("");
      setNameTouched(false);
      setCustomerEmail("");
      setEmailTouched(false);
      setCustomerPhone("");
      setPhoneTouched(false);
      setSubmitAttempted(false);
    } else {
      setQueuedSlots(
        submittedRef.current
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
          .filter((entry): entry is QueuedEntry => entry !== null),
      );
    }
    loadAvailability(bookableProductId, viewYear, viewMonth);
    if (isTwoMonthType) {
      loadSecondMonthAvailability(bookableProductId, secondYear, secondMonth);
    }
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

  const nightsBetween = (checkin: string, checkout: string): number =>
    Math.round(
      (new Date(`${checkout}T00:00:00.000Z`).getTime() -
        new Date(`${checkin}T00:00:00.000Z`).getTime()) /
        86400000,
    );

  const multiDayMinNights = selectedProduct?.minNights ?? null;
  const multiDayMaxNights = selectedProduct?.maxNights ?? null;

  const stayLengthError = (checkin: string, checkout: string): string | null => {
    const nights = nightsBetween(checkin, checkout);
    if (multiDayMinNights !== null && nights < multiDayMinNights) {
      return `Minimum stay is ${multiDayMinNights} night${multiDayMinNights === 1 ? "" : "s"}.`;
    }
    if (multiDayMaxNights !== null && nights > multiDayMaxNights) {
      return `Maximum stay is ${multiDayMaxNights} night${multiDayMaxNights === 1 ? "" : "s"}.`;
    }
    return null;
  };

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const selectDate = (dateStr: string) => {
    if (selectedBookingType === "MULTI_DAY") {
      if (!date || checkoutDate || dateStr <= date) {
        setDate(dateStr);
        setCheckoutDate("");
        setCheckoutError(null);
        setSelectedSlot(null);
        return;
      }
      const error = stayLengthError(date, dateStr);
      if (error) {
        setCheckoutError(error);
        setCheckoutDate("");
        setSelectedSlot(null);
        return;
      }
      setCheckoutError(null);
      setCheckoutDate(dateStr);
      setSelectedSlot({
        start: "00:00",
        end: "00:00",
        startsAt: `${date}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
      return;
    }

    setDate(dateStr);
    setCheckoutDate("");
    setCheckoutError(null);
    if (selectedBookingType === "FULL_DAY") {
      setSelectedSlot({
        start: fullDayStartTime,
        end: fullDayEndTime,
        startsAt: `${dateStr}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
      return;
    }
    setSelectedSlot(null);
    slotsFetcher.submit(
      { intent: "loadSlots", bookableProductId, locationId, date: dateStr },
      { method: "POST" },
    );
  };

  const handleChangeMultiDayDates = () => {
    setDate("");
    setCheckoutDate("");
    setCheckoutError(null);
    setSelectedSlot(null);
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const multiDayStayLengthMessage = (() => {
    if (selectedBookingType !== "MULTI_DAY") return null;
    const min = multiDayMinNights;
    const max = multiDayMaxNights;
    if (min !== null && max !== null) {
      return `Min Days: ${min}, Max Days: ${max}`;
    }
    if (min !== null) return `Min Days: ${min}`;
    if (max !== null) return `Max Days: ${max}`;
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

  const phoneError =
    (phoneTouched || submitAttempted) &&
    customerPhone !== "" &&
    customerPhone.length !== 10
      ? "Phone number must be exactly 10 digits"
      : undefined;
  const currentEntry: QueuedEntry | null = (() => {
    if (!date || !selectedSlot) return null;
    if (selectedBookingType === "MULTI_DAY" && !checkoutDate) return null;
    const alreadyQueued = queuedSlots.some(
      (entry) =>
        entry.bookableProductId === bookableProductId &&
        entry.date === date &&
        entry.slot.startsAt === selectedSlot.startsAt,
    );
    if (alreadyQueued) return null;
    return {
      bookableProductId,
      productTitle: selectedProduct?.title ?? "",
      date,
      slot: selectedSlot,
      endDate: selectedBookingType === "MULTI_DAY" ? checkoutDate : null,
      quantity:
        selectedBookingType === "BUNDLE" && bundleSessionsQueued.length > 0
          ? bundleSessionsQueued[0].quantity
          : quantity,
    };
  })();

  const submissionSlots: QueuedEntry[] = currentEntry
    ? [...queuedSlots, currentEntry]
    : queuedSlots;

  const hasSelection = submissionSlots.length > 0;

  const createBookingCount =
    submissionSlots.filter(
      (entry) =>
        products.find((p) => p.id === entry.bookableProductId)?.bookingType !==
        "BUNDLE",
    ).length +
    new Set(
      submissionSlots
        .filter(
          (entry) =>
            products.find((p) => p.id === entry.bookableProductId)
              ?.bookingType === "BUNDLE",
        )
        .map((entry) => entry.bookableProductId),
    ).size;

  const productError =
    submitAttempted && !bookableProductId ? "Select a product" : undefined;
  const locationError =
    submitAttempted && locations.length > 0 && !locationId
      ? "Select a location"
      : undefined;

  const noSelectionError =
    submitAttempted && submissionSlots.length === 0
      ? selectedBookingType === "MULTI_DAY"
        ? "Select check-in and check-out dates first."
        : "Select a date and time first."
      : undefined;

  const needsNextSlot =
    !!selectedSlot &&
    selectedBookingType === "BUNDLE" &&
    bundleSessionCount !== null &&
    bundleSessionsQueued.length + 1 < bundleSessionCount;

  const isLastBundleSession =
    !!selectedSlot &&
    selectedBookingType === "BUNDLE" &&
    bundleSessionCount !== null &&
    bundleSessionsQueued.length + 1 === bundleSessionCount;

  const handleNextSlot = () => {
    if (!currentEntry) return;
    setQueuedSlots((prev) => [...prev, currentEntry]);
    setDate("");
    setCheckoutDate("");
    setSelectedSlot(null);
  };

  const handleRemoveQueued = (index: number) => {
    setQueuedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const incompleteBundleTitles = Array.from(
    new Set(submissionSlots.map((entry) => entry.bookableProductId)),
  )
    .map((id) => {
      const product = products.find((p) => p.id === id);
      if (!product || product.bookingType !== "BUNDLE" || product.bundleSessionCount === null) {
        return null;
      }
      const queuedCount = submissionSlots.filter(
        (entry) => entry.bookableProductId === id,
      ).length;
      return queuedCount !== product.bundleSessionCount ? product.title : null;
    })
    .filter((title): title is string => title !== null);

  const handleCreateBooking = () => {
    setSubmitAttempted(true);
    setNameTouched(true);
    setEmailTouched(true);
    setPhoneTouched(true);

    if (
      !bookableProductId ||
      (locations.length > 0 && !locationId) ||
      submissionSlots.length === 0 ||
      incompleteBundleTitles.length > 0 ||
      !customerName.trim() ||
      !customerEmail.trim() ||
      !isValidEmail(customerEmail) ||
      (customerPhone !== "" && customerPhone.length !== 10)
    ) {
      return;
    }

    const selectedLocation = locations.find((l) => l.id === locationId);

    submittedRef.current = submissionSlots;

    createFetcher.submit(
      {
        intent: "createBooking",
        location: selectedLocation?.name ?? "",
        locationId: selectedLocation?.id ?? "",
        customFieldResponses: JSON.stringify(customFieldValues),
        slots: JSON.stringify(
          submissionSlots.map((entry) => ({
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
      <s-page heading="New Booking" inlineSize="950px">
        <div style={S.card}>
          <p style={{ fontFamily: "Inter", fontSize: "14px", color: TEXT_MUTED, margin: 0 }}>
            No products have booking enabled yet. Enable booking on a
            product first from the Products page.
          </p>
        </div>
      </s-page>
    );
  }

  const applyBundleDeadline = (dates: string[]) =>
    selectedBookingType === "BUNDLE" && bundleValidityDeadline
      ? dates.filter(
          (d) =>
            d <= bundleValidityDeadline &&
            (!bundleWindowStart || d >= bundleWindowStart),
        )
      : dates;

  const availableSet = new Set(applyBundleDeadline(availableDates));
  const secondAvailableSet = new Set(applyBundleDeadline(secondMonthDates));
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
  const secondDaysInMonth = new Date(
    Date.UTC(secondYear, secondMonth, 0),
  ).getUTCDate();
  const secondFirstWeekday = new Date(
    Date.UTC(secondYear, secondMonth - 1, 1),
  ).getUTCDay();
  const isLoadingAvailability = availabilityFetcher.state !== "idle";
  const isLoadingSecondMonth = secondMonthFetcher.state !== "idle";
  const isLoadingSlots = slotsFetcher.state !== "idle";
  const isCreatingBooking = createFetcher.state !== "idle";

  const renderMonthGrid = (
    year: number,
    month: number,
    monthDaysInMonth: number,
    monthFirstWeekday: number,
    monthAvailableSet: Set<string>,
  ) => (
    <div>
      <div style={S.weekdayRow}>
        {WEEKDAY_HEADERS.map((label) => (
          <span key={`wd-${year}-${month}-${label}`} style={S.weekdayLabel}>
            {label}
          </span>
        ))}
      </div>
      <div style={S.dayGrid}>
        {Array.from({ length: monthFirstWeekday }).map((_, i) => (
          <span key={`blank-${year}-${month}-${i}`} />
        ))}
        {Array.from({ length: monthDaysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPickingCheckout =
            selectedBookingType === "MULTI_DAY" && !!date && !checkoutDate;
          const isAvailable = isPickingCheckout
            ? dateStr > date
            : monthAvailableSet.has(dateStr) && !bundleComplete;
          const isSelected =
            dateStr === date ||
            (selectedBookingType === "MULTI_DAY" && dateStr === checkoutDate);
          const isInRange =
            selectedBookingType === "MULTI_DAY" &&
            !!date &&
            !!checkoutDate &&
            dateStr > date &&
            dateStr < checkoutDate;
          return (
            <button
              key={dateStr}
              type="button"
              className="nb-day"
              disabled={!isAvailable}
              aria-pressed={isSelected}
              aria-label={`${day} ${MONTH_NAMES[month - 1]} ${year}`}
              onClick={() => isAvailable && selectDate(dateStr)}
              style={S.dayBtn(isSelected, isInRange, isAvailable)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMonthPane = (
    year: number,
    month: number,
    monthDaysInMonth: number,
    monthFirstWeekday: number,
    monthAvailableSet: Set<string>,
    isLoading: boolean,
    hasAnyAvailability: boolean,
    offset: number,
  ) => {
    const shownIndex = year * 12 + (month - 1);
    const paneLabel = `${MONTH_SHORT[month - 1]} ${year}`;
    return (
      <div key={`pane-${year}-${month}`} style={S.monthPane}>
        <div style={S.monthHeader}>
          <button
            type="button"
            className="nb-nav"
            style={S.navBtn}
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
          >
            <NavChevron direction="left" color={NAV_ARROW} />
          </button>

          <label className="nb-month-picker" style={S.monthPicker}>
            <span style={S.monthPickerText}>{paneLabel}</span>
            <DropdownChevron />
            <select
              style={S.monthPickerSelect}
              aria-label={`Select month, currently ${paneLabel}`}
              value={shownIndex}
              onChange={(e: FieldChangeEvent) =>
                jumpToMonthIndex(Number(e.currentTarget.value) - offset)
              }
            >
              {monthPickerOptions(shownIndex, offset).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="nb-nav"
            style={{ ...S.navBtn, ...S.navBtnNext }}
            onClick={() => goToMonth(1)}
            aria-label="Next month"
          >
            <NavChevron direction="right" color={CAL_BLUE} />
          </button>
        </div>

        {isLoading ? (
          <p style={{ fontFamily: "Inter", fontSize: "13px", color: TEXT_MUTED, margin: 0 }}>
            Loading availability…
          </p>
        ) : (
          renderMonthGrid(
            year,
            month,
            monthDaysInMonth,
            monthFirstWeekday,
            monthAvailableSet,
          )
        )}
        {!isLoading && !hasAnyAvailability && (
          <p style={{ fontFamily: "Inter", fontSize: "13px", color: TEXT_MUTED, margin: "12px 0 0" }}>
            {bookableProductId
              ? "No availability this month."
              : "Select a product to see availability."}
          </p>
        )}
      </div>
    );
  };

  return (
    <s-page heading="New Booking" inlineSize="950px">
      <div style={S.outerCard}>
        <style>{`
          .nb-day:not(:disabled):not([aria-pressed="true"]):hover {
            background: ${BLUE_TINT} !important;
          }
          .nb-slot:not(:disabled):not([aria-pressed="true"]):hover {
            background: ${BLUE_TINT} !important;
          }
          .nb-nav:hover {
            background: rgba(0, 96, 230, 0.14) !important;
          }
          .nb-day:focus-visible,
          .nb-slot:focus-visible,
          .nb-nav:focus-visible {
            outline: 2px solid ${CAL_BLUE};
            outline-offset: 2px;
          }
          .nb-note-input::placeholder {
            color: #000000;
            opacity: 1;
          }
          .nb-cust-input::placeholder {
            color: #6E6E6E;
            opacity: 1;
          }
          .nb-select option {
            color: #000000;
          }
          .nb-select:focus-visible,
          .nb-note-input:focus-visible,
          .nb-cust-input:focus-visible {
            outline: 2px solid ${CAL_BLUE};
            outline-offset: 1px;
          }
          .nb-month-picker:focus-within {
            outline: 2px solid ${CAL_BLUE};
            outline-offset: 2px;
            border-radius: 4px;
          }
        `}</style>

        {}
        <div style={S.headerRow}>
          <span style={S.headerTitle}>Add New Booking</span>
          <div style={S.headerActions}>
            <Link to="/app/bookings" style={S.iconButton} aria-label="Back to bookings">
              <CollapseIcon />
            </Link>
          </div>
        </div>

        {}
        <div style={S.innerCard}>
          <div style={S.fieldsRow}>
            <div style={S.fieldBlock}>
              <label htmlFor="nb-product" style={S.fieldLabel}>
                Select Product
              </label>
              <div style={S.selectWrap}>
                <select
                  id="nb-product"
                  className="nb-select"
                  style={{
                    ...S.select,
                    ...(!bookableProductId ? { color: PLACEHOLDER } : {}),
                    ...(productError ? { borderColor: "#C0392B" } : {}),
                  }}
                  value={bookableProductId}
                  onChange={(e: FieldChangeEvent) =>
                    setBookableProductId(e.currentTarget.value)
                  }
                >
                  <option value="" disabled>
                    Select product
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
              {productError && (
                <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{productError}</span>
              )}
            </div>

            {locations.length > 0 && (
              <div style={S.fieldBlock}>
                <label htmlFor="nb-location" style={S.fieldLabel}>
                  Add Location
                </label>
                <div style={S.selectWrap}>
                  <select
                    id="nb-location"
                    className="nb-select"
                    style={{
                      ...S.select,
                      ...(!locationId ? { color: PLACEHOLDER } : {}),
                      ...(locationError ? { borderColor: "#C0392B" } : {}),
                    }}
                    value={locationId}
                    onChange={(e: FieldChangeEvent) =>
                      setLocationId(e.currentTarget.value)
                    }
                  >
                    <option value="" disabled>
                      Select location
                    </option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
                {locationError && (
                  <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{locationError}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {}
        {readyForCalendar && (
        <div style={S.dateTimeCard}>
          {selectedBookingType === "MULTI_DAY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={S.cardHeading}>Select your preferred date & time</span>
              {multiDayStayLengthMessage && (
                <span style={{ fontFamily: "Inter", fontSize: "13px", color: TEXT_MUTED }}>
                  {multiDayStayLengthMessage}
                </span>
              )}
            </div>
          )}
          {selectedBookingType === "BUNDLE" && bundleSessionCount !== null && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={S.cardHeading}>Select your preferred date & time</span>
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: "13px",
                  color: bundleComplete ? "#1a7f37" : TEXT_MUTED,
                }}
              >
                {bundleComplete
                  ? `All ${bundleSessionCount} session(s) added for this bundle.`
                  : `Session ${bundleSessionsQueued.length + 1} of ${bundleSessionCount}` +
                    (bundleValidityDeadline
                      ? ` — all sessions must be booked by ${formatDateDisplay(bundleValidityDeadline)}`
                      : bundleValidityDays
                        ? ` — all sessions within ${bundleValidityDays} days of the first session`
                        : "")}
              </span>
            </div>
          )}

          <div style={S.calendarLayout}>
            <div style={S.calendarColumn}>
              <div style={S.monthsRow}>
                {renderMonthPane(
                  viewYear,
                  viewMonth,
                  daysInMonth,
                  firstWeekday,
                  availableSet,
                  isLoadingAvailability,
                  availableDates.length > 0,
                  0,
                )}
                {isTwoMonthType &&
                  renderMonthPane(
                    secondYear,
                    secondMonth,
                    secondDaysInMonth,
                    secondFirstWeekday,
                    secondAvailableSet,
                    isLoadingSecondMonth,
                    secondMonthDates.length > 0,
                    1,
                  )}
              </div>

              {selectedBookingType === "FULL_DAY" && date && (
                <div style={S.chip("info")}>
                  <span style={S.chipText("info")}>
                    {formatTimeRangeDisplay(fullDayStartTime, fullDayEndTime)}{" "}
                    {"\u2014"} {date}
                  </span>
                </div>
              )}
              {selectedBookingType === "MULTI_DAY" && date && !checkoutDate && (
                <div style={S.chip("info")}>
                  <span style={S.chipText("info")}>
                    Check-in {date}. Now pick a check-out date.
                  </span>
                </div>
              )}
              {selectedBookingType === "MULTI_DAY" && checkoutError && (
                <span
                  role="alert"
                  style={{
                    marginTop: "12px",
                    fontFamily: "Inter",
                    fontSize: "13px",
                    color: "#C0392B",
                  }}
                >
                  {checkoutError}
                </span>
              )}
              {selectedBookingType === "MULTI_DAY" && date && checkoutDate && (
                <div style={S.chip("ok")}>
                  <span style={S.chipText("ok")}>
                    {date} → {checkoutDate} ({nightsBetween(date, checkoutDate)}{" "}
                    night{nightsBetween(date, checkoutDate) === 1 ? "" : "s"})
                  </span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: BLUE,
                      fontFamily: "Inter",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                    onClick={handleChangeMultiDayDates}
                  >
                    Change dates
                  </button>
                </div>
              )}
            </div>

            {(selectedBookingType === "SLOT" ||
              selectedBookingType === "BUNDLE") && (
              <div
                style={S.slotsColumn}
                role="group"
                aria-label={
                  selectedBookingType === "BUNDLE" && bundleSessionCount !== null
                    ? `Available times, session ${bundleSessionsQueued.length + 1} of ${bundleSessionCount}`
                    : "Available times"
                }
              >
                {!date ? (
                  <p style={S.slotsHint}>Select a date to see available times.</p>
                ) : isLoadingSlots ? (
                  <p style={S.slotsHint}>Loading available times…</p>
                ) : slots.length === 0 ? (
                  <p style={S.slotsHint}>No slots at all on this date.</p>
                ) : (
                  slots.map((slot) => {
                    const isActive = selectedSlot?.startsAt === slot.startsAt;
                    const extra = !slot.available
                      ? "Booked"
                      : typeof slot.remainingCapacity === "number"
                        ? slot.remainingCapacity === 1
                          ? "1 slot left"
                          : `${slot.remainingCapacity} slots left`
                        : null;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        className="nb-slot"
                        style={S.timeSlotBtn(isActive, !slot.available)}
                        disabled={!slot.available}
                        aria-pressed={isActive}
                        onClick={() => {
                          if (slot.available) setSelectedSlot(slot);
                        }}
                      >
                        <span>{formatTimeRangeDisplay(slot.start, slot.end)}</span>
                        {extra && (
                          <span style={{ fontSize: "12px", lineHeight: "15px" }}>
                            {extra}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {(needsNextSlot || isLastBundleSession) && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: "6px",
                  background: CAL_BLUE,
                  color: "#fff",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontSize: "16px",
                  lineHeight: "19px",
                  padding: "10px 22px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
                onClick={handleNextSlot}
              >
                {needsNextSlot ? "Next slot" : "Done"}
              </button>
            </div>
          )}
        </div>
        )}

        {}
        {queuedSlots.length > 0 && (
          <div style={S.innerCard}>
            <span style={S.cardHeading}>Slots to book</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queuedSlots.map((entry, index) => (
                <div
                  key={entry.bookableProductId + entry.date + entry.slot.startsAt}
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: "13px", color: TEXT_DARK }}>
                    <b>{entry.productTitle}</b> —{" "}
                    {(() => {
                      const entryType =
                        products.find((p) => p.id === entry.bookableProductId)
                          ?.bookingType ?? "SLOT";
                      if (entryType === "FULL_DAY") {
                        return `${entry.date} \u00b7 ${formatTimeRangeDisplay(entry.slot.start, entry.slot.end)}`;
                      }
                      if (entryType === "MULTI_DAY") {
                        return `${entry.date} \u2192 ${entry.endDate ?? "—"}`;
                      }
                      return `${entry.date} | ${formatTimeRangeDisplay(entry.slot.start, entry.slot.end)}`;
                    })()}
                    {entry.quantity > 1 ? ` × ${entry.quantity}` : ""}
                  </span>
                  {entry.error && (
                    <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#C0392B" }}>
                      {entry.error}
                    </span>
                  )}
                  <button
                    type="button"
                    style={{ border: "none", background: "transparent", color: BLUE, fontFamily: "Inter", fontSize: "13px", cursor: isCreatingBooking ? "default" : "pointer" }}
                    disabled={isCreatingBooking}
                    onClick={() => handleRemoveQueued(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasSelection && (
          <>
            {}
            <div style={S.innerCard}>
              <div style={S.qtyNoteRow}>
                <div style={S.qtyBlock}>
                  <div style={S.qtyNoteLabelRow}>
                    <span style={S.qtyNoteLabel}>Quantity</span>
                    {selectedSlot && !quantityLocked && maxQuantity <= 5 && (
                      <span style={S.qtyNoteHint}>(max {maxQuantity})</span>
                    )}
                  </div>
                  {quantityLocked ? (
                    <div
                      style={S.quantityBox}
                      title="Set on the first session of this bundle"
                    >
                      <span style={S.quantityValue}>
                        {bundleSessionsQueued[0].quantity}
                      </span>
                    </div>
                  ) : (
                    <div style={S.quantityBox}>
                      <button
                        type="button"
                        style={{
                          ...S.quantityStepBtn,
                          ...(!selectedSlot || quantity <= 1
                            ? { opacity: 0.4, cursor: "not-allowed" }
                            : {}),
                        }}
                        disabled={!selectedSlot || quantity <= 1}
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        <MinusIcon />
                      </button>
                      <span style={S.quantityValue}>{quantity}</span>
                      <button
                        type="button"
                        style={{
                          ...S.quantityStepBtn,
                          ...(!selectedSlot || quantity >= maxQuantity
                            ? { opacity: 0.4, cursor: "not-allowed" }
                            : {}),
                        }}
                        disabled={!selectedSlot || quantity >= maxQuantity}
                        aria-label="Increase quantity"
                        onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      >
                        <PlusStepIcon />
                      </button>
                    </div>
                  )}
                </div>

                {customFields.length > 0 && (
                  <div style={S.noteBlock}>
                    {customFields.map((field) => {
                      const { title, hint } = splitFieldLabel(field.label);
                      return (
                        <div key={field.fieldKey} style={S.noteField}>
                          <div style={S.qtyNoteLabelRow}>
                            <span style={S.qtyNoteLabel}>{title}</span>
                            {hint && <span style={S.qtyNoteHint}>{hint}</span>}
                          </div>
                          <input
                            type="text"
                            className="nb-note-input"
                            style={S.input}
                            placeholder="Enter message here"
                            aria-label={field.label}
                            required={field.required}
                            value={customFieldValues[field.fieldKey] ?? ""}
                            onChange={(e: FieldChangeEvent) => {
                              const value = e.currentTarget.value;
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [field.fieldKey]: value,
                              }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {}
            <div style={S.innerCard}>
              <div style={S.fieldsRow}>
                <div style={S.fieldBlock}>
                  <label htmlFor="nb-customer-name" style={S.fieldLabel}>
                    Customer Name
                  </label>
                  <input
                    id="nb-customer-name"
                    type="text"
                    required
                    className="nb-cust-input"
                    placeholder="Enter name"
                    style={{ ...S.input, ...(nameError ? { borderColor: "#C0392B" } : {}) }}
                    value={customerName}
                    onChange={(e: FieldChangeEvent) => setCustomerName(e.currentTarget.value)}
                    onBlur={() => setNameTouched(true)}
                  />
                  {nameError && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{nameError}</span>
                  )}
                </div>
                <div style={S.fieldBlock}>
                  <label htmlFor="nb-customer-email" style={S.fieldLabel}>
                    Customer Email
                  </label>
                  <input
                    id="nb-customer-email"
                    type="email"
                    required
                    className="nb-cust-input"
                    placeholder="Enter email"
                    style={{ ...S.input, ...(emailError ? { borderColor: "#C0392B" } : {}) }}
                    value={customerEmail}
                    onChange={(e: FieldChangeEvent) => setCustomerEmail(e.currentTarget.value)}
                    onBlur={() => setEmailTouched(true)}
                  />
                  {emailError && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{emailError}</span>
                  )}
                </div>
                <div style={S.fieldBlock}>
                  <label htmlFor="nb-customer-phone" style={S.fieldLabel}>
                    Phone number
                  </label>
                  <input
                    id="nb-customer-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="nb-cust-input"
                    placeholder="Enter 10-digit phone number"
                    style={S.input}
                    value={customerPhone}
                    onChange={(e: FieldChangeEvent) =>
                      setCustomerPhone(
                        e.currentTarget.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    onBlur={() => setPhoneTouched(true)}
                  />
                  {phoneError && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{phoneError}</span>
                  )}
                </div>
              </div>

              {noSelectionError && (
                <p role="alert" style={{ fontFamily: "Inter", fontSize: "13px", color: "#C0392B", margin: 0 }}>
                  {noSelectionError}
                </p>
              )}

              {createError && (
                <p style={{ fontFamily: "Inter", fontSize: "13px", color: "#C0392B", margin: 0 }}>
                  {createError}
                </p>
              )}

              {submitAttempted && (nameError || emailError) && (
                <p style={{ fontFamily: "Inter", fontSize: "13px", color: "#C0392B", margin: 0 }}>
                  Please fix the highlighted fields before creating this booking.
                </p>
              )}

              {incompleteBundleTitles.length > 0 && submitAttempted && (
                <p style={{ fontFamily: "Inter", fontSize: "13px", color: "#C0392B", margin: 0 }}>
                  {incompleteBundleTitles.length === 1
                    ? `${incompleteBundleTitles[0]} doesn't have all its bundle sessions queued yet.`
                    : `These bundles don't have all their sessions queued yet: ${incompleteBundleTitles.join(", ")}.`}
                </p>
              )}
            </div>

            {}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "14px" }}>
              <div style={{ ...saveWrapperStyle(), width: "auto", minWidth: "143px" }}>
                <button
                  type="button"
                  style={{
                    ...saveButtonStyle(isCreatingBooking),
                    width: "auto",
                    minWidth: "139px",
                    padding: "7px 10px",
                    whiteSpace: "nowrap",
                  }}
                  disabled={isCreatingBooking}
                  onClick={handleCreateBooking}
                >
                  {createBookingCount > 1
                    ? `Create ${createBookingCount} bookings`
                    : "Create Booking"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </s-page>
  );
}

export const shouldRevalidate = () => false;

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};