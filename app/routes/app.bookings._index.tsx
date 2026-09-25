import { Fragment, useEffect, useMemo, useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData, useNavigate, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { BookingType } from "@prisma/client";
import { authenticate } from "../shopify.server";
import { listBookableProductsML } from "../models/bookableProduct.server";
import { listCustomFieldsML } from "../models/customBookingField.server";
import {
  listBookingsML,
  type ListBookingsFilters,
  type BookingWithProductTitle,
} from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";
import { bookingListActionML } from "../utils/bookingListAction.server";
import {
  bookingSourceLabelML,
  formatDateDisplayML,
  formatTimeRangeDisplayML,
} from "../utils/format";
import { formatInstantInTimezoneML } from "../utils/timezones";
import {
  BLUE_ML,
  BORDER_ML,
  LICENSE_BORDER_ML,
  TEXT_DARK_ML,
  TEXT_MUTED_ML,
  stylesML as settingsStyles,
} from "../components/SettingsUI";

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const urlML = new URL(requestML.url);

  const statusML = urlML.searchParams.get("status") || undefined;
  const bookableProductIdML = urlML.searchParams.get("productId") || undefined;
  const searchML = urlML.searchParams.get("search") || undefined;
  const dateFromML = urlML.searchParams.get("dateFrom") || undefined;
  const dateToML = urlML.searchParams.get("dateTo") || undefined;

  const filtersML: ListBookingsFilters = {
    status: statusML as ListBookingsFilters["status"],
    bookableProductId: bookableProductIdML,
    search: searchML,
    dateFrom: dateFromML,
    dateTo: dateToML,
    completed: false,
  };

  const [bookingsML, productsML, customFieldsML] = await Promise.all([
    listBookingsML(sessionML.shop, filtersML),
    listBookableProductsML(sessionML.shop),
    listCustomFieldsML(sessionML.shop),
  ]);

  return {
    bookings: bookingsML,
    products: productsML
      .filter((pML) => pML.isEnabled)
      .map((pML) => ({ id: pML.id, title: pML.productTitle })),
    customFieldLabels: Object.fromEntries(
      customFieldsML.map((fML) => [fML.fieldKey, fML.label]),
    ) as Record<string, string>,
    filters: {
      status: statusML ?? "",
      bookableProductId: bookableProductIdML ?? "",
      search: searchML ?? "",
      dateFrom: dateFromML ?? "",
      dateTo: dateToML ?? "",
    },
  };
};

export const action = bookingListActionML;

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};

export default function BookingManagementPage() {
  const { bookings: bookingsML, products: productsML, customFieldLabels: customFieldLabelsML, filters: filtersML } =
    useLoaderData<typeof loader>();

  return (
    <BookingsListPage
      bookings={bookingsML}
      products={productsML}
      customFieldLabels={customFieldLabelsML}
      filters={filtersML}
    />
  );
}


type FieldChangeEvent = { currentTarget: { value: string } };

const STATUS_OPTIONS_ML = [
  "",
  "CONFIRMED",
  "RESCHEDULED",
  "OVERBOOKED",
  "CANCELLED",
] as const;

type BookingsListFilters = {
  status: string;
  bookableProductId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};


const TYPE_SHORT_LABELS_ML: Record<BookingType, string> = {
  SLOT: "Slot Booking",
  FULL_DAY: "Full-Day Booking",
  MULTI_DAY: "Multi-Day Booking",
  BUNDLE: "Bundle Booking",
};

const STATUS_COLORS_ML: Record<string, { bg: string; fg: string }> = {
  CONFIRMED: { bg: "#FFF9BA", fg: "#000000" },
  RESCHEDULED: { bg: "#D9EAFF", fg: "#000000" },
  OVERBOOKED: { bg: "#FFD9D6", fg: "#000000" },
  COMPLETED: { bg: "#BEFFBA", fg: "#000000" },
  CANCELLED: { bg: "#F1F1F1", fg: "#666666" },
  MIXED: { bg: "#F1F1F1", fg: "#666666" },
};

