import { Fragment, useEffect, useMemo, useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { BookingType } from "@prisma/client";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { listCustomFields } from "../models/customBookingField.server";
import {
  listBookings,
  type ListBookingsFilters,
  type BookingWithProductTitle,
} from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";
import { bookingListAction } from "../utils/bookingListAction.server";
import {
  bookingSourceLabel,
  formatDateDisplay,
  formatTimeRangeDisplay,
} from "../utils/format";
import { formatInstantInTimezone } from "../utils/timezones";
import {
  BLUE,
  BORDER,
  LICENSE_BORDER,
  TEXT_DARK,
  TEXT_MUTED,
  styles as settingsStyles,
} from "../components/SettingsUI";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const status = url.searchParams.get("status") || undefined;
  const bookableProductId = url.searchParams.get("productId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const filters: ListBookingsFilters = {
    status: status as ListBookingsFilters["status"],
    bookableProductId,
    search,
    dateFrom,
    dateTo,
    completed: false,
  };

  const [bookings, products, customFields] = await Promise.all([
    listBookings(session.shop, filters),
    listBookableProducts(session.shop),
    listCustomFields(session.shop),
  ]);

  return {
    bookings,
    products: products
      .filter((p) => p.isEnabled)
      .map((p) => ({ id: p.id, title: p.productTitle })),
    customFieldLabels: Object.fromEntries(
      customFields.map((f) => [f.fieldKey, f.label]),
    ) as Record<string, string>,
    filters: {
      status: status ?? "",
      bookableProductId: bookableProductId ?? "",
      search: search ?? "",
      dateFrom: dateFrom ?? "",
      dateTo: dateTo ?? "",
    },
  };
};

export const action = bookingListAction;

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function BookingManagementPage() {
  const { bookings, products, customFieldLabels, filters } =
    useLoaderData<typeof loader>();

  return (
    <BookingsListPage
      bookings={bookings}
      products={products}
      customFieldLabels={customFieldLabels}
      filters={filters}
    />
  );
}


type FieldChangeEvent = { currentTarget: { value: string } };

const STATUS_OPTIONS = [
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


const TYPE_SHORT_LABELS: Record<BookingType, string> = {
  SLOT: "Slot Booking",
  FULL_DAY: "Full-Day Booking",
  MULTI_DAY: "Multi-Day Booking",
  BUNDLE: "Bundle Booking",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
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
    border: `1px solid ${BORDER}`,
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
    background: BLUE,
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
    border: `1px solid ${BORDER}`,
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
    color: TEXT_DARK,
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
    border: `1px solid ${LICENSE_BORDER}`,
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
    color: TEXT_DARK,
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
    border: `1px solid ${LICENSE_BORDER}`,
    background: "#FFFFFF",
    cursor: "pointer",
  },
  squareIconButtonActive: {
    background: "#EAF1F8",
    border: `1px solid ${BLUE}`,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
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
    border: `1px solid ${LICENSE_BORDER}`,
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
    color: TEXT_MUTED,
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    height: "34px",
    padding: "5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    color: TEXT_DARK,
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
    background: BLUE,
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
    border: `1px solid ${BORDER}`,
    background: "#FFFFFF",
    color: TEXT_DARK,
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
    color: BLUE,
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
    color: TEXT_DARK,
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
    color: TEXT_DARK,
    padding: "6px 8px",
    borderTop: `1px solid ${BORDER}`,
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
    color: TEXT_MUTED,
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
    border: `1px solid ${LICENSE_BORDER}`,
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
    color: TEXT_DARK,
  },
  detailLabel: {
    minWidth: "100px",
    flexShrink: 0,
    color: TEXT_MUTED,
    fontWeight: 500,
  },
  detailsCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
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
    borderTop: `1px solid ${BORDER}`,
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
    border: `1px solid ${BORDER}`,
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
    gap: "10px",
    width: "100%",
  },
  actionRowField: {
    flex: "1 1 0",
    minWidth: "160px",
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
    color: BLUE,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  childBox: {
    border: `1px solid ${LICENSE_BORDER}`,
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
    color: TEXT_DARK,
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
    color: TEXT_DARK,
    margin: 0,
  },
  emptyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_MUTED,
    margin: 0,
  },
};


