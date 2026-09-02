import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { BookingWithProductTitle } from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";
import { BOOKING_TYPE_LABELS } from "../models/bookingTypes";
import {
  bookingSourceLabel,
  formatBookingWhenDisplay,
  formatDateDisplay,
  formatTimeRangeDisplay,
} from "../utils/format";
import { formatInstantInTimezone } from "../utils/timezones";

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
    return <s-text tone="subdued">—</s-text>;
  }

  return (
    <s-stack direction="block" gap="none">
      {entries.map(([fieldKey, value]) => (
        <s-text key={fieldKey}>
          {(labels[fieldKey] ?? fieldKey) + ": " + value}
        </s-text>
      ))}
    </s-stack>
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
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      <span style={{ minWidth: "90px", flexShrink: 0 }}>
        <s-text tone="subdued">{label}</s-text>
      </span>
      <div>{children}</div>
    </div>
  );
}

function BookingLine({
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
  const [showDetails, setShowDetails] = useState(false);

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

  const badgeTone =
    booking.displayStatus === "CONFIRMED"
      ? "success"
      : booking.displayStatus === "RESCHEDULED"
        ? "info"
        : booking.displayStatus === "OVERBOOKED"
          ? "critical"
          : "neutral";

  return (
    <s-box borderWidth="base" borderRadius="base">
      <div
        onClick={() => setShowDetails((v) => !v)}
        style={{ cursor: "pointer", padding: "1rem" }}
      >
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-stack direction="inline" alignItems="center" gap="small">
            <span aria-hidden="true" style={{ display: "inline-block", width: "1rem" }}>
              {showDetails ? "⌄" : "›"}
            </span>
            <span style={{ fontWeight: 600 }}>
              {booking.customerName ?? "—"}
            </span>
            <s-text tone="subdued">{booking.productTitle}</s-text>
          </s-stack>

          <s-stack direction="inline" alignItems="center" gap="small">
            <s-text tone="subdued">
              {formatBookingWhenDisplay(booking)}
            </s-text>
            <s-badge tone={badgeTone}>{booking.displayStatus}</s-badge>
          </s-stack>
        </s-stack>
      </div>

      {showDetails && (
        <div
          style={{
            padding: "0 1rem 1rem",
            marginTop: "-0.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #e1e1e1",
          }}
        >
          <s-stack direction="block" gap="small">
            <DetailRow label="Customer">
              <s-text>{booking.customerEmail ?? "—"}</s-text>
            </DetailRow>

            <DetailRow label="Location">
              <s-text>{booking.location ?? "—"}</s-text>
            </DetailRow>

            {isRescheduling && (
              <s-stack direction="inline" alignItems="center" gap="small">
                <s-date-field
                  label="New date"
                  labelAccessibilityVisibility="exclusive"
                  value={newDate}
                  onChange={(e: FieldChangeEvent) =>
                    setNewDate(e.currentTarget.value)
                  }
                ></s-date-field>
                <s-select
                  label="New time"
                  labelAccessibilityVisibility="exclusive"
                  value={newSlotStart}
                  disabled={isLoadingRescheduleSlots || rescheduleSlots.length === 0}
                  onChange={(e: FieldChangeEvent) =>
                    setNewSlotStart(e.currentTarget.value)
                  }
                >
                  {isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                    <s-option value="">Loading times…</s-option>
                  )}
                  {!isLoadingRescheduleSlots && rescheduleSlots.length === 0 && (
                    <s-option value="">No times on this date</s-option>
                  )}
                  {rescheduleSlots.map((slot) => (
                    <s-option
                      key={slot.startsAt}
                      value={slot.start}
                      {...(!slot.available && slot.start !== booking.slotStart
                        ? { disabled: true }
                        : {})}
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
                    </s-option>
                  ))}
                </s-select>
                <s-button
                  variant="primary"
                  onClick={handleReschedule}
                  {...(!newSlotStart ? { disabled: true } : {})}
                >
                  Save
                </s-button>
              </s-stack>
            )}

            <DetailRow label="Type">
              <s-text>{BOOKING_TYPE_LABELS[booking.bookingType]}</s-text>
            </DetailRow>

            <DetailRow label="Date">
              <s-text>
                {booking.bookingType === "MULTI_DAY"
                  ? `${formatDateDisplay(booking.date)} \u2192 ${
                      booking.endDate ? formatDateDisplay(booking.endDate) : "—"
                    }`
                  : formatDateDisplay(booking.date)}
              </s-text>
            </DetailRow>

            {booking.bookingType === "FULL_DAY" && (
              <DetailRow label="Booking">
                <s-text>
                  {formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}
                </s-text>
              </DetailRow>
            )}

            {(booking.bookingType === "SLOT" || booking.bookingType === "BUNDLE") &&
              !isRescheduling && (
                <DetailRow label="Time">
                  <s-text>
                    {formatTimeRangeDisplay(booking.slotStart, booking.slotEnd)}
                  </s-text>
                </DetailRow>
              )}

            <DetailRow label="Quantity">
              <s-text>{booking.quantity}</s-text>
            </DetailRow>

            <DetailRow label="Notes">
              <BookingNotes
                responses={booking.customFieldResponses}
                labels={customFieldLabels}
              />
            </DetailRow>

            <DetailRow label="Booked at">
              <s-text>
                {formatInstantInTimezone(booking.createdAt, booking.locationTimezone)} ·{" "}
                {bookingSourceLabel(booking.source)}
              </s-text>
            </DetailRow>

            <DetailRow label="Status">
              <s-badge tone={badgeTone}>{booking.displayStatus}</s-badge>
            </DetailRow>

            {booking.status !== "CANCELLED" && !isCompleted && (
              <s-stack
                direction="inline"
                justifyContent="end"
                alignItems="center"
                gap="small"
              >
                {isRescheduling ? (
                  <s-button
                    variant="tertiary"
                    onClick={() => setIsRescheduling(false)}
                  >
                    Cancel edit
                  </s-button>
                ) : (
                  booking.bookingType === "SLOT" && (
                    <s-button
                      variant="tertiary"
                      onClick={() => setIsRescheduling(true)}
                    >
                      Reschedule
                    </s-button>
                  )
                )}
                <s-button variant="tertiary" tone="critical" onClick={handleCancel}>
                  Cancel booking
                </s-button>
              </s-stack>
            )}
          </s-stack>

          {rescheduleError && (
            <div style={{ marginTop: "0.5rem" }}>
              <s-banner tone="critical">{rescheduleError}</s-banner>
            </div>
          )}
        </div>
      )}
    </s-box>
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

function GroupCard({
  group,
  customFieldLabels,
  isExpanded,
  onToggle,
}: {
  group: BookingGroup;
  customFieldLabels: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const first = group.bookings[0];
  const productTitles = new Set(group.bookings.map((b) => b.productTitle));
  const productLabel =
    productTitles.size > 1 ? "Multiple products" : first.productTitle;
  const statuses = new Set(group.bookings.map((b) => b.displayStatus));
  const badgeTone =
    statuses.size > 1
      ? "neutral"
      : first.displayStatus === "CONFIRMED"
        ? "success"
        : first.displayStatus === "RESCHEDULED"
          ? "info"
          : first.displayStatus === "OVERBOOKED"
            ? "critical"
            : "neutral";

  return (
    <s-box borderWidth="base" borderRadius="base">
      <div onClick={onToggle} style={{ cursor: "pointer", padding: "1rem" }}>
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-stack direction="inline" alignItems="center" gap="small">
            <span aria-hidden="true" style={{ display: "inline-block", width: "1rem" }}>
              {isExpanded ? "⌄" : "›"}
            </span>
            <span style={{ fontWeight: 600 }}>{first.customerName ?? "—"}</span>
            <s-text tone="subdued">{productLabel}</s-text>
          </s-stack>

          <s-stack direction="inline" alignItems="center" gap="small">
            <s-text tone="subdued">
              {group.bookings.length} slots
            </s-text>
            {statuses.size > 1 ? (
              <s-badge tone={badgeTone}>Mixed</s-badge>
            ) : (
              <s-badge tone={badgeTone}>{first.displayStatus}</s-badge>
            )}
          </s-stack>
        </s-stack>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: "0 1rem 1rem",
            marginTop: "-0.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #e1e1e1",
          }}
        >
          <s-stack direction="block" gap="small">
            {group.bookings.map((booking) => (
              <BookingLine
                key={booking.id}
                booking={booking}
                customFieldLabels={customFieldLabels}
              />
            ))}
          </s-stack>
        </div>
      )}
    </s-box>
  );
}