const S: Record<string, React.CSSProperties> = {
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
  },
  pageHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  subtitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "3px",
  },
  newBookingButton: {
    display: "inline-flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "4px",
    boxSizing: "border-box",
    padding: "10px 16px",
    height: "42px",
    background: BLUE_ML,
    borderRadius: "10px",
    border: "none",
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    textDecoration: "none",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  listCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
    padding: "16px",
  },
  listHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    width: "100%",
  },
  listTitle: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  headerActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "260px",
    maxWidth: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
  },
  searchInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    padding: 0,
  },
  squareIconButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    width: "34px",
    height: "34px",
    padding: 0,
    borderRadius: "4px",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    background: "#FFFFFF",
    cursor: "pointer",
  },
  squareIconButtonActive: {
    background: "#EAF1F8",
    border: `1px solid ${BLUE_ML}`,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${BORDER_ML}`,
    margin: 0,
    width: "100%",
  },
  filterPanel: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "12px",
    width: "100%",
    padding: "12px",
    background: "#FAFAFA",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "140px",
    flex: "1 1 140px",
  },
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED_ML,
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    height: "34px",
    padding: "5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    color: TEXT_DARK_ML,
    outline: "none",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    height: "34px",
    padding: "0 16px",
    borderRadius: "6px",
    border: "none",
    background: BLUE_ML,
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ghostButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    height: "34px",
    padding: "0 14px",
    borderRadius: "6px",
    border: `1px solid ${BORDER_ML}`,
    background: "#FFFFFF",
    color: TEXT_DARK_ML,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  textButton: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    color: BLUE_ML,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "760px",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    textAlign: "left",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    padding: "0 8px 12px",
    whiteSpace: "nowrap",
  },
  thCenter: { textAlign: "center" },
  thAction: { textAlign: "right" },
  td: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "16px",
    color: TEXT_DARK_ML,
    padding: "6px 8px",
    borderTop: `1px solid ${BORDER_ML}`,
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdCenter: { textAlign: "center" },
  tdAction: { textAlign: "right" },
  tdExpanded: {
    padding: "0 8px 12px",
    borderTop: "none",
    whiteSpace: "normal",
  },
  subLine: {
    display: "block",
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED_ML,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 14px",
    borderRadius: "50px",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "15px",
    textTransform: "capitalize",
  },
  iconButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "40px",
    height: "40px",
    padding: 0,
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  detailsPanel: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    background: "#FAFAFA",
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
    whiteSpace: "normal",
  },
  detailRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    fontFamily: "Inter",
    fontSize: "14px",
    lineHeight: "16px",
    color: TEXT_DARK_ML,
  },
  detailLabel: {
    minWidth: "100px",
    flexShrink: 0,
    color: TEXT_MUTED_ML,
    fontWeight: 500,
  },
  detailsCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "8px",
    padding: "16px 10px",
  },
  detailsHeaderRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    width: "100%",
  },
  detailsHeaderLeft: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "20px",
  },
  bookingForText: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "20px",
    lineHeight: "24px",
    letterSpacing: "0.02em",
    color: "#000000",
    whiteSpace: "nowrap",
  },
  customerChip: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 12px",
    background: "#DDEEFF",
    borderRadius: "70px",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: "#000000",
    whiteSpace: "nowrap",
  },
  dateTimeChipsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  dateTimeChip: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    textAlign: "center",
    color: "#000000",
    whiteSpace: "nowrap",
  },
  statusChipLarge: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "6px 16px",
    gap: "10px",
    minWidth: "100px",
    height: "28px",
    boxSizing: "border-box",
    borderRadius: "50px",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "15px",
    textAlign: "center",
    color: "#000000",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  chevronToggle: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "40px",
    height: "40px",
    padding: "10px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#073E74",
  },
  detailsDivider: {
    border: "none",
    borderTop: `1px solid ${BORDER_ML}`,
    margin: 0,
    width: "100%",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
  },
  topFieldsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: "1 1 200px",
    minWidth: "160px",
  },
  fieldBlockLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: "#373737",
  },
  fieldBlockBox: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    padding: "7px 8px",
    minHeight: "34px",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    letterSpacing: "0.02em",
    color: "#000000",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actionRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "16px",
    width: "100%",
  },
  actionRowField: {
    flex: "0 0 calc((100% - 48px) / 4)",
    minWidth: "160px",
  },
  actionRowFieldWide: {
    flex: "0 0 252px",
    width: "252px",
    minWidth: "0",
  },
  cancelBookingWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    flex: "0 0 auto",
    marginLeft: "auto",
    gap: "10px",
  },
  actionSpacer: {
    flex: "0 0 141px",
  },
  cancelBookingBtn: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    gap: "4px",
    height: "34px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: "#E00000",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  rescheduleBookingBtn: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    gap: "4px",
    height: "34px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: BLUE_ML,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  childBox: {
    border: `1px solid ${LICENSE_BORDER_ML}`,
    borderRadius: "4px",
    background: "#FFFFFF",
    overflow: "hidden",
  },
  childHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "4px 8px 4px 12px",
    fontFamily: "Inter",
    fontSize: "14px",
    color: TEXT_DARK_ML,
  },
  errorBanner: {
    fontFamily: "Inter",
    fontSize: "12px",
    color: "#C0392B",
    background: "#FDECEA",
    border: "1px solid #F5C6C1",
    borderRadius: "4px",
    padding: "8px 10px",
  },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "8px",
    padding: "40px 16px",
  },
  emptyTitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  emptyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_MUTED_ML,
    margin: 0,
  },
};


const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M19 19L14.657 14.657M16.778 8.889C16.778 11.246 15.841 13.507 14.174 15.174C12.507 16.841 10.246 17.778 7.889 17.778C5.531 17.778 3.27 16.841 1.603 15.174C-0.063 13.507 -1 11.246 -1 8.889C-1 6.531 -0.063 4.27 1.603 2.603C3.27 0.937 5.531 0 7.889 0C10.246 0 12.507 0.937 14.174 2.603C15.841 4.27 16.778 6.531 16.778 8.889Z"
      stroke={BLUE_ML}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1.5 1.5)"
    />
  </svg>
);

const FilterIcon = () => (
  <img src="/filter.svg" alt="" width={20} height={20} />
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M16.5 10A6.5 6.5 0 1 1 14.6 5.4M16.5 3.5V6.5H13.5"
      stroke={BLUE_ML}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 4V16M4 10H16"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);


const DETAILS_RESPONSIVE_CSS_ML = `
  @media (max-width: 720px) {
    .eb-fields-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .eb-fields-grid > div > div,
    .eb-action-row > div > div {
      white-space: normal !important;
      overflow-wrap: anywhere;
      text-overflow: clip !important;
    }
    .eb-action-note,
    .eb-action-booked {
      flex: 1 1 100% !important;
      width: 100% !important;
      max-width: none !important;
    }
    .eb-action-buttons {
      margin-left: 0 !important;
      width: 100%;
      justify-content: flex-start !important;
      flex-wrap: wrap;
    }
  }
  @media (max-width: 480px) {
    .eb-fields-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
`;

function DetailsResponsiveStyles() {
  return <style>{DETAILS_RESPONSIVE_CSS_ML}</style>;
}

function StatusPill({ status: statusML }: { status: string }) {
  const colorsML = STATUS_COLORS_ML[statusML] ?? STATUS_COLORS_ML.CANCELLED;
  return (
    <span
      style={{
        ...S.statusBadge,
        background: colorsML.bg,
        color: colorsML.fg,
      }}
    >
      {statusML.toLowerCase()}
    </span>
  );
}

function DetailRow({
  label: labelML,
  children: childrenML,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailLabel}>{labelML}</span>
      <div>{childrenML}</div>
    </div>
  );
}

function FieldBlock({
  label: labelML,
  children: childrenML,
  style: styleML,
  className: classNameML,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={classNameML}
      style={styleML ? { ...S.fieldBlock, ...styleML } : S.fieldBlock}
    >
      <span style={S.fieldBlockLabel}>{labelML}</span>
      <div style={S.fieldBlockBox}>{childrenML}</div>
    </div>
  );
}

function ChevronToggleIcon({ expanded: expandedML }: { expanded: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: expandedML ? "rotate(180deg)" : "none",
        transition: "transform 120ms ease",
      }}
    >
      <path
        d="M4 12.5L10 6.5L16 12.5"
        stroke="#073E74"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookingNotes({
  responses: responsesML,
  labels: labelsML,
}: {
  responses: unknown;
  labels: Record<string, string>;
}) {
  const entriesML =
    responsesML && typeof responsesML === "object"
      ? Object.entries(responsesML as Record<string, string>)
      : [];

  if (entriesML.length === 0) {
    return <span style={{ color: TEXT_MUTED_ML }}>—</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {entriesML.map(([fieldKeyML, valueML]) => (
        <span key={fieldKeyML}>{(labelsML[fieldKeyML] ?? fieldKeyML) + ": " + valueML}</span>
      ))}
    </div>
  );
}

function EyeButton({
  expanded: expandedML,
  onClick: onClickML,
  label: labelML,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="eb-tap"
      style={{
        ...S.iconButton,
        ...(expandedML ? { background: "#EAF1F8" } : {}),
      }}
      onClick={onClickML}
      aria-expanded={expandedML}
      aria-label={labelML}
    >
      <img src="/eye-icon.svg" width={22} height={20} alt="" />
    </button>
  );
}

function whenLinesML(bookingML: BookingWithProductTitle): {
  date: string;
  sub: string | null;
} {
  if (bookingML.bookingType === "MULTI_DAY") {
    return {
      date: `${formatDateDisplayML(bookingML.date)} \u2192 ${
        bookingML.endDate ? formatDateDisplayML(bookingML.endDate) : "—"
      }`,
      sub: null,
    };
  }
  if (bookingML.bookingType === "FULL_DAY") {
    return { date: formatDateDisplayML(bookingML.date), sub: "Whole day" };
  }
  return {
    date: formatDateDisplayML(bookingML.date),
    sub: formatTimeRangeDisplayML(bookingML.slotStart, bookingML.slotEnd),
  };
}


function BookingDetails({
  booking: bookingML,
  customFieldLabels: customFieldLabelsML,
  onToggle: onToggleML,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
  onToggle?: () => void;
}) {
  const cancelFetcherML = useFetcher();
  const rescheduleFetcherML = useFetcher();
  const rescheduleSlotsFetcherML = useFetcher();
  const shopifyML = useAppBridge();

  const [isReschedulingML, setIsReschedulingML] = useState(false);
  const [newDateML, setNewDateML] = useState(bookingML.date);
  const [newSlotStartML, setNewSlotStartML] = useState(bookingML.slotStart);
  const [newEndDateML, setNewEndDateML] = useState(bookingML.endDate ?? "");
  const needsTimeSlotML =
    bookingML.bookingType === "SLOT" || bookingML.bookingType === "BUNDLE";
  const isMultiDayML = bookingML.bookingType === "MULTI_DAY";
  const canSaveRescheduleML = needsTimeSlotML
    ? !!newSlotStartML
    : isMultiDayML
      ? !!newDateML && !!newEndDateML && newEndDateML > newDateML
      : !!newDateML;

  const rescheduleErrorML =
    rescheduleFetcherML.data?.intent === "reschedule" &&
    !rescheduleFetcherML.data.ok
      ? rescheduleFetcherML.data.error
      : null;

  const rescheduleSlotsML: TimeSlot[] =
    rescheduleSlotsFetcherML.data?.intent === "loadRescheduleSlots" &&
    rescheduleSlotsFetcherML.data.ok
      ? rescheduleSlotsFetcherML.data.slots
      : [];
  const isLoadingRescheduleSlotsML = rescheduleSlotsFetcherML.state !== "idle";

  useEffect(() => {
    if (
      rescheduleFetcherML.data?.intent === "reschedule" &&
      rescheduleFetcherML.data.ok
    ) {
      shopifyML.toast.show("Booking rescheduled");
      setIsReschedulingML(false);
    }
  }, [rescheduleFetcherML.data, shopifyML]);

  useEffect(() => {
    if (cancelFetcherML.data?.intent === "cancel" && cancelFetcherML.data.ok) {
      shopifyML.toast.show("Booking cancelled");
    }
  }, [cancelFetcherML.data, shopifyML]);

  useEffect(() => {
    if (!isReschedulingML || !newDateML || !needsTimeSlotML) return;
    rescheduleSlotsFetcherML.submit(
      { intent: "loadRescheduleSlots", id: bookingML.id, date: newDateML },
      { method: "POST" },
    );
  }, [isReschedulingML, newDateML]);

  useEffect(() => {
    if (rescheduleSlotsML.length === 0) return;
    const stillValidML = rescheduleSlotsML.some((sML) => sML.start === newSlotStartML);
    if (stillValidML) return;
    const currentSlotML = rescheduleSlotsML.find((sML) => sML.start === bookingML.slotStart);
    const firstAvailableML = rescheduleSlotsML.find((sML) => sML.available);
    setNewSlotStartML((currentSlotML ?? firstAvailableML ?? rescheduleSlotsML[0]).start);
  }, [rescheduleSlotsML]);

  const handleCancelML = () => {
    cancelFetcherML.submit(
      { intent: "cancel", id: bookingML.id },
      { method: "POST" },
    );
  };

  const handleRescheduleML = () => {
    rescheduleFetcherML.submit(
      {
        intent: "reschedule",
        id: bookingML.id,
        date: newDateML,
        slotStart: newSlotStartML,
        endDate: isMultiDayML ? newEndDateML : "",
      },
      { method: "POST" },
    );
  };

  const isCompletedML = bookingML.displayStatus === "COMPLETED";
  const isCancelledML = bookingML.status === "CANCELLED";
  const statusColorsML =
    STATUS_COLORS_ML[bookingML.displayStatus] ?? STATUS_COLORS_ML.CONFIRMED;

  const dateLabelML =
    bookingML.bookingType === "MULTI_DAY"
      ? `${formatDateDisplayML(bookingML.date)} \u2192 ${
          bookingML.endDate ? formatDateDisplayML(bookingML.endDate) : "—"
        }`
      : formatDateDisplayML(bookingML.date);

  const timeLabelML =
    bookingML.bookingType === "MULTI_DAY"
      ? null
      : formatTimeRangeDisplayML(bookingML.slotStart, bookingML.slotEnd);

  return (
    <div style={S.detailsCard}>
      <DetailsResponsiveStyles />
      <div style={S.detailsHeaderRow}>
        <div className="eb-chip-group" style={S.detailsHeaderLeft}>
          <span style={S.bookingForText}>Booking for</span>
          <span style={S.customerChip}>{bookingML.customerName ?? "—"}</span>
        </div>

        <div className="eb-chip-group" style={S.dateTimeChipsRow}>
          <span style={S.dateTimeChip}>{dateLabelML}</span>
          {timeLabelML && <span style={S.dateTimeChip}>{timeLabelML}</span>}
        </div>

        <div
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "16px" }}
        >
          <span
            style={{
              ...S.statusChipLarge,
              background: statusColorsML.bg,
              color: statusColorsML.fg,
            }}
          >
            {bookingML.displayStatus.toLowerCase()}
          </span>
          {onToggleML && (
            <button
              type="button"
              className="eb-tap"
              style={S.chevronToggle}
              onClick={onToggleML}
              aria-label="Collapse booking details"
            >
              <ChevronToggleIcon expanded />
            </button>
          )}
        </div>
      </div>

      <hr style={S.detailsDivider} />

      <div className="eb-fields-grid" style={S.topFieldsRow}>
        <FieldBlock label="Customer Mail">
          {bookingML.customerEmail ?? "—"}
        </FieldBlock>
        <FieldBlock label="Customer Phone">
          {bookingML.customerPhone ?? "—"}
        </FieldBlock>
        <FieldBlock label="Booking Type">
          {TYPE_SHORT_LABELS_ML[bookingML.bookingType]}
        </FieldBlock>
        <FieldBlock label="Location">{bookingML.location ?? "—"}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      {isReschedulingML ? (
        <div
          className="eb-reschedule-row eb-touch"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="date"
            aria-label="New date"
            style={{ ...S.input, width: "160px", cursor: "pointer" }}
            value={newDateML}
            onClick={(eML) => {
              const elML = eML.currentTarget;
              if (typeof elML.showPicker === "function") {
                elML.showPicker();
              }
            }}
            onChange={(eML) => setNewDateML(eML.target.value)}
          />
          {isMultiDayML && (
            <input
              type="date"
              aria-label="New check-out date"
              style={{ ...S.input, width: "160px", cursor: "pointer" }}
              value={newEndDateML}
              min={newDateML || undefined}
              onClick={(eML) => {
                const elML = eML.currentTarget;
                if (typeof elML.showPicker === "function") {
                  elML.showPicker();
                }
              }}
              onChange={(eML) => setNewEndDateML(eML.target.value)}
            />
          )}
          {needsTimeSlotML && (
            <select
              aria-label="New time"
              style={{ ...S.input, width: "240px" }}
              value={newSlotStartML}
              disabled={isLoadingRescheduleSlotsML || rescheduleSlotsML.length === 0}
              onChange={(eML) => setNewSlotStartML(eML.target.value)}
            >
              {isLoadingRescheduleSlotsML && rescheduleSlotsML.length === 0 && (
                <option value="">Loading times…</option>
              )}
              {!isLoadingRescheduleSlotsML && rescheduleSlotsML.length === 0 && (
                <option value="">No times on this date</option>
              )}
              {rescheduleSlotsML.map((slotML) => (
                <option
                  key={slotML.startsAt}
                  value={slotML.start}
                  disabled={!slotML.available && slotML.start !== bookingML.slotStart}
                >
                  {formatTimeRangeDisplayML(slotML.start, slotML.end)}
                  {!slotML.available && slotML.start !== bookingML.slotStart
                    ? " (booked)"
                    : typeof slotML.remainingCapacity === "number"
                      ? ` (${
                          slotML.remainingCapacity === 1
                            ? "1 spot left"
                            : `${slotML.remainingCapacity} spots left`
                        })`
                      : ""}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            style={{ ...S.primaryButton, ...(!canSaveRescheduleML ? { opacity: 0.5 } : {}) }}
            disabled={!canSaveRescheduleML || rescheduleFetcherML.state !== "idle"}
            onClick={handleRescheduleML}
          >
            Save
          </button>
          <button
            type="button"
            style={{ ...S.ghostButton }}
            onClick={() => setIsReschedulingML(false)}
          >
            Cancel edit
          </button>
        </div>
      ) : (
        <div className="eb-fields-grid" style={S.topFieldsRow}>
          <FieldBlock label="Booking Date">{dateLabelML}</FieldBlock>
          <FieldBlock label="Booking Time">{timeLabelML ?? "Whole day"}</FieldBlock>
          <FieldBlock label="Quantity">{bookingML.quantity}</FieldBlock>
          <FieldBlock label="Customer Note">{bookingML.note ?? "—"}</FieldBlock>
        </div>
      )}

      <hr style={S.detailsDivider} />

      <div className="eb-action-row" style={S.actionRow}>
        <FieldBlock label="Note" style={S.actionRowField} className="eb-action-note">
          <BookingNotes
            responses={bookingML.customFieldResponses}
            labels={customFieldLabelsML}
          />
        </FieldBlock>
        <FieldBlock label="Booked at" style={S.actionRowFieldWide} className="eb-action-booked">
          {formatInstantInTimezoneML(bookingML.createdAt, bookingML.locationTimezone)}
          {" · "}
          {bookingSourceLabelML(bookingML.source)}
        </FieldBlock>

        {!isCancelledML && !isCompletedML ? (
          <div className="eb-action-buttons eb-touch" style={S.cancelBookingWrap}>
            {!isReschedulingML && (
              <button
                type="button"
                style={S.rescheduleBookingBtn}
                onClick={() => setIsReschedulingML(true)}
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              style={S.cancelBookingBtn}
              onClick={handleCancelML}
            >
              Cancel Booking
            </button>
          </div>
        ) : (
          <div style={S.actionSpacer} />
        )}
      </div>

      {rescheduleErrorML && <div style={S.errorBanner}>{rescheduleErrorML}</div>}
    </div>
  );
}


const SLOT_LABELS_ML = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];

function slotValueForML(bookingML: BookingWithProductTitle): string {
  const whenML = whenLinesML(bookingML);
  return whenML.sub ? `${whenML.date} · ${whenML.sub}` : whenML.date;
}

function BundleGroupDetails({
  group: groupML,
  customFieldLabels: customFieldLabelsML,
  onToggle: onToggleML,
}: {
  group: BookingGroup;
  customFieldLabels: Record<string, string>;
  onToggle?: () => void;
}) {
  const shopifyML = useAppBridge();
  const revalidatorML = useRevalidator();
  const [isCancellingML, setIsCancellingML] = useState(false);
  const rescheduleFetcherML = useFetcher();
  const rescheduleSlotsFetcherML = useFetcher();

  const firstML = groupML.bookings[0];
  const activeBookingsML = groupML.bookings.filter((bML) => bML.status !== "CANCELLED");

  const [isReschedulingML, setIsReschedulingML] = useState(false);
  const [rescheduleIdML, setRescheduleIdML] = useState(activeBookingsML[0]?.id ?? "");
  const rescheduleTargetML =
    activeBookingsML.find((bML) => bML.id === rescheduleIdML) ?? activeBookingsML[0];
  const [newDateML, setNewDateML] = useState(rescheduleTargetML?.date ?? "");
  const [newSlotStartML, setNewSlotStartML] = useState(
    rescheduleTargetML?.slotStart ?? "",
  );

  const rescheduleSlotsML: TimeSlot[] =
    rescheduleSlotsFetcherML.data?.intent === "loadRescheduleSlots" &&
    rescheduleSlotsFetcherML.data.ok
      ? rescheduleSlotsFetcherML.data.slots
      : [];
  const isLoadingRescheduleSlotsML = rescheduleSlotsFetcherML.state !== "idle";
  const rescheduleErrorML =
    rescheduleFetcherML.data?.intent === "reschedule" &&
    !rescheduleFetcherML.data.ok
      ? rescheduleFetcherML.data.error
      : null;

  useEffect(() => {
    if (
      rescheduleFetcherML.data?.intent === "reschedule" &&
      rescheduleFetcherML.data.ok
    ) {
      shopifyML.toast.show("Session rescheduled");
      setIsReschedulingML(false);
    }
  }, [rescheduleFetcherML.data, shopifyML]);

  useEffect(() => {
    if (!isReschedulingML || !rescheduleTargetML || !newDateML) return;
    rescheduleSlotsFetcherML.submit(
      { intent: "loadRescheduleSlots", id: rescheduleTargetML.id, date: newDateML },
      { method: "POST" },
    );
  }, [isReschedulingML, rescheduleTargetML?.id, newDateML]);

  useEffect(() => {
    if (rescheduleSlotsML.length === 0 || !rescheduleTargetML) return;
    if (rescheduleSlotsML.some((sML) => sML.start === newSlotStartML)) return;
    const currentML = rescheduleSlotsML.find(
      (sML) => sML.start === rescheduleTargetML.slotStart,
    );
    const firstAvailableML = rescheduleSlotsML.find((sML) => sML.available);
    setNewSlotStartML((currentML ?? firstAvailableML ?? rescheduleSlotsML[0]).start);
  }, [rescheduleSlotsML]);

  const startReschedulingML = () => {
    const targetML = activeBookingsML[0];
    if (!targetML) return;
    setRescheduleIdML(targetML.id);
    setNewDateML(targetML.date);
    setNewSlotStartML(targetML.slotStart);
    setIsReschedulingML(true);
  };

  const pickSessionML = (idML: string) => {
    const targetML = activeBookingsML.find((bML) => bML.id === idML);
    if (!targetML) return;
    setRescheduleIdML(idML);
    setNewDateML(targetML.date);
    setNewSlotStartML(targetML.slotStart);
  };

  const handleRescheduleSessionML = () => {
    if (!rescheduleTargetML) return;
    rescheduleFetcherML.submit(
      {
        intent: "reschedule",
        id: rescheduleTargetML.id,
        date: newDateML,
        slotStart: newSlotStartML,
        endDate: "",
      },
      { method: "POST" },
    );
  };
  const isCancelledML = activeBookingsML.length === 0;
  const isCompletedML =
    !isCancelledML && groupML.bookings.every((bML) => bML.displayStatus === "COMPLETED");

  const statusesML = new Set(groupML.bookings.map((bML) => bML.displayStatus));
  const groupStatusML = statusesML.size > 1 ? "MIXED" : firstML.displayStatus;
  const statusColorsML = STATUS_COLORS_ML[groupStatusML] ?? STATUS_COLORS_ML.CONFIRMED;

  const whenML = whenLinesML(firstML);

  const handleCancelAllML = async () => {
    setIsCancellingML(true);
    for (const bookingML of activeBookingsML) {
      const formDataML = new FormData();
      formDataML.set("intent", "cancel");
      formDataML.set("id", bookingML.id);
      await fetch(window.location.pathname + window.location.search, {
        method: "POST",
        body: formDataML,
      });
    }
    setIsCancellingML(false);
    shopifyML.toast.show("Bundle cancelled");
    revalidatorML.revalidate();
  };

  return (
    <div style={S.detailsCard}>
      <DetailsResponsiveStyles />
      <div style={S.detailsHeaderRow}>
        <div className="eb-chip-group" style={S.detailsHeaderLeft}>
          <span style={S.bookingForText}>Booking for</span>
          <span style={S.customerChip}>{firstML.customerName ?? "—"}</span>
        </div>

        <div className="eb-chip-group" style={S.dateTimeChipsRow}>
          <span style={S.dateTimeChip}>{whenML.date}</span>
          {whenML.sub && <span style={S.dateTimeChip}>{whenML.sub}</span>}
        </div>

        <div
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "16px" }}
        >
          <span
            style={{
              ...S.statusChipLarge,
              background: statusColorsML.bg,
              color: statusColorsML.fg,
            }}
          >
            {groupStatusML.toLowerCase()}
          </span>
          {onToggleML && (
            <button
              type="button"
              className="eb-tap"
              style={S.chevronToggle}
              onClick={onToggleML}
              aria-label="Collapse booking details"
            >
              <ChevronToggleIcon expanded />
            </button>
          )}
        </div>
      </div>

      <hr style={S.detailsDivider} />

      <div className="eb-fields-grid" style={S.topFieldsRow}>
        <FieldBlock label="Customer Mail">
          {firstML.customerEmail ?? "—"}
        </FieldBlock>
        <FieldBlock label="Customer Phone">
          {firstML.customerPhone ?? "—"}
        </FieldBlock>
        <FieldBlock label="Booking Type">
          {TYPE_SHORT_LABELS_ML[firstML.bookingType]}
        </FieldBlock>
        <FieldBlock label="Location">{firstML.location ?? "—"}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      <div className="eb-fields-grid" style={S.topFieldsRow}>
        <FieldBlock label="Booking Date">{whenML.date}</FieldBlock>
        <FieldBlock label="Booking Time">{whenML.sub ?? "Whole day"}</FieldBlock>
        <FieldBlock label="Quantity">{firstML.quantity}</FieldBlock>
        <FieldBlock label="Customer Note">{firstML.note ?? "—"}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      {Array.from(
        { length: Math.ceil(Math.min(groupML.bookings.length, SLOT_LABELS_ML.length) / 3) },
        (_, rowIndexML) => (
          <Fragment key={rowIndexML}>
            <div className="eb-slot-row" style={S.fieldsRow}>
              {groupML.bookings.slice(rowIndexML * 3, rowIndexML * 3 + 3).map((bookingML, iML) => (
                <FieldBlock
                  key={bookingML.id}
                  label={SLOT_LABELS_ML[rowIndexML * 3 + iML] ?? `Slot ${rowIndexML * 3 + iML + 1}`}
                >
                  {slotValueForML(bookingML)}
                </FieldBlock>
              ))}
            </div>
            <hr style={S.detailsDivider} />
          </Fragment>
        ),
      )}

      {isReschedulingML && rescheduleTargetML && (
        <>
          <div
            className="eb-reschedule-row eb-touch"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <select
              aria-label="Session to reschedule"
              style={{ ...S.input, width: "200px" }}
              value={rescheduleTargetML.id}
              onChange={(eML) => pickSessionML(eML.target.value)}
            >
              {activeBookingsML.map((bML, iML) => (
                <option key={bML.id} value={bML.id}>
                  {`Slot ${groupML.bookings.indexOf(bML) + 1} · ${formatDateDisplayML(bML.date)}`}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="New date"
              style={{ ...S.input, width: "160px", cursor: "pointer" }}
              value={newDateML}
              onClick={(eML) => {
                const elML = eML.currentTarget;
                if (typeof elML.showPicker === "function") {
                  elML.showPicker();
                }
              }}
              onChange={(eML) => setNewDateML(eML.target.value)}
            />
            <select
              aria-label="New time"
              style={{ ...S.input, width: "240px" }}
              value={newSlotStartML}
              disabled={isLoadingRescheduleSlotsML || rescheduleSlotsML.length === 0}
              onChange={(eML) => setNewSlotStartML(eML.target.value)}
            >
              {isLoadingRescheduleSlotsML && rescheduleSlotsML.length === 0 && (
                <option value="">Loading times…</option>
              )}
              {!isLoadingRescheduleSlotsML && rescheduleSlotsML.length === 0 && (
                <option value="">No times on this date</option>
              )}
              {rescheduleSlotsML.map((slotML) => (
                <option
                  key={slotML.startsAt}
                  value={slotML.start}
                  disabled={
                    !slotML.available && slotML.start !== rescheduleTargetML.slotStart
                  }
                >
                  {formatTimeRangeDisplayML(slotML.start, slotML.end)}
                  {!slotML.available && slotML.start !== rescheduleTargetML.slotStart
                    ? " (booked)"
                    : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{ ...S.primaryButton, ...(!newSlotStartML ? { opacity: 0.5 } : {}) }}
              disabled={!newSlotStartML || rescheduleFetcherML.state !== "idle"}
              onClick={handleRescheduleSessionML}
            >
              Save
            </button>
            <button
              type="button"
              style={{ ...S.ghostButton }}
              onClick={() => setIsReschedulingML(false)}
            >
              Cancel edit
            </button>
          </div>
          {rescheduleErrorML && <div style={S.errorBanner}>{rescheduleErrorML}</div>}
          <hr style={S.detailsDivider} />
        </>
      )}

      <div className="eb-action-row" style={S.actionRow}>
        <FieldBlock label="Note" style={S.actionRowField} className="eb-action-note">
          <BookingNotes
            responses={firstML.customFieldResponses}
            labels={customFieldLabelsML}
          />
        </FieldBlock>
        <FieldBlock label="Booked at" style={S.actionRowFieldWide} className="eb-action-booked">
          {formatInstantInTimezoneML(firstML.createdAt, firstML.locationTimezone)}
          {" · "}
          {bookingSourceLabelML(firstML.source)}
        </FieldBlock>

        {!isCancelledML && !isCompletedML ? (
          <div className="eb-action-buttons eb-touch" style={S.cancelBookingWrap}>
            {!isReschedulingML && (
              <button
                type="button"
                style={S.rescheduleBookingBtn}
                onClick={startReschedulingML}
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              style={{ ...S.cancelBookingBtn, ...(isCancellingML ? { opacity: 0.5 } : {}) }}
              disabled={isCancellingML}
              onClick={handleCancelAllML}
            >
              {isCancellingML ? "Cancelling…" : "Cancel Booking"}
            </button>
          </div>
        ) : (
          <div style={S.actionSpacer} />
        )}
      </div>
    </div>
  );
}


const COLUMN_COUNT_ML = 6;

function SingleRow({
  booking: bookingML,
  customFieldLabels: customFieldLabelsML,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const [openML, setOpenML] = useState(false);
  const whenML = whenLinesML(bookingML);

  return (
    <Fragment>
      <tr className="eb-row">
        <td
          className="eb-cell-primary"
          style={S.td}
          title={bookingML.customerName ?? undefined}
        >
          {bookingML.customerName ?? "—"}
        </td>
        <td data-label="Product" style={S.td} title={bookingML.productTitle}>
          {bookingML.productTitle}
        </td>
        <td data-label="Status" style={{ ...S.td, ...S.tdCenter }}>
          <StatusPill status={bookingML.displayStatus} />
        </td>
        <td data-label="Type" style={{ ...S.td, ...S.tdCenter }}>
          {TYPE_SHORT_LABELS_ML[bookingML.bookingType]}
        </td>
        <td data-label="Date" style={{ ...S.td, ...S.tdCenter }}>
          <div className="eb-cell-value">
            {bookingML.bookingType === "MULTI_DAY" ? (
              <>
                <div>{formatDateDisplayML(bookingML.date)}</div>
                <div
                  aria-hidden="true"
                  style={{
                    fontSize: "12px",
                    lineHeight: "12px",
                    color: TEXT_MUTED_ML,
                  }}
                >
                  ↓
                </div>
                <div>
                  {bookingML.endDate ? formatDateDisplayML(bookingML.endDate) : "—"}
                </div>
              </>
            ) : (
              <>
                {whenML.date}
                {whenML.sub && <span style={S.subLine}>{whenML.sub}</span>}
              </>
            )}
          </div>
        </td>
        <td className="eb-cell-action" style={{ ...S.td, ...S.tdAction }}>
          <EyeButton
            expanded={openML}
            onClick={() => setOpenML((vML) => !vML)}
            label={`${openML ? "Hide" : "View"} details for ${
              bookingML.customerName ?? "booking"
            }`}
          />
        </td>
      </tr>
      {openML && (
        <tr className="eb-expanded-row">
          <td colSpan={COLUMN_COUNT_ML} style={{ ...S.td, ...S.tdExpanded }}>
            <BookingDetails
              booking={bookingML}
              customFieldLabels={customFieldLabelsML}
              onToggle={() => setOpenML(false)}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

type BookingGroup = {
  key: string;
  bookings: BookingWithProductTitle[];
};

function groupBookingsML(bookingsML: BookingWithProductTitle[]): BookingGroup[] {
  const orderML: string[] = [];
  const byKeyML = new Map<string, BookingWithProductTitle[]>();

  for (const bookingML of bookingsML) {
    const keyML = bookingML.groupId
      ? `g:${bookingML.groupId}`
      : bookingML.orderId
        ? `o:${bookingML.orderId}`
        : `b:${bookingML.id}`;
    const existingML = byKeyML.get(keyML);
    if (existingML) {
      existingML.push(bookingML);
    } else {
      byKeyML.set(keyML, [bookingML]);
      orderML.push(keyML);
    }
  }

  return orderML.map((keyML) => ({ key: keyML, bookings: byKeyML.get(keyML)! }));
}

function GroupChild({
  booking: bookingML,
  customFieldLabels: customFieldLabelsML,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const [openML, setOpenML] = useState(false);
  const whenML = whenLinesML(bookingML);

  return (
    <div style={S.childBox}>
      <div style={S.childHeader}>
        <span>
          <strong style={{ fontWeight: 600 }}>{whenML.date}</strong>
          {whenML.sub ? ` · ${whenML.sub}` : ""}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <StatusPill status={bookingML.displayStatus} />
          <EyeButton
            expanded={openML}
            onClick={() => setOpenML((vML) => !vML)}
            label={`${openML ? "Hide" : "View"} details`}
          />
        </span>
      </div>
      {openML && (
        <div style={{ padding: "0 8px 8px" }}>
          <BookingDetails
            booking={bookingML}
            customFieldLabels={customFieldLabelsML}
            onToggle={() => setOpenML(false)}
          />
        </div>
      )}
    </div>
  );
}

function GroupRow({
  group: groupML,
  customFieldLabels: customFieldLabelsML,
}: {
  group: BookingGroup;
  customFieldLabels: Record<string, string>;
}) {
  const [openML, setOpenML] = useState(false);
  const firstML = groupML.bookings[0];
  const productTitlesML = new Set(groupML.bookings.map((bML) => bML.productTitle));
  const productLabelML =
    productTitlesML.size > 1 ? "Multiple products" : firstML.productTitle;
  const statusesML = new Set(groupML.bookings.map((bML) => bML.displayStatus));
  const groupStatusML = statusesML.size > 1 ? "MIXED" : firstML.displayStatus;

  return (
    <Fragment>
      <tr className="eb-row">
        <td
          className="eb-cell-primary"
          style={S.td}
          title={firstML.customerName ?? undefined}
        >
          {firstML.customerName ?? "—"}
        </td>
        <td data-label="Product" style={S.td} title={productLabelML}>
          {productLabelML}
        </td>
        <td data-label="Status" style={{ ...S.td, ...S.tdCenter }}>
          <StatusPill status={groupStatusML} />
        </td>
        <td data-label="Type" style={{ ...S.td, ...S.tdCenter }}>
          {TYPE_SHORT_LABELS_ML[firstML.bookingType]}
        </td>
        <td data-label="Date" style={{ ...S.td, ...S.tdCenter }}>
          {groupML.bookings.length} slots
        </td>
        <td className="eb-cell-action" style={{ ...S.td, ...S.tdAction }}>
          <EyeButton
            expanded={openML}
            onClick={() => setOpenML((vML) => !vML)}
            label={`${openML ? "Hide" : "View"} ${groupML.bookings.length} bookings for ${
              firstML.customerName ?? "customer"
            }`}
          />
        </td>
      </tr>
      {openML && (
        <tr className="eb-expanded-row">
          <td colSpan={COLUMN_COUNT_ML} style={{ ...S.td, ...S.tdExpanded }}>
            {firstML.bookingType === "BUNDLE" ? (
              <BundleGroupDetails
                group={groupML}
                customFieldLabels={customFieldLabelsML}
                onToggle={() => setOpenML(false)}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {groupML.bookings.map((bookingML) => (
                  <GroupChild
                    key={bookingML.id}
                    booking={bookingML}
                    customFieldLabels={customFieldLabelsML}
                  />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function BookingsEmptyState({
  message: messageML,
  title: titleML,
}: {
  message: string;
  title: string;
}) {
  return (
    <div style={S.emptyWrap}>
      <p style={S.emptyTitle}>{titleML}</p>
      <p style={S.emptyText}>{messageML}</p>
    </div>
  );
}


function matchesQueryML(bookingML: BookingWithProductTitle, termML: string): boolean {
  const haystackML = [
    bookingML.customerName,
    bookingML.customerEmail,
    bookingML.productTitle,
    bookingML.orderName,
    bookingML.date,
    formatDateDisplayML(bookingML.date),
    bookingML.endDate,
    bookingML.endDate ? formatDateDisplayML(bookingML.endDate) : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystackML.includes(termML);
}

function BookingsListPage({
  bookings: initialBookingsML,
  products: productsML,
  customFieldLabels: customFieldLabelsML,
  filters: filtersML,
}: {
  bookings: BookingWithProductTitle[];
  products: { id: string; title: string }[];
  customFieldLabels: Record<string, string>;
  filters: BookingsListFilters;
}) {
  const headingML = "All Bookings";
  const emptyMessageML =
    "No bookings yet — they'll show up here once customers start booking.";
  const showProductFilterML = true;

  const navigateML = useNavigate();
  const listRevalidatorML = useRevalidator();

  const bookingsML = initialBookingsML;
  const isRefreshingBookingsML = listRevalidatorML.state !== "idle";

  const refreshBookingsML = () => {
    listRevalidatorML.revalidate();
  };

  const [queryML, setQueryML] = useState(filtersML.search);
  const [statusML, setStatusML] = useState(filtersML.status);
  const [productIdML, setProductIdML] = useState(filtersML.bookableProductId);
  const [dateFromML, setDateFromML] = useState(filtersML.dateFrom);
  const [dateToML, setDateToML] = useState(filtersML.dateTo);

  const hasActiveFiltersML = Boolean(
    filtersML.status ||
      filtersML.bookableProductId ||
      filtersML.dateFrom ||
      filtersML.dateTo,
  );
  const [filtersOpenML, setFiltersOpenML] = useState(hasActiveFiltersML);

  const applyFiltersML = () => {
    const paramsML = new URLSearchParams();
    if (queryML.trim()) paramsML.set("search", queryML.trim());
    if (statusML) paramsML.set("status", statusML);
    if (productIdML) paramsML.set("productId", productIdML);
    if (dateFromML) paramsML.set("dateFrom", dateFromML);
    if (dateToML) paramsML.set("dateTo", dateToML);
    navigateML({ search: paramsML.toString() });
  };

  const clearFiltersML = () => {
    navigateML({ search: "" });
  };

  const visibleBookingsML = useMemo(() => {
    const termML = queryML.trim().toLowerCase();
    if (!termML) return bookingsML;
    return bookingsML.filter((bML) => matchesQueryML(bML, termML));
  }, [bookingsML, queryML]);

  const bookingGroupsML = useMemo(
    () => groupBookingsML(visibleBookingsML),
    [visibleBookingsML],
  );

  const isFilteringML = hasActiveFiltersML || queryML.trim().length > 0;

  return (
    <s-page heading="Booking and Reservation" inlineSize="950px" style={{ fontFamily: "Inter" }}>
      <div style={S.outerCard}>
        <div style={S.pageHeaderRow}>
          <div>
            <h1 style={settingsStyles.heading}>Bookings</h1>
            <div style={S.subtitleRow}>
              <p style={{ ...settingsStyles.pageSubtitle, margin: 0, fontSize: "12px" }}>
                Search, filter, reschedule or cancel every booking made in your
                store.
              </p>
            </div>
          </div>
          <Link to="/app/bookings/new" style={S.newBookingButton}>
            New Booking
            <PlusIcon />
          </Link>
        </div>

        <div style={S.listCard}>
          <div style={S.listHeaderRow}>
            <p style={S.listTitle}>{headingML}</p>
            <div style={S.headerActions}>
              <div style={S.searchBox}>
                <SearchIcon />
                <input
                  type="text"
                  value={queryML}
                  onChange={(eventML) => setQueryML(eventML.target.value)}
                  onKeyDown={(eventML) => {
                    if (eventML.key === "Enter") applyFiltersML();
                  }}
                  placeholder="Search by email and date"
                  aria-label="Search bookings"
                  style={S.searchInput}
                />
              </div>
              <button
                type="button"
                className="eb-tap"
                style={{
                  ...S.squareIconButton,
                  ...(filtersOpenML || hasActiveFiltersML
                    ? S.squareIconButtonActive
                    : {}),
                }}
                onClick={() => setFiltersOpenML((openML) => !openML)}
                aria-expanded={filtersOpenML}
                aria-label={filtersOpenML ? "Hide filters" : "Show filters"}
                title="Filters"
              >
                <FilterIcon />
              </button>
              <button
                type="button"
                className="eb-tap"
                style={{
                  ...S.squareIconButton,
                  ...(isRefreshingBookingsML ? { opacity: 0.5 } : {}),
                }}
                onClick={refreshBookingsML}
                disabled={isRefreshingBookingsML}
                aria-label="Refresh bookings"
                title="Refresh"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          {filtersOpenML && (
            <div className="eb-touch" style={S.filterPanel}>
              <label style={S.filterField}>
                <span style={S.fieldLabel}>Status</span>
                <select
                  style={S.input}
                  value={statusML}
                  onChange={(eML) => setStatusML(eML.target.value)}
                >
                  {STATUS_OPTIONS_ML.map((sML) => (
                    <option key={sML} value={sML}>
                      {sML ? sML.charAt(0) + sML.slice(1).toLowerCase() : "All"}
                    </option>
                  ))}
                </select>
              </label>
              {showProductFilterML && (
                <label style={S.filterField}>
                  <span style={S.fieldLabel}>Product</span>
                  <select
                    style={S.input}
                    value={productIdML}
                    onChange={(eML) => setProductIdML(eML.target.value)}
                  >
                    <option value="">All</option>
                    {productsML.map((pML) => (
                      <option key={pML.id} value={pML.id}>
                        {pML.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label style={S.filterField}>
                <span style={S.fieldLabel}>From</span>
                <input
                  type="date"
                  style={S.input}
                  value={dateFromML}
                  max={dateToML || undefined}
                  onChange={(eML) => setDateFromML(eML.target.value)}
                />
              </label>
              <label style={S.filterField}>
                <span style={S.fieldLabel}>To</span>
                <input
                  type="date"
                  style={S.input}
                  value={dateToML}
                  min={dateFromML || undefined}
                  onChange={(eML) => setDateToML(eML.target.value)}
                />
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" style={S.primaryButton} onClick={applyFiltersML}>
                  Apply
                </button>
                {(hasActiveFiltersML || filtersML.search) && (
                  <button type="button" style={S.ghostButton} onClick={clearFiltersML}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          <hr style={S.divider} />

          {bookingGroupsML.length === 0 ? (
            <BookingsEmptyState
              title={isFilteringML ? "No matching bookings" : "You're all caught up"}
              message={
                isFilteringML
                  ? "No bookings match your search or filters. Try adjusting or clearing them to see more."
                  : emptyMessageML
              }
            />
          ) : (
            <div
              style={{
                ...S.tableWrap,
                ...(isRefreshingBookingsML ? { opacity: 0.6 } : {}),
              }}
            >
              <table className="eb-table" style={S.table}>
                <colgroup>
                  <col style={{ width: "170px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "110px" }} />
                  <col />
                  <col />
                  <col style={{ width: "64px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={S.th}>Customer</th>
                    <th style={S.th}>Product</th>
                    <th style={{ ...S.th, ...S.thCenter }}>Status</th>
                    <th style={{ ...S.th, ...S.thCenter }}>Booking Type</th>
                    <th style={{ ...S.th, ...S.thCenter }}>Date</th>
                    <th style={{ ...S.th, ...S.thAction }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingGroupsML.map((groupML) =>
                    groupML.bookings.length === 1 ? (
                      <SingleRow
                        key={groupML.key}
                        booking={groupML.bookings[0]}
                        customFieldLabels={customFieldLabelsML}
                      />
                    ) : (
                      <GroupRow
                        key={groupML.key}
                        group={groupML}
                        customFieldLabels={customFieldLabelsML}
                      />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </s-page>
  );
}