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
import { listBookableProductsML } from "../models/bookableProduct.server";
import {
  computeSlotsForDateML,
  getAvailableDatesInMonthML,
  getAvailableFullDayDatesInMonthML,
  getAvailableMultiDayNightsInMonthML,
  type TimeSlot,
} from "../models/slotAvailability.server";
import { resolveBookingContextByIdML } from "../models/booking-context.server";
import {
  createManualBookingML,
  sendManualBookingEmailsInBackgroundML,
  getBookedCountsInRangeML,
  getBookedNightCountsInRangeML,
} from "../models/booking.server";
import { listEnabledLocationsML } from "../models/bookingLocation.server";
import { listCustomFieldsML, toPublicFieldML } from "../models/customBookingField.server";
import { formatDateDisplayML, formatTimeRangeDisplayML } from "../utils/format";
import { localDayRangeUtcML, localMonthRangeUtcML } from "../utils/timezones";
import {
  BLUE_ML,
  BORDER_ML,
  LICENSE_BORDER_ML,
  TEXT_DARK_ML,
  TEXT_MUTED_ML,
  stylesML as settingsStyles,
  saveWrapperStyleML,
  saveButtonStyleML,
} from "../components/SettingsUI";

const WEEKDAY_HEADERS_ML = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const CAL_BLUE_ML = "#0060E6";
const BLUE_TINT_ML = "rgba(0, 96, 230, 0.08)";
const NAV_ARROW_ML = "#4C4C4C";
const DISABLED_DATE_ML = "#ADADAD";
const YEAR_PICKER_SPAN_ML = 5;

const CAL_TEXT_ML = "#1A1A1A";
const PLACEHOLDER_ML = "#6E6E6E";

const S = {
  outerCard: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
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
    color: TEXT_DARK_ML,
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
    color: BLUE_ML,
    textDecoration: "none",
  } as React.CSSProperties,
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
  } as React.CSSProperties,
  cardHeading: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    color: TEXT_DARK_ML,
  } as React.CSSProperties,
  innerCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "12px",
    padding: "10px 10px 13px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
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
    border: `1px solid ${BORDER_ML}`,
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
    color: TEXT_DARK_ML,
  } as React.CSSProperties,
  input: {
    width: "100%",
    boxSizing: "border-box",
    height: "34px",
    padding: "5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontSize: "14px",
    color: TEXT_DARK_ML,
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
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontSize: "14px",
    color: TEXT_DARK_ML,
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
    color: TEXT_DARK_ML,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  qtyNoteHint: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED_ML,
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
    border: `1px solid ${LICENSE_BORDER_ML}`,
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
    color: TEXT_DARK_ML,
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
    minWidth: "min(250px, 100%)",
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
    background: BLUE_TINT_ML,
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
    color: CAL_TEXT_ML,
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
    color: CAL_TEXT_ML,
    textAlign: "center",
  } as React.CSSProperties,
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    rowGap: "8px",
  } as React.CSSProperties,
  dayBtn: (
    selectedML: boolean,
    inRangeML: boolean,
    availableML: boolean,
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
    cursor: availableML ? "pointer" : "not-allowed",
    background: selectedML
      ? CAL_BLUE_ML
      : inRangeML
        ? "rgba(0, 96, 230, 0.12)"
        : "transparent",
    color: selectedML ? "#FFFFFF" : availableML ? CAL_TEXT_ML : DISABLED_DATE_ML,
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
    fontSize: "12px",
    lineHeight: "18px",
    color: TEXT_MUTED_ML,
    margin: 0,
  } as React.CSSProperties,
  timeSlotBtn: (activeML: boolean, disabledML: boolean): React.CSSProperties => ({
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flex: "none",
    padding: "12px 24px",
    width: "100%",
    minHeight: "45px",
    border: `1px solid ${CAL_BLUE_ML}`,
    borderRadius: "28px",
    background: activeML ? CAL_BLUE_ML : "#FFFFFF",
    color: activeML ? "#FFFFFF" : CAL_TEXT_ML,
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "21px",
    whiteSpace: "nowrap",
    cursor: disabledML ? "not-allowed" : "pointer",
    opacity: disabledML ? 0.5 : 1,
  }),
  chip: (toneML: "info" | "ok"): React.CSSProperties => ({
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "16px",
    padding: "5px 10px",
    borderRadius: "999px",
    background: toneML === "ok" ? "#e3f6e8" : BLUE_TINT_ML,
  }),
  chipText: (toneML: "info" | "ok"): React.CSSProperties => ({
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 600,
    color: toneML === "ok" ? "#1a7f37" : CAL_BLUE_ML,
  }),
};

type FieldChangeEvent = { currentTarget: { value: string } };

const MONTH_NAMES_ML = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT_ML = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function CollapseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M0 20L10 10L20 20M20 0L9.998 10L0 0"
        stroke={BLUE_ML}
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
        stroke={BLUE_ML}
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
      <path d="M5 10H15" stroke={BLUE_ML} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusStepIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 5V15M15 10H5" stroke={BLUE_ML} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function splitFieldLabelML(labelML: string): { title: string; hint: string | null } {
  const matchML = /^(.*?)\s*(\([^()]+\))\s*$/.exec(labelML.trim());
  if (matchML && matchML[1]) return { title: matchML[1], hint: matchML[2] };
  return { title: labelML, hint: null };
}

function NavChevron({
  direction: directionML,
  color: colorML,
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
        transform: directionML === "right" ? "scaleX(-1)" : undefined,
      }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32.4806 34.9941C32.8398 34.6529 32.8398 34.0998 32.4806 33.7586L27.4706 29L32.4806 24.2414C32.8398 23.9002 32.8398 23.3471 32.4806 23.0059C32.1214 22.6647 31.539 22.6647 31.1798 23.0059L25.5194 28.3822C25.1602 28.7234 25.1602 29.2766 25.5194 29.6178L31.1798 34.9941C31.539 35.3353 32.1214 35.3353 32.4806 34.9941Z"
        fill={colorML}
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
        fill={TEXT_DARK_ML}
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

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const allProductsML = await listBookableProductsML(sessionML.shop);
  const enabledProductsML = allProductsML.filter((pML) => pML.isEnabled);
  const [locationsML, customFieldsML] = await Promise.all([
    listEnabledLocationsML(sessionML.shop),
    listCustomFieldsML(sessionML.shop),
  ]);
  return {
    products: enabledProductsML.map((pML) => ({
      id: pML.id,
      title: pML.productTitle,
      bookingType: pML.bookingType,
      minNights: pML.minNights,
      maxNights: pML.maxNights,
      bundleSessionCount: pML.bundleSessionCount,
      bundleValidityDays: pML.bundleValidityDays,
    })),
    locations: locationsML.map((lML) => ({ id: lML.id, name: lML.name })),
    customFields: customFieldsML.map(toPublicFieldML),
  };
};

