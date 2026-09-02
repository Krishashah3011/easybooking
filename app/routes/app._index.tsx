import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { countBookings } from "../models/booking.server";
import { getSmtpSettings } from "../models/smtpSettings.server";
import { listEnabledLocations, maybePrefillFirstLocationFromShopTimezone } from "../models/bookingLocation.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import { getBookingReportData, type BookingReportData } from "../models/bookingReports.server";
import GetStartedGuide, { type GuideStep } from "../components/GetStartedGuide";
import { useState } from "react";

const DIVIDER = "#DBDBDB";
const TEXT_BLACK = "#000000";

const ANALYTICS_ACCENT = "#073E74";
const TRACK_GREY = "#DBDBDB";
const MUTED_GREY = "#898989";

const analyticsStyles: Record<string, React.CSSProperties> = {
  card: {
    width: "950px",
    height: "353px",
    maxWidth: "950px",
    boxSizing: "border-box",
    marginInline: "auto",
    background: "#FFFFFF",
    border: "1px solid #E5E5E5",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "16px",
    overflow: "auto",
  },
  heading: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "18px",
    lineHeight: "normal",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${DIVIDER}`,
    margin: 0,
    width: "100%",
  },
  filterRow: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  filterField: {
    flex: "1 1 200px",
    minWidth: "160px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filterLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    color: TEXT_BLACK,
  },
  selectInput: {
    height: "34px",
    width: "100%",
    boxSizing: "border-box",
    background: "#FFFFFF",
    border: "1px solid #DBDBDB",
    borderRadius: "4px",
    padding: "7px 8px",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    color: TEXT_BLACK,
  },
  dateInput: {
    height: "34px",
    width: "100%",
    boxSizing: "border-box",
    background: "#FFFFFF",
    border: "1px solid #E9E9EA",
    borderRadius: "4px",
    padding: "5px 10px",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    color: TEXT_BLACK,
  },
  applyButton: {
    height: "34px",
    boxSizing: "border-box",
    background: ANALYTICS_ACCENT,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "0 16px",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  applyButtonWrap: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  statsRow: {
    display: "flex",
    gap: "18px",
    width: "100%",
    flexWrap: "wrap",
  },
  statTile: {
    flex: "1 1 0",
    minWidth: "180px",
    background: "#FFFFFF",
    border: `1px solid ${TRACK_GREY}`,
    borderRadius: "8px",
    padding: "9px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    textDecoration: "none",
    color: "inherit",
  },
  statTileHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statTileLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    color: TEXT_BLACK,
    margin: 0,
  },
  statTileFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statTileValue: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: "28px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  barRows: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  barRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
  },
  barRowLabels: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    width: "100%",
  },
  barRowLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    color: TEXT_BLACK,
    margin: 0,
  },
  barRowMeta: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    color: MUTED_GREY,
    margin: 0,
  },
  barTrack: {
    position: "relative",
    height: "6px",
    borderRadius: "100px",
    background: TRACK_GREY,
    width: "100%",
    overflow: "hidden",
  },
  barFill: {
    position: "absolute",
    top: "1px",
    left: 0,
    height: "4px",
    borderRadius: "100px",
    background: ANALYTICS_ACCENT,
  },
  emptyState: {
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    color: MUTED_GREY,
    textAlign: "center",
    padding: "8px 0",
    margin: 0,
  },
};

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 2.5H4.16667L5.85 10.9333C5.91056 11.2372 6.07596 11.51 6.31735 11.7043C6.55875 11.8986 6.86094 12.0022 7.17083 11.9958H14.9375C15.2474 12.0022 15.5496 11.8986 15.791 11.7043C16.0324 11.51 16.1978 11.2372 16.2583 10.9333L17.5 4.58333H5"
        stroke={ANALYTICS_ACCENT}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="16.25" r="1.25" fill={ANALYTICS_ACCENT} />
      <circle cx="15" cy="16.25" r="1.25" fill={ANALYTICS_ACCENT} />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 1L5 5.5L1 10"
        stroke={ANALYTICS_ACCENT}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <a href={href} style={analyticsStyles.statTile}>
      <div style={analyticsStyles.statTileHeader}>
        <p style={analyticsStyles.statTileLabel}>{label}</p>
        <CartIcon />
      </div>
      <div style={analyticsStyles.statTileFooter}>
        <p style={analyticsStyles.statTileValue}>{value}</p>
        <ChevronIcon />
      </div>
    </a>
  );
}

function BarRows({
  rows,
  labelKey,
  countKey,
  emptyLabel,
}: {
  rows: Record<string, string | number>[];
  labelKey: string;
  countKey: string;
  emptyLabel: string;
}) {
  const visibleRows = rows.filter((r) => Number(r[countKey]) > 0).slice(0, 5);
  const total = rows.reduce((sum, r) => sum + Number(r[countKey]), 0);

  if (visibleRows.length === 0) {
    return <p style={analyticsStyles.emptyState}>{emptyLabel}</p>;
  }

  return (
    <div style={analyticsStyles.barRows}>
      {visibleRows.map((row) => {
        const count = Number(row[countKey]);
        const percentOfTotal = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={String(row[labelKey])} style={analyticsStyles.barRow}>
            <div style={analyticsStyles.barRowLabels}>
              <p style={analyticsStyles.barRowLabel}>{row[labelKey]}</p>
              <p style={analyticsStyles.barRowMeta}>
                {count} {count === 1 ? "Booking" : "Bookings"} - {percentOfTotal}%
              </p>
            </div>
            <div style={analyticsStyles.barTrack}>
              <div style={{ ...analyticsStyles.barFill, width: `${Math.max(percentOfTotal, 2)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const BOOKING_WIDGET_BLOCK_HANDLE = "booking-widget";

function buildGuideSteps(
  shop: string,
  apiKey: string,
  registered: boolean,
): GuideStep[] {
  const lockedSteps: GuideStep[] = [
    {
      title: "Turn on the booking widget",
      body: "Switch the EasyBooking app embed on in the theme editor. It shows up automatically on every bookable product page — no manual placement needed.",
      cta: "Activate App Embed",
      href: `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/${BOOKING_WIDGET_BLOCK_HANDLE}`,
      external: true,
    },
    {
      title: "Enable booking on your products",
      body: "Go to Products and turn on booking for each product customers should be able to book. You can override the shop's default schedule per product if needed.",
      cta: "Go to Products",
      href: "/app/products",
    },
    {
      title: "Set your booking schedule",
      body: "In Booking Settings, choose working days, daily hours, slot duration, buffer time between slots, how far in advance customers can book, how many bookings are allowed per slot, and set up your business locations.",
      cta: "Go to Booking Settings",
      href: "/app/booking-settings",
    },
    {
      title: "Block off unavailable days & collect extra info (optional)",
      body: "Add holidays or one-off closures on the Blackout Dates tab, shop-wide or for a specific product. You can also collect extra info like notes or special requests at booking time using Custom Fields — you'll see customers' answers on each booking.",
      cta: "Go to Blackout Dates",
      href: "/app/booking-settings/blackout-dates",
    },
    {
      title: "Turn on booking emails",
      body: "Configure SMTP in Settings → SMTP Settings so customers automatically get confirmation, reminder, and cancellation emails.",
      cta: "Go to Settings",
      href: "/app/settings",
    },
    {
      title: "Manage bookings as they come in",
      body: "View, search, reschedule, or cancel bookings from Bookings. You can also add bookings manually from the New Booking tab there. If two customers ever land in the same slot, it's flagged as Overbooked so you can review and resolve it — you'll see a banner for that at the top of this page when it happens.",
      cta: "Go to Bookings",
      href: "/app/bookings",
    },
  ].map((step) => ({ ...step, locked: !registered }));

  return [
    {
      title: "Create your account",
      body: "Register with your name and email to unlock the rest of EasyBooking. Every other page stays locked until this is done.",
      cta: "Register",
      href: "/app/account",
      done: registered,
    },
    ...lockedSteps,
  ];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfWeekISO(): string {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return end.toISOString().slice(0, 10);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopSettings = await getOrCreateShopSettings(session.shop);
  const shared = {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    registered: shopSettings.registered,
  };

  if (!shopSettings.registered) {
    return {
      stats: { todayCount: 0, weekCount: 0, overbookedCount: 0, enabledProductCount: 0 },
      smtpConfigured: false,
      hasLocations: false,
      report: null as BookingReportData | null,
      reportProducts: [] as { id: string; title: string }[],
      reportFilters: { bookableProductId: "", dateFrom: "", dateTo: "" },
      ...shared,
    };
  }

  const url = new URL(request.url);
  const bookableProductId = url.searchParams.get("productId") || undefined;
  const reportDateFrom = url.searchParams.get("dateFrom") || undefined;
  const reportDateTo = url.searchParams.get("dateTo") || undefined;

  const today = todayISO();
  const weekEnd = endOfWeekISO();

  const [
    ,
    products,
    todayCount,
    weekCount,
    overbookedCount,
    smtpSettings,
    enabledLocations,
    report,
  ] = await Promise.all([
    maybePrefillFirstLocationFromShopTimezone(session.shop, admin),
    listBookableProducts(session.shop),
    countBookings(session.shop, { dateFrom: today, dateTo: today }),
    countBookings(session.shop, { dateFrom: today, dateTo: weekEnd }),
    countBookings(session.shop, { status: "OVERBOOKED" }),
    getSmtpSettings(session.shop),
    listEnabledLocations(session.shop),
    getBookingReportData(session.shop, {
      bookableProductId,
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    }),
  ]);

  const enabledProductCount = products.filter((p: { isEnabled: boolean }) => p.isEnabled).length;
  const smtpConfigured = Boolean(
    smtpSettings?.host &&
      smtpSettings.port &&
      smtpSettings.username &&
      smtpSettings.password &&
      smtpSettings.fromEmail,
  );

  return {
    stats: { todayCount, weekCount, overbookedCount, enabledProductCount },
    smtpConfigured,
    hasLocations: enabledLocations.length > 0,
    report,
    reportProducts: products
      .filter((p: { isEnabled: boolean }) => p.isEnabled)
      .map((p: { id: string; productTitle: string }) => ({ id: p.id, title: p.productTitle })),
    reportFilters: {
      bookableProductId: bookableProductId ?? "",
      dateFrom: reportDateFrom ?? "",
      dateTo: reportDateTo ?? "",
    },
    ...shared,
  };
};

export default function Dashboard() {
  const {
    stats,
    smtpConfigured,
    hasLocations,
    shop,
    apiKey,
    registered,
    report,
    reportProducts,
    reportFilters,
  } = useLoaderData<typeof loader>();
  const guideSteps = buildGuideSteps(shop, apiKey, registered);

  const [productId, setProductId] = useState(reportFilters.bookableProductId);
  const [dateFrom, setDateFrom] = useState(reportFilters.dateFrom);
  const [dateTo, setDateTo] = useState(reportFilters.dateTo);

  const applyReportFilters = () => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.search = params.toString();
  };

  const setupSteps = [
    {
      done: hasLocations,
      label: "Add at least one location so booking times use the right timezone",
      href: "/app/booking-settings/locations",
      cta: "Go to Locations",
    },
    {
      done: stats.enabledProductCount > 0,
      label: "Enable at least one product for booking",
      href: "/app/products",
      cta: "Go to Products",
    },
    {
      done: smtpConfigured,
      label: "Configure SMTP so booking emails can send",
      href: "/app/settings",
      cta: "Go to Settings",
    },
  ];
  const remainingSteps = setupSteps.filter((s) => !s.done);

  return (
    <s-page heading="Dashboard" inlineSize="large" style={{ width: "950px", maxWidth: "950px", boxSizing: "border-box", marginInline: "auto" }}>
      {!registered && (
        <s-banner tone="info" heading="Register to unlock EasyBooking">
          <s-paragraph>
            Create your account with a name and email to unlock every page
            of the app. Until then, this dashboard only shows the user
            guide below.
          </s-paragraph>
          <s-link href="/app/account">Go to Account</s-link>
        </s-banner>
      )}

      {registered && (
        <>
          {stats.overbookedCount > 0 && (
            <s-banner tone="critical" heading="Bookings need review">
              <s-paragraph>
                {stats.overbookedCount === 1
                  ? "1 booking landed in an already-full slot and needs a look."
                  : `${stats.overbookedCount} bookings landed in already-full slots and need a look.`}
              </s-paragraph>
              <s-link href="/app/bookings?status=OVERBOOKED">
                Review overbooked bookings
              </s-link>
            </s-banner>
          )}

          {remainingSteps.length > 0 && (
            <s-section heading="Get set up">
              <s-stack direction="block" gap="base">
                {remainingSteps.map((step) => (
                  <s-stack
                    key={step.label}
                    direction="inline"
                    gap="base"
                    alignItems="center"
                  >
                    <s-paragraph>{step.label}</s-paragraph>
                    <s-link href={step.href}>{step.cta}</s-link>
                  </s-stack>
                ))}
              </s-stack>
            </s-section>
          )}
        </>
      )}

      <GetStartedGuide
        appName="EasyBooking"
        intro="A quick walkthrough of how to get bookings running end to end."
        steps={guideSteps}
      />

      {registered && report && (
        <>
          <div style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Store Analytics</h2>
            <div style={analyticsStyles.filterRow}>
              <div style={analyticsStyles.filterField}>
                <label style={analyticsStyles.filterLabel}>Products</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  style={analyticsStyles.selectInput}
                >
                  <option value="">All Products</option>
                  {reportProducts.map((p: { id: string; title: string }) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={analyticsStyles.filterField}>
                <label style={analyticsStyles.filterLabel}>From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={analyticsStyles.dateInput}
                />
              </div>
              <div style={analyticsStyles.filterField}>
                <label style={analyticsStyles.filterLabel}>To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={analyticsStyles.dateInput}
                />
              </div>
              <div style={analyticsStyles.applyButtonWrap}>
                <button type="button" onClick={applyReportFilters} style={analyticsStyles.applyButton}>
                  Apply
                </button>
              </div>
            </div>
            <hr style={analyticsStyles.divider} />
            <div style={analyticsStyles.statsRow}>
              <StatTile
                label="Bookings Today"
                value={stats.todayCount}
                href={`/app/bookings?dateFrom=${todayISO()}&dateTo=${todayISO()}`}
              />
              <StatTile label="Total Bookings" value={report.totalBookings} href="/app/bookings" />
              <StatTile
                label="Overbooked (needs review)"
                value={report.overbookedCount}
                href="/app/bookings?status=OVERBOOKED"
              />
            </div>
            <div style={analyticsStyles.statsRow}>
              <StatTile
                label="Confirmed Bookings"
                value={report.confirmedCount}
                href="/app/bookings?status=CONFIRMED"
              />
              <StatTile
                label="Cancellation Rate"
                value={`${report.cancellationRatePercent}%`}
                href="/app/reports"
              />
            </div>
          </div>

          <div style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Bookings by Product</h2>
            <hr style={analyticsStyles.divider} />
            <BarRows
              rows={report.bookingsByProduct}
              labelKey="productTitle"
              countKey="count"
              emptyLabel="No bookings yet for this range."
            />
          </div>

          <div style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Peak Hours</h2>
            <hr style={analyticsStyles.divider} />
            <BarRows
              rows={report.bookingsByHour}
              labelKey="hour"
              countKey="count"
              emptyLabel="No bookings yet for this range."
            />
          </div>

          <div style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Popular Days</h2>
            <hr style={analyticsStyles.divider} />
            <BarRows
              rows={report.bookingsByDayOfWeek}
              labelKey="day"
              countKey="count"
              emptyLabel="No bookings yet for this range."
            />
          </div>
        </>
      )}

    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};