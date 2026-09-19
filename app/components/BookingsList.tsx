import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { BookingType } from "@prisma/client";
import type { BookingWithProductTitle } from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";
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
} from "./SettingsUI";

export type FieldChangeEvent = { currentTarget: { value: string } };

export const STATUS_OPTIONS = [
  "",
  "CONFIRMED",
  "RESCHEDULED",
  "OVERBOOKED",
  "CANCELLED",
] as const;

export type BookingsListFilters = {
  status: string;
  bookableProductId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

/* ------------------------------------------------------------------ */
/* Design tokens (same values as the redesigned Products page)         */
/* ------------------------------------------------------------------ */

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
    borderRadius: "8px",
    padding: "16px",
    marginTop: "16px",
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
    fontSize: "13px",
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
    fontSize: "13px",
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
    fontSize: "13px",
    lineHeight: "16px",
    color: TEXT_DARK,
  },
  detailLabel: {
    minWidth: "100px",
    flexShrink: 0,
    color: TEXT_MUTED,
    fontWeight: 500,
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
    fontSize: "13px",
    color: TEXT_DARK,
  },
  errorBanner: {
    fontFamily: "Inter",
    fontSize: "13px",
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
    fontSize: "15px",
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

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

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
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3 5.5H10M14 5.5H17M3 14.5H6M10 14.5H17"
      stroke={BLUE}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="5.5" r="2" stroke={BLUE} strokeWidth="1.5" />
    <circle cx="8" cy="14.5" r="2" stroke={BLUE} strokeWidth="1.5" />
  </svg>
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

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="7.25" stroke={BLUE} strokeWidth="1" />
    <path d="M8 7.2V11.2" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="4.9" r="0.8" fill={BLUE} />
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

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Expanded details for one booking (reschedule / cancel live here)    */
/* ------------------------------------------------------------------ */

function BookingDetails({
  booking,
  customFieldLabels,
}: {
  booking: BookingWithProductTitle;
  customFieldLabels: Record<string, string>;
}) {
  const cancelFetcher = useFetcher();
  const rescheduleFetcher = useFetcher();
  const rescheduleSlotsFetcher = useFetcher();
  const shopify = useAppBridge();

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(booking.date);
  const [newSlotStart, setNewSlotStart] = useState(booking.slotStart);

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
    if (!isRescheduling || !newDate) return;
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
      },
      { method: "POST" },
    );
  };

  const isCompleted = booking.displayStatus === "COMPLETED";

  return (
    <div style={S.detailsPanel}>
      <DetailRow label="Customer">{booking.customerEmail ?? "—"}</DetailRow>
      <DetailRow label="Location">{booking.location ?? "—"}</DetailRow>

      {isRescheduling && (
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
            style={{ ...S.input, width: "160px" }}
            value={newDate}
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
          <button
            type="button"
            style={{ ...S.primaryButton, ...(!newSlotStart ? { opacity: 0.5 } : {}) }}
            disabled={!newSlotStart}
            onClick={handleReschedule}
          >
            Save
          </button>
        </div>
      )}

      <DetailRow label="Type">{TYPE_SHORT_LABELS[booking.bookingType]}</DetailRow>

      <DetailRow label="Date">
        {booking.bookingType === "MULTI_DAY"
          ? `${formatDateDisplay(booking.date)} \u2192 ${
              booking.endDate ? formatDateDisplay(booking.endDate) : "—"
            }`
          : formatDateDisplay(booking.date)}
      </DetailRow>

      {booking.bookingType === "FULL_DAY" && (
        <DetailRow label="Booking">
          {formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}
        </DetailRow>
      )}

      {(booking.bookingType === "SLOT" || booking.bookingType === "BUNDLE") &&
        !isRescheduling && (
          <DetailRow label="Time">
            {formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}
          </DetailRow>
        )}

      <DetailRow label="Quantity">{booking.quantity}</DetailRow>

      <DetailRow label="Notes">
        <BookingNotes
          responses={booking.customFieldResponses}
          labels={customFieldLabels}
        />
      </DetailRow>

      <DetailRow label="Booked at">
        {formatInstantInTimezone(booking.createdAt, booking.locationTimezone)} ·{" "}
        {bookingSourceLabel(booking.source)}
      </DetailRow>

      <DetailRow label="Status">
        <StatusPill status={booking.displayStatus} />
      </DetailRow>

      {booking.status !== "CANCELLED" && !isCompleted && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {isRescheduling ? (
            <button
              type="button"
              style={{ ...S.textButton, color: TEXT_DARK }}
              onClick={() => setIsRescheduling(false)}
            >
              Cancel edit
            </button>
          ) : (
            booking.bookingType === "SLOT" && (
              <button
                type="button"
                style={S.textButton}
                onClick={() => setIsRescheduling(true)}
              >
                Reschedule
              </button>
            )
          )}
          <button
            type="button"
            style={{ ...S.textButton, color: "#C0392B" }}
            onClick={handleCancel}
          >
            Cancel booking
          </button>
        </div>
      )}

      {rescheduleError && <div style={S.errorBanner}>{rescheduleError}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

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
          {when.date}
          {when.sub && <span style={S.subLine}>{when.sub}</span>}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {group.bookings.map((booking) => (
                <GroupChild
                  key={booking.id}
                  booking={booking}
                  customFieldLabels={customFieldLabels}
                />
              ))}
            </div>
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

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

export function BookingsListPage({
  heading,
  bookings: initialBookings,
  products,
  customFieldLabels,
  filters,
  emptyMessage = "No bookings yet — they'll show up here once customers start booking.",
  showProductFilter = true,
}: {
  heading: string;
  bookings: BookingWithProductTitle[];
  products: { id: string; title: string }[];
  customFieldLabels: Record<string, string>;
  filters: BookingsListFilters;
  emptyMessage?: string;
  showProductFilter?: boolean;
}) {
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
    <s-page inlineSize="950px">
      <s-section>
        <div style={S.pageHeaderRow}>
          <div>
            <h1 style={settingsStyles.heading}>Bookings</h1>
            <div style={S.subtitleRow}>
              <p style={{ ...settingsStyles.pageSubtitle, margin: 0, fontSize: "12px" }}>
                Search, filter, reschedule or cancel every booking made in your
                store.
              </p>
              <InfoIcon />
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
      </s-section>
    </s-page>
  );
}