async function resolveBlackoutDatesAndSettingsML(
  shopML: string,
  bookableProductIdML: string,
  locationIdML?: string | null,
) {
  const contextML = await resolveBookingContextByIdML(shopML, bookableProductIdML, locationIdML);
  if (!contextML) return null;
  return {
    bookingType: contextML.bookingType,
    effectiveSettings: contextML.effectiveSettings,
    blackoutDates: contextML.blackoutDates,
    location: contextML.location,
  };
}

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as
    | "loadAvailability"
    | "loadSlots"
    | "createBooking"
    | "";

  if (intentML === "loadAvailability") {
    const bookableProductIdML = String(formDataML.get("bookableProductId") ?? "");
    const locationIdML = String(formDataML.get("locationId") ?? "") || null;
    const yearML = Number(formDataML.get("year"));
    const monthML = Number(formDataML.get("month"));
    if (!bookableProductIdML || !Number.isInteger(yearML) || !Number.isInteger(monthML)) {
      return { intent: intentML, ok: false as const, availableDates: [] as string[] };
    }

    const resolvedML = await resolveBlackoutDatesAndSettingsML(
      sessionML.shop,
      bookableProductIdML,
      locationIdML,
    );
    if (!resolvedML) {
      return { intent: intentML, ok: false as const, availableDates: [] as string[] };
    }

    const monthStartML = new Date(Date.UTC(yearML, monthML - 1, 1));
    const monthEndML = new Date(Date.UTC(yearML, monthML, 0, 23, 59, 59, 999));

    let availableDatesML: string[];
    if (resolvedML.bookingType === "FULL_DAY") {
      const bookedCountsML = await getBookedCountsInRangeML(
        sessionML.shop,
        bookableProductIdML,
        monthStartML,
        monthEndML,
        resolvedML.location?.id,
      );
      availableDatesML = getAvailableFullDayDatesInMonthML(
        resolvedML.effectiveSettings,
        yearML,
        monthML,
        resolvedML.blackoutDates,
        new Date(),
        bookedCountsML,
      );
    } else if (resolvedML.bookingType === "MULTI_DAY") {
      const bookedNightCountsML = await getBookedNightCountsInRangeML(
        sessionML.shop,
        bookableProductIdML,
        monthStartML,
        monthEndML,
        resolvedML.location?.id,
      );
      availableDatesML = getAvailableMultiDayNightsInMonthML(
        resolvedML.effectiveSettings,
        yearML,
        monthML,
        resolvedML.blackoutDates,
        new Date(),
        bookedNightCountsML,
      );
    } else {
      const localMonthML = localMonthRangeUtcML(
        yearML,
        monthML,
        resolvedML.location?.timezone ?? null,
      );
      const bookedCountsML = await getBookedCountsInRangeML(
        sessionML.shop,
        bookableProductIdML,
        localMonthML.start,
        localMonthML.end,
        resolvedML.location?.id,
      );
      availableDatesML = getAvailableDatesInMonthML(
        resolvedML.effectiveSettings,
        yearML,
        monthML,
        resolvedML.blackoutDates,
        new Date(),
        bookedCountsML,
        resolvedML.location?.timezone ?? null,
      );
    }

    return {
      intent: intentML,
      ok: true as const,
      availableDates: availableDatesML,
      dailyStartTime: resolvedML.effectiveSettings.dailyStartTime,
      dailyEndTime: resolvedML.effectiveSettings.dailyEndTime,
    };
  }

  if (intentML === "loadSlots") {
    const bookableProductIdML = String(formDataML.get("bookableProductId") ?? "");
    const locationIdML = String(formDataML.get("locationId") ?? "") || null;
    const dateML = String(formDataML.get("date") ?? "");
    if (!bookableProductIdML || !dateML) {
      return { intent: intentML, ok: false as const, slots: [] as TimeSlot[] };
    }

    const resolvedML = await resolveBlackoutDatesAndSettingsML(
      sessionML.shop,
      bookableProductIdML,
      locationIdML,
    );
    if (!resolvedML) {
      return { intent: intentML, ok: false as const, slots: [] as TimeSlot[] };
    }

    const { start: dayStartML, end: dayEndML } = localDayRangeUtcML(
      dateML,
      resolvedML.location?.timezone ?? null,
    );
    const bookedCountsML = await getBookedCountsInRangeML(
      sessionML.shop,
      bookableProductIdML,
      dayStartML,
      dayEndML,
      resolvedML.location?.id,
    );

    const slotsML = computeSlotsForDateML(
      resolvedML.effectiveSettings,
      dateML,
      resolvedML.blackoutDates,
      new Date(),
      bookedCountsML,
      resolvedML.location?.timezone ?? null,
    );

    return { intent: intentML, ok: true as const, slots: slotsML };
  }

  if (intentML === "createBooking") {
    const locationML = String(formDataML.get("location") ?? "") || null;
    const locationIdML = String(formDataML.get("locationId") ?? "") || null;
    const customerNameML = String(formDataML.get("customerName") ?? "");
    const customerEmailML = String(formDataML.get("customerEmail") ?? "") || null;
    const customerPhoneML = String(formDataML.get("customerPhone") ?? "") || null;

    let customFieldResponsesML: Record<string, string> = {};
    try {
      customFieldResponsesML = JSON.parse(
        String(formDataML.get("customFieldResponses") ?? "{}"),
      );
    } catch {
      customFieldResponsesML = {};
    }

    let slotsML: QueuedSlotInput[] = [];
    try {
      slotsML = JSON.parse(String(formDataML.get("slots") ?? "[]"));
    } catch {
      slotsML = [];
    }

    if (slotsML.length === 0) {
      return {
        intent: intentML,
        ok: false as const,
        error: "Add at least one date/time before creating a booking.",
      };
    }

    const groupIdML = slotsML.length > 1 ? crypto.randomUUID() : undefined;

    const resultsML: SlotResult[] = [];
    const createdBookingsML: {
      booking: Booking;
      productTitle: string;
      bookingType: BookingType;
    }[] = [];
    for (const slotML of slotsML) {
      const resultML = await createManualBookingML(sessionML.shop, {
        bookableProductId: slotML.bookableProductId,
        date: slotML.date,
        slotStart: slotML.slotStart,
        endDate: slotML.endDate ?? null,
        quantity: slotML.quantity,
        location: locationML,
        locationId: locationIdML,
        customerName: customerNameML,
        customerEmail: customerEmailML,
        customerPhone: customerPhoneML,
        customFieldResponses: customFieldResponsesML,
        groupId: groupIdML,
      });
      if (resultML.ok) {
        createdBookingsML.push({
          booking: resultML.booking,
          productTitle: resultML.productTitle,
          bookingType: resultML.bookingType,
        });
      }
      resultsML.push({
        bookableProductId: slotML.bookableProductId,
        date: slotML.date,
        slotStart: slotML.slotStart,
        ok: resultML.ok,
        error: resultML.ok ? undefined : resultML.error,
      });
    }

    sendManualBookingEmailsInBackgroundML(sessionML.shop, createdBookingsML);

    const createdCountML = resultsML.filter((rML) => rML.ok).length;
    const failedCountML = resultsML.length - createdCountML;

    return {
      intent: intentML,
      ok: failedCountML === 0,
      results: resultsML,
      createdCount: createdCountML,
      failedCount: failedCountML,
    };
  }

  return { intent: intentML, ok: false as const };
};