function BookingsEmptyState({
  hasActiveFilters,
  noDataMessage,
}: {
  hasActiveFilters: boolean;
  noDataMessage: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "0.5rem",
        padding: "3rem 1rem",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "0.25rem",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {hasActiveFilters ? (
            <path
              d="M11 4a7 7 0 104.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
              fill="rgba(0,0,0,0.45)"
            />
          ) : (
            <path
              d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20 8l-1.4-1.4z"
              fill="rgba(0,0,0,0.45)"
            />
          )}
        </svg>
      </div>
      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
        {hasActiveFilters ? "No matching bookings" : "You're all caught up"}
      </span>
      <s-paragraph>
        {hasActiveFilters
          ? "No bookings match these filters. Try adjusting or clearing them to see more."
          : noDataMessage}
      </s-paragraph>
    </div>
  );
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
  const bookingGroups = groupBookings(bookings);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const refreshBookings = () => {
    bookingsFetcher.load(
      window.location.pathname + window.location.search,
    );
  };

  const [search, setSearch] = useState(filters.search);
  const [status, setStatus] = useState(filters.status);
  const [productId, setProductId] = useState(filters.bookableProductId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.bookableProductId ||
      filters.dateFrom ||
      filters.dateTo,
  );
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (productId) params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.search = params.toString();
  };

  return (
    <s-page heading={heading} inlineSize="large">
      <s-section accessibilityLabel="Filters">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-heading>Filters</s-heading>
          <s-button
            variant="tertiary"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? "Hide filters" : "Show filters"}
          </s-button>
        </s-stack>
        {filtersOpen && (
          <s-stack direction="inline" gap="base">
            <s-text-field
              label="Search customer or order"
              value={search}
              onChange={(e: FieldChangeEvent) =>
                setSearch(e.currentTarget.value)
              }
            ></s-text-field>
            <s-select
              label="Status"
              value={status}
              onChange={(e: FieldChangeEvent) =>
                setStatus(e.currentTarget.value)
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <s-option key={s} value={s}>
                  {s || "All"}
                </s-option>
              ))}
            </s-select>
            {showProductFilter && (
              <s-select
                label="Product"
                value={productId}
                onChange={(e: FieldChangeEvent) =>
                  setProductId(e.currentTarget.value)
                }
              >
                <s-option value="">All</s-option>
                {products.map((p) => (
                  <s-option key={p.id} value={p.id}>
                    {p.title}
                  </s-option>
                ))}
              </s-select>
            )}
            <s-date-field
              label="From"
              value={dateFrom}
              onChange={(e: FieldChangeEvent) =>
                setDateFrom(e.currentTarget.value)
              }
            ></s-date-field>
            <s-date-field
              label="To"
              value={dateTo}
              onChange={(e: FieldChangeEvent) =>
                setDateTo(e.currentTarget.value)
              }
            ></s-date-field>
            <s-button onClick={applyFilters}>Apply</s-button>
          </s-stack>
        )}
      </s-section>

      <s-section accessibilityLabel="Bookings">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-heading>Bookings</s-heading>
          <s-button
            onClick={refreshBookings}
            {...(isRefreshingBookings ? { loading: true } : {})}
          >
            Refresh
          </s-button>
        </s-stack>
        {bookings.length === 0 ? (
          <BookingsEmptyState
            hasActiveFilters={hasActiveFilters}
            noDataMessage={emptyMessage}
          />
        ) : (
          <s-stack direction="block" gap="small">
            {bookingGroups.map((group) =>
              group.bookings.length === 1 ? (
                <BookingLine
                  key={group.key}
                  booking={group.bookings[0]}
                  customFieldLabels={customFieldLabels}
                />
              ) : (
                <GroupCard
                  key={group.key}
                  group={group}
                  customFieldLabels={customFieldLabels}
                  isExpanded={expandedGroups.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                />
              ),
            )}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}