const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M19 19L14.657 14.657M16.778 8.889C16.778 11.246 15.841 13.507 14.174 15.174C12.507 16.841 10.246 17.778 7.889 17.778C5.531 17.778 3.27 16.841 1.603 15.174C-0.063 13.507 -1 11.246 -1 8.889C-1 6.531 -0.063 4.27 1.603 2.603C3.27 0.937 5.531 0 7.889 0C10.246 0 12.507 0.937 14.174 2.603C15.841 4.27 16.778 6.531 16.778 8.889Z"
      stroke={BLUE}
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
      stroke={BLUE}
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


function StatusPill({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.CANCELLED;
  return (
    <span
      style={{
        ...S.statusBadge,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {status.toLowerCase()}
    </span>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailLabel}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function FieldBlock({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style ? { ...S.fieldBlock, ...style } : S.fieldBlock}>
      <span style={S.fieldBlockLabel}>{label}</span>
      <div style={S.fieldBlockBox}>{children}</div>
    </div>
  );
}

function ChevronToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: expanded ? "rotate(180deg)" : "none",
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
  responses,
  labels,
}: {
  responses: unknown;
  labels: Record<string, string>;
}) {
  const entries =
    responses && typeof responses === "object"
      ? Object.entries(responses as Record<string, string>)
      : [];

  if (entries.length === 0) {
    return <span style={{ color: TEXT_MUTED }}>—</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {entries.map(([fieldKey, value]) => (
        <span key={fieldKey}>{(labels[fieldKey] ?? fieldKey) + ": " + value}</span>
      ))}
    </div>
  );
}

function EyeButton({
  expanded,
  onClick,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      style={{
        ...S.iconButton,
        ...(expanded ? { background: "#EAF1F8" } : {}),
      }}
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={label}
    >
      <img src="/eye-icon.svg" width={22} height={20} alt="" />
    </button>
  );
}

function whenLines(booking: BookingWithProductTitle): {
  date: string;
  sub: string | null;
} {
  if (booking.bookingType === "MULTI_DAY") {
    return {
      date: `${formatDateDisplay(booking.date)} \u2192 ${
        booking.endDate ? formatDateDisplay(booking.endDate) : "—"
      }`,
      sub: null,
    };
  }
  if (booking.bookingType === "FULL_DAY") {
    return { date: formatDateDisplay(booking.date), sub: "Whole day" };
  }
  return {
    date: formatDateDisplay(booking.date),
    sub: formatTimeRangeDisplay(booking.slotStart, booking.slotEnd),
  };
}


function BookingDetails({
  booking,
  customFieldLabels,
  onToggle,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
  onToggle?: () => void;
}) {
  const cancelFetcher = useFetcher();
  const rescheduleFetcher = useFetcher();
  const rescheduleSlotsFetcher = useFetcher();
  const shopify = useAppBridge();

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(booking.date);
  const [newSlotStart, setNewSlotStart] = useState(booking.slotStart);
  const [newEndDate, setNewEndDate] = useState(booking.endDate ?? "");
  const needsTimeSlot =
    booking.bookingType === "SLOT" || booking.bookingType === "BUNDLE";
  const isMultiDay = booking.bookingType === "MULTI_DAY";
  const canSaveReschedule = needsTimeSlot
    ? !!newSlotStart
    : isMultiDay
      ? !!newDate && !!newEndDate && newEndDate > newDate
      : !!newDate;

  const rescheduleError =
    rescheduleFetcher.data?.intent === "reschedule" &&
    !rescheduleFetcher.data.ok
      ? rescheduleFetcher.data.error
      : null;

  const rescheduleSlots: TimeSlot[] =
    rescheduleSlotsFetcher.data?.intent === "loadRescheduleSlots" &&
    rescheduleSlotsFetcher.data.ok
      ? rescheduleSlotsFetcher.data.slots
      : [];
  const isLoadingRescheduleSlots = rescheduleSlotsFetcher.state !== "idle";

  useEffect(() => {
    if (
      rescheduleFetcher.data?.intent === "reschedule" &&
      rescheduleFetcher.data.ok
    ) {
      shopify.toast.show("Booking rescheduled");
      setIsRescheduling(false);
    }
  }, [rescheduleFetcher.data, shopify]);

  useEffect(() => {
    if (cancelFetcher.data?.intent === "cancel" && cancelFetcher.data.ok) {
      shopify.toast.show("Booking cancelled");
    }
  }, [cancelFetcher.data, shopify]);

  useEffect(() => {
    if (!isRescheduling || !newDate || !needsTimeSlot) return;
    rescheduleSlotsFetcher.submit(
      { intent: "loadRescheduleSlots", id: booking.id, date: newDate },
      { method: "POST" },
    );
  }, [isRescheduling, newDate]);

  useEffect(() => {
    if (rescheduleSlots.length === 0) return;
    const stillValid = rescheduleSlots.some((s) => s.start === newSlotStart);
    if (stillValid) return;
    const currentSlot = rescheduleSlots.find((s) => s.start === booking.slotStart);
    const firstAvailable = rescheduleSlots.find((s) => s.available);
    setNewSlotStart((currentSlot ?? firstAvailable ?? rescheduleSlots[0]).start);
  }, [rescheduleSlots]);

  const handleCancel = () => {
    cancelFetcher.submit(
      { intent: "cancel", id: booking.id },
      { method: "POST" },
    );
  };

  const handleReschedule = () => {
    rescheduleFetcher.submit(
      {
        intent: "reschedule",
        id: booking.id,
        date: newDate,
        slotStart: newSlotStart,
        endDate: isMultiDay ? newEndDate : "",
      },
      { method: "POST" },
    );
  };

  const isCompleted = booking.displayStatus === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";
  const statusColors =
    STATUS_COLORS[booking.displayStatus] ?? STATUS_COLORS.CONFIRMED;

  const dateLabel =
    booking.bookingType === "MULTI_DAY"
      ? `${formatDateDisplay(booking.date)} \u2192 ${
          booking.endDate ? formatDateDisplay(booking.endDate) : "—"
        }`
      : formatDateDisplay(booking.date);

  const timeLabel =
    booking.bookingType === "MULTI_DAY"
      ? null
      : formatTimeRangeDisplay(booking.slotStart, booking.slotEnd);

  return (
    <div style={S.detailsCard}>
      <div style={S.detailsHeaderRow}>
        <div style={S.detailsHeaderLeft}>
          <span style={S.bookingForText}>Booking for</span>
          <span style={S.customerChip}>{booking.customerName ?? "—"}</span>
        </div>

        <div style={S.dateTimeChipsRow}>
          <span style={S.dateTimeChip}>{dateLabel}</span>
          {timeLabel && <span style={S.dateTimeChip}>{timeLabel}</span>}
        </div>

        <div
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "16px" }}
        >
          <span
            style={{
              ...S.statusChipLarge,
              background: statusColors.bg,
              color: statusColors.fg,
            }}
          >
            {booking.displayStatus.toLowerCase()}
          </span>
          {onToggle && (
            <button
              type="button"
              style={S.chevronToggle}
              onClick={onToggle}
              aria-label="Collapse booking details"
            >
              <ChevronToggleIcon expanded />
            </button>
          )}
        </div>
      </div>

      <hr style={S.detailsDivider} />

      <div style={S.fieldsRow}>
        <FieldBlock label="Customer Mail">
          {booking.customerEmail ?? "—"}
        </FieldBlock>
        <FieldBlock label="Customer Phone">
          {booking.customerPhone ?? "—"}
        </FieldBlock>
        <FieldBlock label="Booking Type">
          {TYPE_SHORT_LABELS[booking.bookingType]}
        </FieldBlock>
        <FieldBlock label="Location">{booking.location ?? "—"}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      {isRescheduling ? (
        <div
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
            value={newDate}
            onClick={(e) => {
              const el = e.currentTarget;
              if (typeof el.showPicker === "function") {
                el.showPicker();
              }
            }}
            onChange={(e) => setNewDate(e.target.value)}
          />
          {isMultiDay && (
            <input
              type="date"
              aria-label="New check-out date"
              style={{ ...S.input, width: "160px", cursor: "pointer" }}
              value={newEndDate}
              min={newDate || undefined}
              onClick={(e) => {
                const el = e.currentTarget;
                if (typeof el.showPicker === "function") {
                  el.showPicker();
                }
              }}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          )}
          {needsTimeSlot && (
            <select
              aria-label="New time"
              style={{ ...S.input, width: "240px" }}
              value={newSlotStart}
              disabled={isLoadingRescheduleSlots || rescheduleSlots.length === 0}
              onChange={(e) => setNewSlotStart(e.target.value)}
            >
              {isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                <option value="">Loading times…</option>
              )}
              {!isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                <option value="">No times on this date</option>
              )}
              {rescheduleSlots.map((slot) => (
                <option
                  key={slot.startsAt}
                  value={slot.start}
                  disabled={!slot.available && slot.start !== booking.slotStart}
                >
                  {formatTimeRangeDisplay(slot.start, slot.end)}
                  {!slot.available && slot.start !== booking.slotStart
                    ? " (booked)"
                    : typeof slot.remainingCapacity === "number"
                      ? ` (${
                          slot.remainingCapacity === 1
                            ? "1 spot left"
                            : `${slot.remainingCapacity} spots left`
                        })`
                      : ""}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            style={{ ...S.primaryButton, ...(!canSaveReschedule ? { opacity: 0.5 } : {}) }}
            disabled={!canSaveReschedule || rescheduleFetcher.state !== "idle"}
            onClick={handleReschedule}
          >
            Save
          </button>
          <button
            type="button"
            style={{ ...S.ghostButton }}
            onClick={() => setIsRescheduling(false)}
          >
            Cancel edit
          </button>
        </div>
      ) : (
        <div style={S.fieldsRow}>
          <FieldBlock label="Booking Date">{dateLabel}</FieldBlock>
          <FieldBlock label="Booking Time">{timeLabel ?? "Whole day"}</FieldBlock>
          <FieldBlock label="Quantity">{booking.quantity}</FieldBlock>
        </div>
      )}

      <hr style={S.detailsDivider} />

      <div style={S.actionRow}>
        <FieldBlock label="Booked at" style={S.actionRowField}>
          {formatInstantInTimezone(booking.createdAt, booking.locationTimezone)}
          {" · "}
          {bookingSourceLabel(booking.source)}
        </FieldBlock>
        <FieldBlock label="Note" style={S.actionRowField}>
          <BookingNotes
            responses={booking.customFieldResponses}
            labels={customFieldLabels}
          />
        </FieldBlock>

        {!isCancelled && !isCompleted ? (
          <div style={S.cancelBookingWrap}>
            {!isRescheduling && (
              <button
                type="button"
                style={S.rescheduleBookingBtn}
                onClick={() => setIsRescheduling(true)}
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              style={S.cancelBookingBtn}
              onClick={handleCancel}
            >
              Cancel Booking
            </button>
          </div>
        ) : (
          <div style={S.actionSpacer} />
        )}
      </div>

      {rescheduleError && <div style={S.errorBanner}>{rescheduleError}</div>}
    </div>
  );
}


const SLOT_LABELS = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];

function slotValueFor(booking: BookingWithProductTitle): string {
  const when = whenLines(booking);
  return when.sub ? `${when.date} · ${when.sub}` : when.date;
}

function BundleGroupDetails({
  group,
  customFieldLabels,
  onToggle,
}: {
  group: BookingGroup;
  customFieldLabels: Record<string, string>;
  onToggle?: () => void;
}) {
  const shopify = useAppBridge();
  const revalidator = useRevalidator();
  const [isCancelling, setIsCancelling] = useState(false);
  const rescheduleFetcher = useFetcher();
  const rescheduleSlotsFetcher = useFetcher();

  const first = group.bookings[0];
  const activeBookings = group.bookings.filter((b) => b.status !== "CANCELLED");

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleId, setRescheduleId] = useState(activeBookings[0]?.id ?? "");
  const rescheduleTarget =
    activeBookings.find((b) => b.id === rescheduleId) ?? activeBookings[0];
  const [newDate, setNewDate] = useState(rescheduleTarget?.date ?? "");
  const [newSlotStart, setNewSlotStart] = useState(
    rescheduleTarget?.slotStart ?? "",
  );

  const rescheduleSlots: TimeSlot[] =
    rescheduleSlotsFetcher.data?.intent === "loadRescheduleSlots" &&
    rescheduleSlotsFetcher.data.ok
      ? rescheduleSlotsFetcher.data.slots
      : [];
  const isLoadingRescheduleSlots = rescheduleSlotsFetcher.state !== "idle";
  const rescheduleError =
    rescheduleFetcher.data?.intent === "reschedule" &&
    !rescheduleFetcher.data.ok
      ? rescheduleFetcher.data.error
      : null;

  useEffect(() => {
    if (
      rescheduleFetcher.data?.intent === "reschedule" &&
      rescheduleFetcher.data.ok
    ) {
      shopify.toast.show("Session rescheduled");
      setIsRescheduling(false);
    }
  }, [rescheduleFetcher.data, shopify]);

  useEffect(() => {
    if (!isRescheduling || !rescheduleTarget || !newDate) return;
    rescheduleSlotsFetcher.submit(
      { intent: "loadRescheduleSlots", id: rescheduleTarget.id, date: newDate },
      { method: "POST" },
    );
  }, [isRescheduling, rescheduleTarget?.id, newDate]);

  useEffect(() => {
    if (rescheduleSlots.length === 0 || !rescheduleTarget) return;
    if (rescheduleSlots.some((s) => s.start === newSlotStart)) return;
    const current = rescheduleSlots.find(
      (s) => s.start === rescheduleTarget.slotStart,
    );
    const firstAvailable = rescheduleSlots.find((s) => s.available);
    setNewSlotStart((current ?? firstAvailable ?? rescheduleSlots[0]).start);
  }, [rescheduleSlots]);

  const startRescheduling = () => {
    const target = activeBookings[0];
    if (!target) return;
    setRescheduleId(target.id);
    setNewDate(target.date);
    setNewSlotStart(target.slotStart);
    setIsRescheduling(true);
  };

  const pickSession = (id: string) => {
    const target = activeBookings.find((b) => b.id === id);
    if (!target) return;
    setRescheduleId(id);
    setNewDate(target.date);
    setNewSlotStart(target.slotStart);
  };

  const handleRescheduleSession = () => {
    if (!rescheduleTarget) return;
    rescheduleFetcher.submit(
      {
        intent: "reschedule",
        id: rescheduleTarget.id,
        date: newDate,
        slotStart: newSlotStart,
        endDate: "",
      },
      { method: "POST" },
    );
  };
  const isCancelled = activeBookings.length === 0;
  const isCompleted =
    !isCancelled && group.bookings.every((b) => b.displayStatus === "COMPLETED");

  const statuses = new Set(group.bookings.map((b) => b.displayStatus));
  const groupStatus = statuses.size > 1 ? "MIXED" : first.displayStatus;
  const statusColors = STATUS_COLORS[groupStatus] ?? STATUS_COLORS.CONFIRMED;

  const when = whenLines(first);

  const handleCancelAll = async () => {
    setIsCancelling(true);
    for (const booking of activeBookings) {
      const formData = new FormData();
      formData.set("intent", "cancel");
      formData.set("id", booking.id);
      await fetch(window.location.pathname + window.location.search, {
        method: "POST",
        body: formData,
      });
    }
    setIsCancelling(false);
    shopify.toast.show("Bundle cancelled");
    revalidator.revalidate();
  };

  return (
    <div style={S.detailsCard}>
      <div style={S.detailsHeaderRow}>
        <div style={S.detailsHeaderLeft}>
          <span style={S.bookingForText}>Booking for</span>
          <span style={S.customerChip}>{first.customerName ?? "—"}</span>
        </div>

        <div style={S.dateTimeChipsRow}>
          <span style={S.dateTimeChip}>{when.date}</span>
          {when.sub && <span style={S.dateTimeChip}>{when.sub}</span>}
        </div>

        <div
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "16px" }}
        >
          <span
            style={{
              ...S.statusChipLarge,
              background: statusColors.bg,
              color: statusColors.fg,
            }}
          >
            {groupStatus.toLowerCase()}
          </span>
          {onToggle && (
            <button
              type="button"
              style={S.chevronToggle}
              onClick={onToggle}
              aria-label="Collapse booking details"
            >
              <ChevronToggleIcon expanded />
            </button>
          )}
        </div>
      </div>

      <hr style={S.detailsDivider} />

      <div style={S.fieldsRow}>
        <FieldBlock label="Customer Mail">
          {first.customerEmail ?? "—"}
        </FieldBlock>
        <FieldBlock label="Customer Phone">
          {first.customerPhone ?? "—"}
        </FieldBlock>
        <FieldBlock label="Booking Type">
          {TYPE_SHORT_LABELS[first.bookingType]}
        </FieldBlock>
        <FieldBlock label="Location">{first.location ?? "—"}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      <div style={S.fieldsRow}>
        <FieldBlock label="Booking Date">{when.date}</FieldBlock>
        <FieldBlock label="Booking Time">{when.sub ?? "Whole day"}</FieldBlock>
        <FieldBlock label="Quantity">{first.quantity}</FieldBlock>
      </div>

      <hr style={S.detailsDivider} />

      {Array.from(
        { length: Math.ceil(Math.min(group.bookings.length, SLOT_LABELS.length) / 3) },
        (_, rowIndex) => (
          <Fragment key={rowIndex}>
            <div style={S.fieldsRow}>
              {group.bookings.slice(rowIndex * 3, rowIndex * 3 + 3).map((booking, i) => (
                <FieldBlock
                  key={booking.id}
                  label={SLOT_LABELS[rowIndex * 3 + i] ?? `Slot ${rowIndex * 3 + i + 1}`}
                >
                  {slotValueFor(booking)}
                </FieldBlock>
              ))}
            </div>
            <hr style={S.detailsDivider} />
          </Fragment>
        ),
      )}

      {isRescheduling && rescheduleTarget && (
        <>
          <div
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
              value={rescheduleTarget.id}
              onChange={(e) => pickSession(e.target.value)}
            >
              {activeBookings.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {`Slot ${group.bookings.indexOf(b) + 1} · ${formatDateDisplay(b.date)}`}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="New date"
              style={{ ...S.input, width: "160px", cursor: "pointer" }}
              value={newDate}
              onClick={(e) => {
                const el = e.currentTarget;
                if (typeof el.showPicker === "function") {
                  el.showPicker();
                }
              }}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <select
              aria-label="New time"
              style={{ ...S.input, width: "240px" }}
              value={newSlotStart}
              disabled={isLoadingRescheduleSlots || rescheduleSlots.length === 0}
              onChange={(e) => setNewSlotStart(e.target.value)}
            >
              {isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                <option value="">Loading times…</option>
              )}
              {!isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                <option value="">No times on this date</option>
              )}
              {rescheduleSlots.map((slot) => (
                <option
                  key={slot.startsAt}
                  value={slot.start}
                  disabled={
                    !slot.available && slot.start !== rescheduleTarget.slotStart
                  }
                >
                  {formatTimeRangeDisplay(slot.start, slot.end)}
                  {!slot.available && slot.start !== rescheduleTarget.slotStart
                    ? " (booked)"
                    : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{ ...S.primaryButton, ...(!newSlotStart ? { opacity: 0.5 } : {}) }}
              disabled={!newSlotStart || rescheduleFetcher.state !== "idle"}
              onClick={handleRescheduleSession}
            >
              Save
            </button>
            <button
              type="button"
              style={{ ...S.ghostButton }}
              onClick={() => setIsRescheduling(false)}
            >
              Cancel edit
            </button>
          </div>
          {rescheduleError && <div style={S.errorBanner}>{rescheduleError}</div>}
          <hr style={S.detailsDivider} />
        </>
      )}

      <div style={S.actionRow}>
        <FieldBlock label="Booked at" style={S.actionRowField}>
          {formatInstantInTimezone(first.createdAt, first.locationTimezone)}
          {" · "}
          {bookingSourceLabel(first.source)}
        </FieldBlock>
        <FieldBlock label="Note" style={S.actionRowField}>
          <BookingNotes
            responses={first.customFieldResponses}
            labels={customFieldLabels}
          />
        </FieldBlock>

        {!isCancelled && !isCompleted ? (
          <div style={S.cancelBookingWrap}>
            {!isRescheduling && (
              <button
                type="button"
                style={S.rescheduleBookingBtn}
                onClick={startRescheduling}
              >
                Reschedule
              </button>
            )}
            <button
              type="button"
              style={{ ...S.cancelBookingBtn, ...(isCancelling ? { opacity: 0.5 } : {}) }}
              disabled={isCancelling}
              onClick={handleCancelAll}
            >
              {isCancelling ? "Cancelling…" : "Cancel Booking"}
            </button>
          </div>
        ) : (
          <div style={S.actionSpacer} />
        )}
      </div>
    </div>
  );
}


const COLUMN_COUNT = 6;

function SingleRow({
  booking,
  customFieldLabels,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const when = whenLines(booking);

  return (
    <Fragment>
      <tr>
        <td style={S.td} title={booking.customerName ?? undefined}>
          {booking.customerName ?? "—"}
        </td>
        <td style={S.td} title={booking.productTitle}>
          {booking.productTitle}
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>
          <StatusPill status={booking.displayStatus} />
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>
          {TYPE_SHORT_LABELS[booking.bookingType]}
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>
          {booking.bookingType === "MULTI_DAY" ? (
            <>
              <div>{formatDateDisplay(booking.date)}</div>
              <div
                aria-hidden="true"
                style={{
                  fontSize: "12px",
                  lineHeight: "12px",
                  color: TEXT_MUTED,
                }}
              >
                ↓
              </div>
              <div>
                {booking.endDate ? formatDateDisplay(booking.endDate) : "—"}
              </div>
            </>
          ) : (
            <>
              {when.date}
              {when.sub && <span style={S.subLine}>{when.sub}</span>}
            </>
          )}
        </td>
        <td style={{ ...S.td, ...S.tdAction }}>
          <EyeButton
            expanded={open}
            onClick={() => setOpen((v) => !v)}
            label={`${open ? "Hide" : "View"} details for ${
              booking.customerName ?? "booking"
            }`}
          />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={COLUMN_COUNT} style={{ ...S.td, ...S.tdExpanded }}>
            <BookingDetails
              booking={booking}
              customFieldLabels={customFieldLabels}
              onToggle={() => setOpen(false)}
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

function groupBookings(bookings: BookingWithProductTitle[]): BookingGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, BookingWithProductTitle[]>();

  for (const booking of bookings) {
    const key = booking.groupId
      ? `g:${booking.groupId}`
      : booking.orderId
        ? `o:${booking.orderId}`
        : `b:${booking.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.push(booking);
    } else {
      byKey.set(key, [booking]);
      order.push(key);
    }
  }

  return order.map((key) => ({ key, bookings: byKey.get(key)! }));
}

function GroupChild({
  booking,
  customFieldLabels,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const when = whenLines(booking);

  return (
    <div style={S.childBox}>
      <div style={S.childHeader}>
        <span>
          <strong style={{ fontWeight: 600 }}>{when.date}</strong>
          {when.sub ? ` · ${when.sub}` : ""}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <StatusPill status={booking.displayStatus} />
          <EyeButton
            expanded={open}
            onClick={() => setOpen((v) => !v)}
            label={`${open ? "Hide" : "View"} details`}
          />
        </span>
      </div>
      {open && (
        <div style={{ padding: "0 8px 8px" }}>
          <BookingDetails
            booking={booking}
            customFieldLabels={customFieldLabels}
            onToggle={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function GroupRow({
  group,
  customFieldLabels,
}: {
  group: BookingGroup;
  customFieldLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const first = group.bookings[0];
  const productTitles = new Set(group.bookings.map((b) => b.productTitle));
  const productLabel =
    productTitles.size > 1 ? "Multiple products" : first.productTitle;
  const statuses = new Set(group.bookings.map((b) => b.displayStatus));
  const groupStatus = statuses.size > 1 ? "MIXED" : first.displayStatus;

  return (
    <Fragment>
      <tr>
        <td style={S.td} title={first.customerName ?? undefined}>
          {first.customerName ?? "—"}
        </td>
        <td style={S.td} title={productLabel}>
          {productLabel}
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>
          <StatusPill status={groupStatus} />
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>
          {TYPE_SHORT_LABELS[first.bookingType]}
        </td>
        <td style={{ ...S.td, ...S.tdCenter }}>{group.bookings.length} slots</td>
        <td style={{ ...S.td, ...S.tdAction }}>
          <EyeButton
            expanded={open}
            onClick={() => setOpen((v) => !v)}
            label={`${open ? "Hide" : "View"} ${group.bookings.length} bookings for ${
              first.customerName ?? "customer"
            }`}
          />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={COLUMN_COUNT} style={{ ...S.td, ...S.tdExpanded }}>
            {first.bookingType === "BUNDLE" ? (
              <BundleGroupDetails
                group={group}
                customFieldLabels={customFieldLabels}
                onToggle={() => setOpen(false)}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {group.bookings.map((booking) => (
                  <GroupChild
                    key={booking.id}
                    booking={booking}
                    customFieldLabels={customFieldLabels}
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
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <div style={S.emptyWrap}>
      <p style={S.emptyTitle}>{title}</p>
      <p style={S.emptyText}>{message}</p>
    </div>
  );
}


function matchesQuery(booking: BookingWithProductTitle, term: string): boolean {
  const haystack = [
    booking.customerName,
    booking.customerEmail,
    booking.productTitle,
    booking.orderName,
    booking.date,
    formatDateDisplay(booking.date),
    booking.endDate,
    booking.endDate ? formatDateDisplay(booking.endDate) : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

function BookingsListPage({
  bookings: initialBookings,
  products,
  customFieldLabels,
  filters,
}: {
  bookings: BookingWithProductTitle[];
  products: { id: string; title: string }[];
  customFieldLabels: Record<string, string>;
  filters: BookingsListFilters;
}) {
  const heading = "All Bookings";
  const emptyMessage =
    "No bookings yet — they'll show up here once customers start booking.";
  const showProductFilter = true;

  const bookingsFetcher = useFetcher<{ bookings: BookingWithProductTitle[] }>();

  const bookings = bookingsFetcher.data?.bookings ?? initialBookings;
  const isRefreshingBookings = bookingsFetcher.state !== "idle";

  const refreshBookings = () => {
    bookingsFetcher.load(window.location.pathname + window.location.search);
  };

  const [query, setQuery] = useState(filters.search);
  const [status, setStatus] = useState(filters.status);
  const [productId, setProductId] = useState(filters.bookableProductId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.bookableProductId ||
      filters.dateFrom ||
      filters.dateTo,
  );
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (status) params.set("status", status);
    if (productId) params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.search = params.toString();
  };

  const clearFilters = () => {
    window.location.search = "";
  };

  const visibleBookings = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((b) => matchesQuery(b, term));
  }, [bookings, query]);

  const bookingGroups = useMemo(
    () => groupBookings(visibleBookings),
    [visibleBookings],
  );

  const isFiltering = hasActiveFilters || query.trim().length > 0;

  return (
    <s-page heading="Bookings" inlineSize="950px" style={{ fontFamily: "Inter" }}>
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
            <p style={S.listTitle}>{heading}</p>
            <div style={S.headerActions}>
              <div style={S.searchBox}>
                <SearchIcon />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters();
                  }}
                  placeholder="Search by email and date"
                  aria-label="Search bookings"
                  style={S.searchInput}
                />
              </div>
              <button
                type="button"
                style={{
                  ...S.squareIconButton,
                  ...(filtersOpen || hasActiveFilters
                    ? S.squareIconButtonActive
                    : {}),
                }}
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-label={filtersOpen ? "Hide filters" : "Show filters"}
                title="Filters"
              >
                <FilterIcon />
              </button>
              <button
                type="button"
                style={{
                  ...S.squareIconButton,
                  ...(isRefreshingBookings ? { opacity: 0.5 } : {}),
                }}
                onClick={refreshBookings}
                disabled={isRefreshingBookings}
                aria-label="Refresh bookings"
                title="Refresh"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div style={S.filterPanel}>
              <label style={S.filterField}>
                <span style={S.fieldLabel}>Status</span>
                <select
                  style={S.input}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
                    </option>
                  ))}
                </select>
              </label>
              {showProductFilter && (
                <label style={S.filterField}>
                  <span style={S.fieldLabel}>Product</span>
                  <select
                    style={S.input}
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">All</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
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
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label style={S.filterField}>
                <span style={S.fieldLabel}>To</span>
                <input
                  type="date"
                  style={S.input}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" style={S.primaryButton} onClick={applyFilters}>
                  Apply
                </button>
                {(hasActiveFilters || filters.search) && (
                  <button type="button" style={S.ghostButton} onClick={clearFilters}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          <hr style={S.divider} />

          {bookingGroups.length === 0 ? (
            <BookingsEmptyState
              title={isFiltering ? "No matching bookings" : "You're all caught up"}
              message={
                isFiltering
                  ? "No bookings match your search or filters. Try adjusting or clearing them to see more."
                  : emptyMessage
              }
            />
          ) : (
            <div
              style={{
                ...S.tableWrap,
                ...(isRefreshingBookings ? { opacity: 0.6 } : {}),
              }}
            >
              <table style={S.table}>
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
                  {bookingGroups.map((group) =>
                    group.bookings.length === 1 ? (
                      <SingleRow
                        key={group.key}
                        booking={group.bookings[0]}
                        customFieldLabels={customFieldLabels}
                      />
                    ) : (
                      <GroupRow
                        key={group.key}
                        group={group}
                        customFieldLabels={customFieldLabels}
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