export default function NewBookingPage() {
  const { products: productsML, locations: locationsML, customFields: customFieldsML } = useLoaderData<typeof loader>();
  const availabilityFetcherML = useFetcher<typeof action>();
  const secondMonthFetcherML = useFetcher<typeof action>();
  const slotsFetcherML = useFetcher<typeof action>();
  const createFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();

  const todayML = new Date();

  const [bookableProductIdML, setBookableProductIdML] = useState("");
  const selectedProductML = productsML.find((pML) => pML.id === bookableProductIdML);
  const selectedBookingTypeML = selectedProductML?.bookingType ?? "SLOT";
  const [viewYearML, setViewYearML] = useState(todayML.getUTCFullYear());
  const [viewMonthML, setViewMonthML] = useState(todayML.getUTCMonth() + 1);
  const [dateML, setDateML] = useState("");
  const [checkoutDateML, setCheckoutDateML] = useState("");
  const [selectedSlotML, setSelectedSlotML] = useState<TimeSlot | null>(null);
  const [quantityML, setQuantityML] = useState(1);
  const [locationIdML, setLocationIdML] = useState("");
  const readyForCalendarML =
    Boolean(bookableProductIdML) && (locationsML.length === 0 || Boolean(locationIdML));
  const [customFieldValuesML, setCustomFieldValuesML] = useState<
    Record<string, string>
  >({});
  const [queuedSlotsML, setQueuedSlotsML] = useState<QueuedEntry[]>([]);
  const submittedRefML = useRef<QueuedEntry[]>([]);
  const [customerNameML, setCustomerNameML] = useState("");
  const [nameTouchedML, setNameTouchedML] = useState(false);
  const [customerEmailML, setCustomerEmailML] = useState("");
  const [emailTouchedML, setEmailTouchedML] = useState(false);
  const [customerPhoneML, setCustomerPhoneML] = useState("");
  const [phoneTouchedML, setPhoneTouchedML] = useState(false);
  const [submitAttemptedML, setSubmitAttemptedML] = useState(false);

  const bundleSessionsQueuedML = queuedSlotsML.filter(
    (entryML) => entryML.bookableProductId === bookableProductIdML,
  );
  const bundleSessionCountML = selectedProductML?.bundleSessionCount ?? null;
  const bundleSessionsRemainingML =
    bundleSessionCountML !== null
      ? Math.max(0, bundleSessionCountML - bundleSessionsQueuedML.length)
      : null;
  const bundleCompleteML =
    bundleSessionCountML !== null && bundleSessionsRemainingML === 0;

  const bundleValidityDaysML =
    selectedBookingTypeML === "BUNDLE"
      ? (selectedProductML?.bundleValidityDays ?? null)
      : null;
  const bundleQueuedDatesML = bundleSessionsQueuedML.map((entryML) => entryML.date).sort();
  const bundleWindowStartML = bundleValidityDaysML ? (bundleQueuedDatesML[0] ?? null) : null;
  const addDaysToIsoML = (isoML: string, daysML: number) => {
    const dML = new Date(`${isoML}T00:00:00.000Z`);
    dML.setUTCDate(dML.getUTCDate() + daysML);
    return dML.toISOString().slice(0, 10);
  };
  const bundleValidityDeadlineML =
    bundleValidityDaysML && bundleWindowStartML
      ? addDaysToIsoML(bundleWindowStartML, bundleValidityDaysML)
      : null;

  const availableDatesML: string[] =
    availabilityFetcherML.data?.intent === "loadAvailability" &&
    availabilityFetcherML.data.ok
      ? availabilityFetcherML.data.availableDates
      : [];

  const fullDayStartTimeML: string =
    availabilityFetcherML.data?.intent === "loadAvailability" &&
    availabilityFetcherML.data.ok
      ? availabilityFetcherML.data.dailyStartTime
      : "00:00";

  const fullDayEndTimeML: string =
    availabilityFetcherML.data?.intent === "loadAvailability" &&
    availabilityFetcherML.data.ok
      ? availabilityFetcherML.data.dailyEndTime
      : "23:59";

  const isTwoMonthTypeML = true;

  const todayMonthIndexML = todayML.getUTCFullYear() * 12 + todayML.getUTCMonth();

  const yearPickerOptionsML = (shownYearML: number) => {
    const thisYearML = todayML.getUTCFullYear();
    const fromML = Math.min(thisYearML, shownYearML);
    const toML = Math.max(thisYearML + YEAR_PICKER_SPAN_ML - 1, shownYearML);
    const optionsML: number[] = [];
    for (let yML = fromML; yML <= toML; yML += 1) optionsML.push(yML);
    return optionsML;
  };

  const jumpToYearML = (yearML: number, shownMonthML: number, offsetML: number) => {
    const targetML = Math.max(
      yearML * 12 + (shownMonthML - 1),
      todayMonthIndexML + offsetML,
    );
    const indexML = targetML - offsetML;
    setViewYearML(Math.floor(indexML / 12));
    setViewMonthML((indexML % 12) + 1);
  };

  let secondYearML = viewYearML;
  let secondMonthML = viewMonthML + 1;
  if (secondMonthML > 12) {
    secondMonthML = 1;
    secondYearML += 1;
  }

  const secondMonthDatesML: string[] =
    secondMonthFetcherML.data?.intent === "loadAvailability" &&
    secondMonthFetcherML.data.ok
      ? secondMonthFetcherML.data.availableDates
      : [];

  const slotsML: TimeSlot[] =
    slotsFetcherML.data?.intent === "loadSlots" && slotsFetcherML.data.ok
      ? slotsFetcherML.data.slots
      : [];

  const createResultML =
    createFetcherML.data?.intent === "createBooking" ? createFetcherML.data : null;
  const createErrorML =
    createResultML && "error" in createResultML ? createResultML.error : null;

  const quantityLockedML =
    selectedBookingTypeML === "BUNDLE" && bundleSessionsQueuedML.length > 0;

  const maxQuantityML = Math.max(
    1,
    typeof selectedSlotML?.remainingCapacity === "number"
      ? selectedSlotML.remainingCapacity
      : 1,
  );

  const loadAvailabilityML = (productIdML: string, yearML: number, monthML: number) => {
    if (!productIdML) return;
    availabilityFetcherML.submit(
      {
        intent: "loadAvailability",
        bookableProductId: productIdML,
        locationId: locationIdML,
        year: String(yearML),
        month: String(monthML),
      },
      { method: "POST" },
    );
  };

  const loadSecondMonthAvailabilityML = (
    productIdML: string,
    yearML: number,
    monthML: number,
  ) => {
    if (!productIdML) return;
    secondMonthFetcherML.submit(
      {
        intent: "loadAvailability",
        bookableProductId: productIdML,
        locationId: locationIdML,
        year: String(yearML),
        month: String(monthML),
      },
      { method: "POST" },
    );
  };

  useEffect(() => {
    setDateML("");
    setCheckoutDateML("");
    setCheckoutErrorML(null);
    setSelectedSlotML(null);
    if (!readyForCalendarML) return;
    loadAvailabilityML(bookableProductIdML, viewYearML, viewMonthML);
    if (isTwoMonthTypeML) {
      loadSecondMonthAvailabilityML(bookableProductIdML, secondYearML, secondMonthML);
    }
  }, [bookableProductIdML, viewYearML, viewMonthML, locationIdML, isTwoMonthTypeML, readyForCalendarML]);

  useEffect(() => {
    if (selectedSlotML) {
      setQuantityML(1);
    }
  }, [selectedSlotML]);

  useEffect(() => {
    if (!dateML || selectedBookingTypeML !== "SLOT") return;
    setSelectedSlotML(null);
    slotsFetcherML.submit(
      { intent: "loadSlots", bookableProductId: bookableProductIdML, locationId: locationIdML, date: dateML },
      { method: "POST" },
    );
  }, [locationIdML]);

  useEffect(() => {
    if (createFetcherML.data?.intent !== "createBooking") return;
    const resultML = createFetcherML.data;
    if (!("results" in resultML) || !resultML.results) return;

    const resultsML = resultML.results;
    const createdCountML = resultML.createdCount ?? 0;
    const failedCountML = resultML.failedCount ?? 0;

    shopifyML.toast.show(
      failedCountML > 0
        ? `Created ${createdCountML} of ${createdCountML + failedCountML} booking(s)`
        : `Created ${createdCountML} booking(s)`,
    );

    setDateML("");
    setCheckoutDateML("");
    setSelectedSlotML(null);

    if (failedCountML === 0) {
      setQueuedSlotsML([]);
      setCustomFieldValuesML({});
      setCustomerNameML("");
      setNameTouchedML(false);
      setCustomerEmailML("");
      setEmailTouchedML(false);
      setCustomerPhoneML("");
      setPhoneTouchedML(false);
      setSubmitAttemptedML(false);
    } else {
      setQueuedSlotsML(
        submittedRefML.current
          .map((entryML) => {
            const matchML = resultsML.find(
              (rML) =>
                rML.bookableProductId === entryML.bookableProductId &&
                rML.date === entryML.date &&
                rML.slotStart === entryML.slot.start,
            );
            if (!matchML) return entryML;
            return matchML.ok ? null : { ...entryML, error: matchML.error };
          })
          .filter((entryML): entryML is QueuedEntry => entryML !== null),
      );
    }
    loadAvailabilityML(bookableProductIdML, viewYearML, viewMonthML);
    if (isTwoMonthTypeML) {
      loadSecondMonthAvailabilityML(bookableProductIdML, secondYearML, secondMonthML);
    }
    if (dateML) {
      slotsFetcherML.submit(
        { intent: "loadSlots", bookableProductId: bookableProductIdML, locationId: locationIdML, date: dateML },
        { method: "POST" },
      );
    }
  }, [createFetcherML.data, shopifyML]);

  const goToMonthML = (deltaML: number) => {
    let newMonthML = viewMonthML + deltaML;
    let newYearML = viewYearML;
    if (newMonthML < 1) {
      newMonthML = 12;
      newYearML -= 1;
    } else if (newMonthML > 12) {
      newMonthML = 1;
      newYearML += 1;
    }
    setViewMonthML(newMonthML);
    setViewYearML(newYearML);
  };

  const nightsBetweenML = (checkinML: string, checkoutML: string): number =>
    Math.round(
      (new Date(`${checkoutML}T00:00:00.000Z`).getTime() -
        new Date(`${checkinML}T00:00:00.000Z`).getTime()) /
        86400000,
    );

  const multiDayMinNightsML = selectedProductML?.minNights ?? null;
  const multiDayMaxNightsML = selectedProductML?.maxNights ?? null;

  const stayLengthErrorML = (checkinML: string, checkoutML: string): string | null => {
    const nightsML = nightsBetweenML(checkinML, checkoutML);
    if (multiDayMinNightsML !== null && nightsML < multiDayMinNightsML) {
      return `Minimum stay is ${multiDayMinNightsML} night${multiDayMinNightsML === 1 ? "" : "s"}.`;
    }
    if (multiDayMaxNightsML !== null && nightsML > multiDayMaxNightsML) {
      return `Maximum stay is ${multiDayMaxNightsML} night${multiDayMaxNightsML === 1 ? "" : "s"}.`;
    }
    return null;
  };

  const [checkoutErrorML, setCheckoutErrorML] = useState<string | null>(null);

  const selectDateML = (dateStrML: string) => {
    if (selectedBookingTypeML === "MULTI_DAY") {
      if (!dateML || checkoutDateML || dateStrML <= dateML) {
        setDateML(dateStrML);
        setCheckoutDateML("");
        setCheckoutErrorML(null);
        setSelectedSlotML(null);
        return;
      }
      const errorML = stayLengthErrorML(dateML, dateStrML);
      if (errorML) {
        setCheckoutErrorML(errorML);
        setCheckoutDateML("");
        setSelectedSlotML(null);
        return;
      }
      setCheckoutErrorML(null);
      setCheckoutDateML(dateStrML);
      setSelectedSlotML({
        start: "00:00",
        end: "00:00",
        startsAt: `${dateML}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
      return;
    }

    setDateML(dateStrML);
    setCheckoutDateML("");
    setCheckoutErrorML(null);
    if (selectedBookingTypeML === "FULL_DAY") {
      setSelectedSlotML({
        start: fullDayStartTimeML,
        end: fullDayEndTimeML,
        startsAt: `${dateStrML}T00:00:00.000Z`,
        available: true,
        remainingCapacity: null,
      } as TimeSlot);
      return;
    }
    setSelectedSlotML(null);
    slotsFetcherML.submit(
      { intent: "loadSlots", bookableProductId: bookableProductIdML, locationId: locationIdML, date: dateStrML },
      { method: "POST" },
    );
  };

  const handleChangeMultiDayDatesML = () => {
    setDateML("");
    setCheckoutDateML("");
    setCheckoutErrorML(null);
    setSelectedSlotML(null);
  };

  const isValidEmailML = (valueML: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueML);

  const multiDayStayLengthMessageML = (() => {
    if (selectedBookingTypeML !== "MULTI_DAY") return null;
    const minML = multiDayMinNightsML;
    const maxML = multiDayMaxNightsML;
    if (minML !== null && maxML !== null) {
      return `Min Days: ${minML}, Max Days: ${maxML}`;
    }
    if (minML !== null) return `Min Days: ${minML}`;
    if (maxML !== null) return `Max Days: ${maxML}`;
    return null;
  })();

  const nameErrorML =
    (nameTouchedML || submitAttemptedML) && !customerNameML.trim()
      ? "Name is required"
      : undefined;

  const emailErrorML =
    (emailTouchedML || submitAttemptedML) && !customerEmailML.trim()
      ? "Email is required"
      : (emailTouchedML || submitAttemptedML) &&
          customerEmailML !== "" &&
          !isValidEmailML(customerEmailML)
        ? "Please enter a valid email address"
        : undefined;

  const phoneErrorML =
    (phoneTouchedML || submitAttemptedML) &&
    customerPhoneML !== "" &&
    customerPhoneML.length !== 10
      ? "Phone number must be exactly 10 digits"
      : undefined;

  const currentEntryML: QueuedEntry | null = (() => {
    if (!dateML || !selectedSlotML) return null;
    if (selectedBookingTypeML === "MULTI_DAY" && !checkoutDateML) return null;
    const alreadyQueuedML = queuedSlotsML.some(
      (entryML) =>
        entryML.bookableProductId === bookableProductIdML &&
        entryML.date === dateML &&
        entryML.slot.startsAt === selectedSlotML.startsAt,
    );
    if (alreadyQueuedML) return null;
    return {
      bookableProductId: bookableProductIdML,
      productTitle: selectedProductML?.title ?? "",
      date: dateML,
      slot: selectedSlotML,
      endDate: selectedBookingTypeML === "MULTI_DAY" ? checkoutDateML : null,
      quantity:
        selectedBookingTypeML === "BUNDLE" && bundleSessionsQueuedML.length > 0
          ? bundleSessionsQueuedML[0].quantity
          : quantityML,
    };
  })();

  const submissionSlotsML: QueuedEntry[] = currentEntryML
    ? [...queuedSlotsML, currentEntryML]
    : queuedSlotsML;

  const hasSelectionML = submissionSlotsML.length > 0;

  const createBookingCountML =
    submissionSlotsML.filter(
      (entryML) =>
        productsML.find((pML) => pML.id === entryML.bookableProductId)?.bookingType !==
        "BUNDLE",
    ).length +
    new Set(
      submissionSlotsML
        .filter(
          (entryML) =>
            productsML.find((pML) => pML.id === entryML.bookableProductId)
              ?.bookingType === "BUNDLE",
        )
        .map((entryML) => entryML.bookableProductId),
    ).size;

  const productErrorML =
    submitAttemptedML && !bookableProductIdML ? "Select a product" : undefined;
  const locationErrorML =
    submitAttemptedML && locationsML.length > 0 && !locationIdML
      ? "Select a location"
      : undefined;

  const noSelectionErrorML =
    submitAttemptedML && submissionSlotsML.length === 0
      ? selectedBookingTypeML === "MULTI_DAY"
        ? "Select check-in and check-out dates first."
        : "Select a date and time first."
      : undefined;

  const needsNextSlotML =
    !!selectedSlotML &&
    selectedBookingTypeML === "BUNDLE" &&
    bundleSessionCountML !== null &&
    bundleSessionsQueuedML.length + 1 < bundleSessionCountML;

  const isLastBundleSessionML =
    !!selectedSlotML &&
    selectedBookingTypeML === "BUNDLE" &&
    bundleSessionCountML !== null &&
    bundleSessionsQueuedML.length + 1 === bundleSessionCountML;

  const handleNextSlotML = () => {
    if (!currentEntryML) return;
    setQueuedSlotsML((prevML) => [...prevML, currentEntryML]);
    setDateML("");
    setCheckoutDateML("");
    setSelectedSlotML(null);
  };

  const handleRemoveQueuedML = (indexML: number) => {
    setQueuedSlotsML((prevML) => prevML.filter((_, iML) => iML !== indexML));
  };

  const incompleteBundleTitlesML = Array.from(
    new Set(submissionSlotsML.map((entryML) => entryML.bookableProductId)),
  )
    .map((idML) => {
      const productML = productsML.find((pML) => pML.id === idML);
      if (!productML || productML.bookingType !== "BUNDLE" || productML.bundleSessionCount === null) {
        return null;
      }
      const queuedCountML = submissionSlotsML.filter(
        (entryML) => entryML.bookableProductId === idML,
      ).length;
      return queuedCountML !== productML.bundleSessionCount ? productML.title : null;
    })
    .filter((titleML): titleML is string => titleML !== null);

  const handleCreateBookingML = () => {
    setSubmitAttemptedML(true);
    setNameTouchedML(true);
    setEmailTouchedML(true);
    setPhoneTouchedML(true);

    if (
      !bookableProductIdML ||
      (locationsML.length > 0 && !locationIdML) ||
      submissionSlotsML.length === 0 ||
      incompleteBundleTitlesML.length > 0 ||
      !customerNameML.trim() ||
      !customerEmailML.trim() ||
      !isValidEmailML(customerEmailML) ||
      (customerPhoneML !== "" && customerPhoneML.length !== 10)
    ) {
      return;
    }

    const selectedLocationML = locationsML.find((lML) => lML.id === locationIdML);

    submittedRefML.current = submissionSlotsML;

    createFetcherML.submit(
      {
        intent: "createBooking",
        location: selectedLocationML?.name ?? "",
        locationId: selectedLocationML?.id ?? "",
        customFieldResponses: JSON.stringify(customFieldValuesML),
        slots: JSON.stringify(
          submissionSlotsML.map((entryML) => ({
            bookableProductId: entryML.bookableProductId,
            date: entryML.date,
            slotStart: entryML.slot.start,
            endDate: entryML.endDate ?? null,
            quantity: entryML.quantity,
          })),
        ),
        customerName: customerNameML,
        customerEmail: customerEmailML,
        customerPhone: customerPhoneML,
      },
      { method: "POST" },
    );
  };

  if (productsML.length === 0) {
    return (
      <s-page heading="New Booking" inlineSize="950px">
        <div style={S.card}>
          <p style={{ fontFamily: "Inter", fontSize: "14px", color: TEXT_MUTED_ML, margin: 0 }}>
            No products have booking enabled yet. Enable booking on a
            product first from the Products page.
          </p>
        </div>
      </s-page>
    );
  }

  const applyBundleDeadlineML = (datesML: string[]) =>
    selectedBookingTypeML === "BUNDLE" && bundleValidityDeadlineML
      ? datesML.filter(
          (dML) =>
            dML <= bundleValidityDeadlineML &&
            (!bundleWindowStartML || dML >= bundleWindowStartML),
        )
      : datesML;

  const availableSetML = new Set(applyBundleDeadlineML(availableDatesML));
  const secondAvailableSetML = new Set(applyBundleDeadlineML(secondMonthDatesML));
  const daysInMonthML = new Date(Date.UTC(viewYearML, viewMonthML, 0)).getUTCDate();
  const firstWeekdayML = new Date(Date.UTC(viewYearML, viewMonthML - 1, 1)).getUTCDay();
  const secondDaysInMonthML = new Date(
    Date.UTC(secondYearML, secondMonthML, 0),
  ).getUTCDate();
  const secondFirstWeekdayML = new Date(
    Date.UTC(secondYearML, secondMonthML - 1, 1),
  ).getUTCDay();
  const isLoadingAvailabilityML = availabilityFetcherML.state !== "idle";
  const isLoadingSecondMonthML = secondMonthFetcherML.state !== "idle";
  const isLoadingSlotsML = slotsFetcherML.state !== "idle";
  const isCreatingBookingML = createFetcherML.state !== "idle";

  const renderMonthGridML = (
    yearML: number,
    monthML: number,
    monthDaysInMonthML: number,
    monthFirstWeekdayML: number,
    monthAvailableSetML: Set<string>,
  ) => (
    <div>
      <div style={S.weekdayRow}>
        {WEEKDAY_HEADERS_ML.map((labelML) => (
          <span key={`wd-${yearML}-${monthML}-${labelML}`} style={S.weekdayLabel}>
            {labelML}
          </span>
        ))}
      </div>
      <div style={S.dayGrid}>
        {Array.from({ length: monthFirstWeekdayML }).map((_, iML) => (
          <span key={`blank-${yearML}-${monthML}-${iML}`} />
        ))}
        {Array.from({ length: monthDaysInMonthML }).map((_, iML) => {
          const dayML = iML + 1;
          const dateStrML = `${yearML}-${String(monthML).padStart(2, "0")}-${String(dayML).padStart(2, "0")}`;
          const isPickingCheckoutML =
            selectedBookingTypeML === "MULTI_DAY" && !!dateML && !checkoutDateML;
          const isAvailableML = isPickingCheckoutML
            ? dateStrML > dateML
            : monthAvailableSetML.has(dateStrML) && !bundleCompleteML;
          const isSelectedML =
            dateStrML === dateML ||
            (selectedBookingTypeML === "MULTI_DAY" && dateStrML === checkoutDateML);
          const isInRangeML =
            selectedBookingTypeML === "MULTI_DAY" &&
            !!dateML &&
            !!checkoutDateML &&
            dateStrML > dateML &&
            dateStrML < checkoutDateML;
          return (
            <button
              key={dateStrML}
              type="button"
              className="nb-day"
              disabled={!isAvailableML}
              aria-pressed={isSelectedML}
              aria-label={`${dayML} ${MONTH_NAMES_ML[monthML - 1]} ${yearML}`}
              onClick={() => isAvailableML && selectDateML(dateStrML)}
              style={S.dayBtn(isSelectedML, isInRangeML, isAvailableML)}
            >
              {dayML}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMonthPaneML = (
    yearML: number,
    monthML: number,
    monthDaysInMonthML: number,
    monthFirstWeekdayML: number,
    monthAvailableSetML: Set<string>,
    isLoadingML: boolean,
    hasAnyAvailabilityML: boolean,
    offsetML: number,
  ) => {
    const paneLabelML = `${MONTH_SHORT_ML[monthML - 1]} ${yearML}`;
    return (
      <div
        key={`pane-${yearML}-${monthML}`}
        className="nb-month-pane"
        style={S.monthPane}
      >
        <div style={S.monthHeader}>
          <button
            type="button"
            className="nb-nav"
            style={S.navBtn}
            onClick={() => goToMonthML(-1)}
            aria-label="Previous month"
          >
            <NavChevron direction="left" color={NAV_ARROW_ML} />
          </button>

          <label className="nb-month-picker" style={S.monthPicker}>
            <span style={S.monthPickerText}>{paneLabelML}</span>
            <DropdownChevron />
            <select
              style={S.monthPickerSelect}
              aria-label={`Select year, currently ${yearML}`}
              value={yearML}
              onChange={(eML: FieldChangeEvent) =>
                jumpToYearML(Number(eML.currentTarget.value), monthML, offsetML)
              }
            >
              {yearPickerOptionsML(yearML).map((optionYearML) => (
                <option key={optionYearML} value={optionYearML}>
                  {optionYearML}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="nb-nav"
            style={{ ...S.navBtn, ...S.navBtnNext }}
            onClick={() => goToMonthML(1)}
            aria-label="Next month"
          >
            <NavChevron direction="right" color={CAL_BLUE_ML} />
          </button>
        </div>

        {isLoadingML ? (
          <p style={{ fontFamily: "Inter", fontSize: "12px", color: TEXT_MUTED_ML, margin: 0 }}>
            Loading availability…
          </p>
        ) : (
          renderMonthGridML(
            yearML,
            monthML,
            monthDaysInMonthML,
            monthFirstWeekdayML,
            monthAvailableSetML,
          )
        )}
        {!isLoadingML && !hasAnyAvailabilityML && (
          <p style={{ fontFamily: "Inter", fontSize: "12px", color: TEXT_MUTED_ML, margin: "12px 0 0" }}>
            {bookableProductIdML
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
            background: ${BLUE_TINT_ML} !important;
          }
          .nb-slot:not(:disabled):not([aria-pressed="true"]):hover {
            background: ${BLUE_TINT_ML} !important;
          }
          .nb-nav:hover {
            background: rgba(0, 96, 230, 0.14) !important;
          }
          .nb-day:focus-visible,
          .nb-slot:focus-visible,
          .nb-nav:focus-visible {
            outline: 2px solid ${CAL_BLUE_ML};
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
            outline: 2px solid ${CAL_BLUE_ML};
            outline-offset: 1px;
          }
          .nb-month-picker:focus-within {
            outline: 2px solid ${CAL_BLUE_ML};
            outline-offset: 2px;
            border-radius: 4px;
          }
        `}</style>

        <div style={S.headerRow}>
          <span style={S.headerTitle}>Add New Booking</span>
          <div style={S.headerActions}>
            <Link to="/app/bookings" style={S.iconButton} aria-label="Back to bookings">
              <CollapseIcon />
            </Link>
          </div>
        </div>

        <div style={S.innerCard}>
          <div className="eb-touch" style={S.fieldsRow}>
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
                    ...(!bookableProductIdML ? { color: PLACEHOLDER_ML } : {}),
                    ...(productErrorML ? { borderColor: "#C0392B" } : {}),
                  }}
                  value={bookableProductIdML}
                  onChange={(eML: FieldChangeEvent) =>
                    setBookableProductIdML(eML.currentTarget.value)
                  }
                >
                  <option value="" disabled>
                    Select product
                  </option>
                  {productsML.map((pML) => (
                    <option key={pML.id} value={pML.id}>
                      {pML.title}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
              {productErrorML && (
                <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{productErrorML}</span>
              )}
            </div>

            {locationsML.length > 0 && (
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
                      ...(!locationIdML ? { color: PLACEHOLDER_ML } : {}),
                      ...(locationErrorML ? { borderColor: "#C0392B" } : {}),
                    }}
                    value={locationIdML}
                    onChange={(eML: FieldChangeEvent) =>
                      setLocationIdML(eML.currentTarget.value)
                    }
                  >
                    <option value="" disabled>
                      Select location
                    </option>
                    {locationsML.map((lML) => (
                      <option key={lML.id} value={lML.id}>
                        {lML.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
                {locationErrorML && (
                  <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{locationErrorML}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {readyForCalendarML && (
        <div style={S.dateTimeCard}>
          {selectedBookingTypeML === "MULTI_DAY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={S.cardHeading}>Select your preferred date & time</span>
              {multiDayStayLengthMessageML && (
                <span style={{ fontFamily: "Inter", fontSize: "12px", color: TEXT_MUTED_ML }}>
                  {multiDayStayLengthMessageML}
                </span>
              )}
            </div>
          )}
          {selectedBookingTypeML === "BUNDLE" && bundleSessionCountML !== null && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={S.cardHeading}>Select your preferred date & time</span>
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: "12px",
                  color: bundleCompleteML ? "#1a7f37" : TEXT_MUTED_ML,
                }}
              >
                {bundleCompleteML
                  ? `All ${bundleSessionCountML} session(s) added for this bundle.`
                  : `Session ${bundleSessionsQueuedML.length + 1} of ${bundleSessionCountML}` +
                    (bundleValidityDeadlineML
                      ? ` — all sessions must be booked by ${formatDateDisplayML(bundleValidityDeadlineML)}`
                      : bundleValidityDaysML
                        ? ` — all sessions within ${bundleValidityDaysML} days of the first session`
                        : "")}
              </span>
            </div>
          )}

          <div style={S.calendarLayout}>
            <div style={S.calendarColumn}>
              <div style={S.monthsRow}>
                {renderMonthPaneML(
                  viewYearML,
                  viewMonthML,
                  daysInMonthML,
                  firstWeekdayML,
                  availableSetML,
                  isLoadingAvailabilityML,
                  availableDatesML.length > 0,
                  0,
                )}
                {isTwoMonthTypeML &&
                  renderMonthPaneML(
                    secondYearML,
                    secondMonthML,
                    secondDaysInMonthML,
                    secondFirstWeekdayML,
                    secondAvailableSetML,
                    isLoadingSecondMonthML,
                    secondMonthDatesML.length > 0,
                    1,
                  )}
              </div>

              {selectedBookingTypeML === "FULL_DAY" && dateML && (
                <div style={S.chip("info")}>
                  <span style={S.chipText("info")}>
                    {formatTimeRangeDisplayML(fullDayStartTimeML, fullDayEndTimeML)}{" "}
                    {"\u2014"} {dateML}
                  </span>
                </div>
              )}
              {selectedBookingTypeML === "MULTI_DAY" && dateML && !checkoutDateML && (
                <div style={S.chip("info")}>
                  <span style={S.chipText("info")}>
                    Check-in {dateML}. Now pick a check-out date.
                  </span>
                </div>
              )}
              {selectedBookingTypeML === "MULTI_DAY" && checkoutErrorML && (
                <span
                  role="alert"
                  style={{
                    marginTop: "12px",
                    fontFamily: "Inter",
                    fontSize: "12px",
                    color: "#C0392B",
                  }}
                >
                  {checkoutErrorML}
                </span>
              )}
              {selectedBookingTypeML === "MULTI_DAY" && dateML && checkoutDateML && (
                <div style={S.chip("ok")}>
                  <span style={S.chipText("ok")}>
                    {dateML} → {checkoutDateML} ({nightsBetweenML(dateML, checkoutDateML)}{" "}
                    night{nightsBetweenML(dateML, checkoutDateML) === 1 ? "" : "s"})
                  </span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: BLUE_ML,
                      fontFamily: "Inter",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                    onClick={handleChangeMultiDayDatesML}
                  >
                    Change dates
                  </button>
                </div>
              )}
            </div>

            {(selectedBookingTypeML === "SLOT" ||
              selectedBookingTypeML === "BUNDLE") && (
              <div
                className="nb-slots-col"
                style={S.slotsColumn}
                role="group"
                aria-label={
                  selectedBookingTypeML === "BUNDLE" && bundleSessionCountML !== null
                    ? `Available times, session ${bundleSessionsQueuedML.length + 1} of ${bundleSessionCountML}`
                    : "Available times"
                }
              >
                {!dateML ? (
                  <p style={S.slotsHint}>Select a date to see available times.</p>
                ) : isLoadingSlotsML ? (
                  <p style={S.slotsHint}>Loading available times…</p>
                ) : slotsML.length === 0 ? (
                  <p style={S.slotsHint}>No slots at all on this date.</p>
                ) : (
                  slotsML.map((slotML) => {
                    const isActiveML = selectedSlotML?.startsAt === slotML.startsAt;
                    const extraML = !slotML.available
                      ? "Booked"
                      : typeof slotML.remainingCapacity === "number"
                        ? slotML.remainingCapacity === 1
                          ? "1 slot left"
                          : `${slotML.remainingCapacity} slots left`
                        : null;
                    return (
                      <button
                        key={slotML.startsAt}
                        type="button"
                        className="nb-slot"
                        style={S.timeSlotBtn(isActiveML, !slotML.available)}
                        disabled={!slotML.available}
                        aria-pressed={isActiveML}
                        onClick={() => {
                          if (slotML.available) setSelectedSlotML(slotML);
                        }}
                      >
                        <span>{formatTimeRangeDisplayML(slotML.start, slotML.end)}</span>
                        {extraML && (
                          <span style={{ fontSize: "12px", lineHeight: "15px" }}>
                            {extraML}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {(needsNextSlotML || isLastBundleSessionML) && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: "6px",
                  background: CAL_BLUE_ML,
                  color: "#fff",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontSize: "16px",
                  lineHeight: "19px",
                  padding: "10px 22px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
                onClick={handleNextSlotML}
              >
                {needsNextSlotML ? "Next slot" : "Done"}
              </button>
            </div>
          )}
        </div>
        )}

        {queuedSlotsML.length > 0 && (
          <div style={S.innerCard}>
            <span style={S.cardHeading}>Slots to book</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queuedSlotsML.map((entryML, indexML) => (
                <div
                  key={entryML.bookableProductId + entryML.date + entryML.slot.startsAt}
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: "14px", color: TEXT_DARK_ML }}>
                    <b>{entryML.productTitle}</b> —{" "}
                    {(() => {
                      const entryTypeML =
                        productsML.find((pML) => pML.id === entryML.bookableProductId)
                          ?.bookingType ?? "SLOT";
                      if (entryTypeML === "FULL_DAY") {
                        return `${entryML.date} \u00b7 ${formatTimeRangeDisplayML(entryML.slot.start, entryML.slot.end)}`;
                      }
                      if (entryTypeML === "MULTI_DAY") {
                        return `${entryML.date} \u2192 ${entryML.endDate ?? "—"}`;
                      }
                      return `${entryML.date} | ${formatTimeRangeDisplayML(entryML.slot.start, entryML.slot.end)}`;
                    })()}
                    {entryML.quantity > 1 ? ` × ${entryML.quantity}` : ""}
                  </span>
                  {entryML.error && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>
                      {entryML.error}
                    </span>
                  )}
                  <button
                    type="button"
                    style={{ border: "none", background: "transparent", color: BLUE_ML, fontFamily: "Inter", fontSize: "14px", cursor: isCreatingBookingML ? "default" : "pointer" }}
                    disabled={isCreatingBookingML}
                    onClick={() => handleRemoveQueuedML(indexML)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasSelectionML && (
          <>
            <div style={S.innerCard}>
              <div style={S.qtyNoteRow}>
                <div className="nb-qty-block" style={S.qtyBlock}>
                  <div style={S.qtyNoteLabelRow}>
                    <span style={S.qtyNoteLabel}>Quantity</span>
                    {selectedSlotML && !quantityLockedML && maxQuantityML <= 5 && (
                      <span style={S.qtyNoteHint}>(max {maxQuantityML})</span>
                    )}
                  </div>
                  {quantityLockedML ? (
                    <div
                      style={S.quantityBox}
                      title="Set on the first session of this bundle"
                    >
                      <span style={S.quantityValue}>
                        {bundleSessionsQueuedML[0].quantity}
                      </span>
                    </div>
                  ) : (
                    <div style={S.quantityBox}>
                      <button
                        type="button"
                        style={{
                          ...S.quantityStepBtn,
                          ...(!selectedSlotML || quantityML <= 1
                            ? { opacity: 0.4, cursor: "not-allowed" }
                            : {}),
                        }}
                        disabled={!selectedSlotML || quantityML <= 1}
                        aria-label="Decrease quantity"
                        onClick={() => setQuantityML((qML) => Math.max(1, qML - 1))}
                      >
                        <MinusIcon />
                      </button>
                      <span style={S.quantityValue}>{quantityML}</span>
                      <button
                        type="button"
                        style={{
                          ...S.quantityStepBtn,
                          ...(!selectedSlotML || quantityML >= maxQuantityML
                            ? { opacity: 0.4, cursor: "not-allowed" }
                            : {}),
                        }}
                        disabled={!selectedSlotML || quantityML >= maxQuantityML}
                        aria-label="Increase quantity"
                        onClick={() => setQuantityML((qML) => Math.min(maxQuantityML, qML + 1))}
                      >
                        <PlusStepIcon />
                      </button>
                    </div>
                  )}
                </div>

                {customFieldsML.length > 0 && (
                  <div style={S.noteBlock}>
                    {customFieldsML.map((fieldML) => {
                      const { title: titleML, hint: hintML } = splitFieldLabelML(fieldML.label);
                      return (
                        <div key={fieldML.fieldKey} style={S.noteField}>
                          <div style={S.qtyNoteLabelRow}>
                            <span style={S.qtyNoteLabel}>{titleML}</span>
                            {hintML && <span style={S.qtyNoteHint}>{hintML}</span>}
                          </div>
                          <input
                            type="text"
                            className="nb-note-input"
                            style={S.input}
                            placeholder="Enter message here"
                            aria-label={fieldML.label}
                            required={fieldML.required}
                            value={customFieldValuesML[fieldML.fieldKey] ?? ""}
                            onChange={(eML: FieldChangeEvent) => {
                              const valueML = eML.currentTarget.value;
                              setCustomFieldValuesML((prevML) => ({
                                ...prevML,
                                [fieldML.fieldKey]: valueML,
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

            <div style={S.innerCard}>
              <div className="eb-touch" style={S.fieldsRow}>
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
                    style={{ ...S.input, ...(nameErrorML ? { borderColor: "#C0392B" } : {}) }}
                    value={customerNameML}
                    onChange={(eML: FieldChangeEvent) => setCustomerNameML(eML.currentTarget.value)}
                    onBlur={() => setNameTouchedML(true)}
                  />
                  {nameErrorML && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{nameErrorML}</span>
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
                    style={{ ...S.input, ...(emailErrorML ? { borderColor: "#C0392B" } : {}) }}
                    value={customerEmailML}
                    onChange={(eML: FieldChangeEvent) => setCustomerEmailML(eML.currentTarget.value)}
                    onBlur={() => setEmailTouchedML(true)}
                  />
                  {emailErrorML && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{emailErrorML}</span>
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
                    value={customerPhoneML}
                    onChange={(eML: FieldChangeEvent) =>
                      setCustomerPhoneML(
                        eML.currentTarget.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    onBlur={() => setPhoneTouchedML(true)}
                  />
                  {phoneErrorML && (
                    <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B" }}>{phoneErrorML}</span>
                  )}
                </div>
              </div>

              {noSelectionErrorML && (
                <p role="alert" style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B", margin: 0 }}>
                  {noSelectionErrorML}
                </p>
              )}

              {createErrorML && (
                <p style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B", margin: 0 }}>
                  {createErrorML}
                </p>
              )}

              {submitAttemptedML && (nameErrorML || emailErrorML) && (
                <p style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B", margin: 0 }}>
                  Please fix the highlighted fields before creating this booking.
                </p>
              )}

              {incompleteBundleTitlesML.length > 0 && submitAttemptedML && (
                <p style={{ fontFamily: "Inter", fontSize: "12px", color: "#C0392B", margin: 0 }}>
                  {incompleteBundleTitlesML.length === 1
                    ? `${incompleteBundleTitlesML[0]} doesn't have all its bundle sessions queued yet.`
                    : `These bundles don't have all their sessions queued yet: ${incompleteBundleTitlesML.join(", ")}.`}
                </p>
              )}
            </div>

            <div
              className="nb-save-row"
              style={{ display: "flex", justifyContent: "center", marginTop: "14px" }}
            >
              <div style={{ ...saveWrapperStyleML(), width: "auto", minWidth: "143px" }}>
                <button
                  type="button"
                  style={{
                    ...saveButtonStyleML(isCreatingBookingML),
                    width: "auto",
                    minWidth: "139px",
                    padding: "7px 10px",
                    whiteSpace: "nowrap",
                  }}
                  disabled={isCreatingBookingML}
                  onClick={handleCreateBookingML}
                >
                  {createBookingCountML > 1
                    ? `Create ${createBookingCountML} bookings`
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

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};