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
import { to12Hour } from "../utils/format";
import { useState, useRef, useEffect } from "react";

const DIVIDER = "#DBDBDB";
const TEXT_BLACK = "#000000";

const ANALYTICS_ACCENT = "#073E74";
const TRACK_GREY = "#DBDBDB";
const MUTED_GREY = "#898989";

const analyticsStyles: Record<string, React.CSSProperties> = {
  outerCard: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${DIVIDER}`,
    borderRadius: "8px",
  },
  card: {
    height: "353px",
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
  reportsRow: {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    width: "100%",
    alignItems: "stretch",
  },
  reportCard: {
    flex: "1 1 0",
    minWidth: 0,
    height: "420px",
    background: "#FFFFFF",
    border: "1px solid #E5E5E5",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflow: "visible",
  },
  reportCardBody: {
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 0,
  },
  heading: {
    fontFamily: "Inter",
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
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    gap: "16px",
    width: "100%",
    maxWidth: "918px",
    height: "59px",
    flexWrap: "nowrap",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "1 1 198.5px",
    minWidth: 0,
    height: "59px",
  },
  productFilterField: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "1 1 413px",
    minWidth: 0,
    height: "59px",
  },
  filterLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
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
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
  },
  dateFieldBox: {
    height: "34px",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    background: "#FFFFFF",
    border: "1px solid #E9E9EA",
    borderRadius: "4px",
    padding: "5px 10px",
  },
  dateInput: {
    flex: "1 1 0",
    minWidth: 0,
    height: "100%",
    boxSizing: "border-box",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: 0,
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
  },
  applyButton: {
    width: "60px",
    height: "34px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: ANALYTICS_ACCENT,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "10px",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
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
    flexWrap: "nowrap",
  },
  statTile: {
    flex: "1 1 0",
    minWidth: 0,
    height: "88px",
    boxSizing: "border-box",
    background: "#FFFFFF",
    border: `1px solid ${TRACK_GREY}`,
    borderRadius: "8px",
    padding: "9px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
  },
  statTileHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statTileLabel: {
    fontFamily: "Inter",
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
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: "28px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  emptyState: {
    fontFamily: "Inter",
    fontSize: "14px",
    color: MUTED_GREY,
    textAlign: "center",
    padding: "8px 0",
    margin: 0,
  },
  donutWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    width: "100%",
  },
  donutSvgBox: {
    position: "relative",
    flex: "0 0 auto",
  },
  donutTooltip: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    background: "#FFFFFF",
    border: "1px solid #E5E5E5",
    borderRadius: "6px",
    padding: "6px 10px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.10)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 2,
  },
  donutTooltipLine1: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "6px",
  },
  donutInfoSwatch: {
    flex: "0 0 auto",
    width: "8px",
    height: "8px",
    borderRadius: "2px",
  },
  donutInfoLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "13px",
    color: TEXT_BLACK,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "90px",
  },
  donutInfoMeta: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "12px",
    color: MUTED_GREY,
    margin: 0,
    whiteSpace: "nowrap",
  },
  lineChartWrap: {
    position: "relative",
    width: "100%",
  },
  productTooltip: {
    maxWidth: "220px",
    whiteSpace: "normal",
  },
  productTooltipLabel: {
    maxWidth: "none",
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
    lineHeight: "1.3",
  },
  productCardBody: {
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
    minHeight: 0,
  },
};

const DONUT_PALETTE = ["#073E74", "#2E6DA4", "#5B94C4", "#9EC3E0", "#C9DFF0", "#898989"];

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
  icon = "/abandoned-cart-icon.svg",
  width,
}: {
  label: string;
  value: string | number;
  href: string;
  icon?: string;
  width?: string;
}) {
  return (
    <a
      className="eb-stat-tile"
      href={href}
      style={width ? { ...analyticsStyles.statTile, width } : analyticsStyles.statTile}
    >
      <div style={analyticsStyles.statTileHeader}>
        <p style={analyticsStyles.statTileLabel}>{label}</p>
        <img src={icon} alt="" width={20} height={20} />
      </div>
      <div style={analyticsStyles.statTileFooter}>
        <p style={analyticsStyles.statTileValue}>{value}</p>
        <ChevronIcon />
      </div>
    </a>
  );
}

function DonutChart({
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = rows.reduce((sum, r) => sum + Number(r[countKey]), 0);
  const sorted = rows
    .filter((r) => Number(r[countKey]) > 0)
    .sort((a, b) => Number(b[countKey]) - Number(a[countKey]));

  const top = sorted.slice(0, 5);
  const otherCount = sorted.slice(5).reduce((sum, r) => sum + Number(r[countKey]), 0);
  const segments = [
    ...top.map((r) => ({ label: String(r[labelKey]), count: Number(r[countKey]) })),
    ...(otherCount > 0 ? [{ label: "Other", count: otherCount }] : []),
  ];

  if (segments.length === 0) {
    return <p style={analyticsStyles.emptyState}>{emptyLabel}</p>;
  }

  const size = 188;
  const strokeWidth = 26;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulativePercent = 0;
  const segMeta = segments.map((seg) => {
    const percent = total ? (seg.count / total) * 100 : 0;
    const startAngleDeg = (cumulativePercent / 100) * 360 - 90;
    const midAngleDeg = startAngleDeg + percent * 1.8;
    cumulativePercent += percent;
    return { ...seg, percent, startAngleDeg, midAngleDeg };
  });

  const activeIndex = hoveredIndex ?? 0;
  const active = segMeta[activeIndex];
  const activePercent = Math.round(active.percent);

  const tooltipGap = 16;
  const tooltipRadius = size / 2 + tooltipGap;
  const angleRad = (active.midAngleDeg * Math.PI) / 180;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const tooltipLeft = cx + tooltipRadius * dx;
  const tooltipTop = cy + tooltipRadius * dy;

  const translateX = dx > 0.3 ? "0%" : dx < -0.3 ? "-100%" : "-50%";
  const translateY = dy > 0.3 ? "0%" : dy < -0.3 ? "-100%" : "-50%";

  return (
    <div className="eb-donut-wrap" style={analyticsStyles.donutWrap}>
      <div
        style={{ ...analyticsStyles.donutSvgBox, width: size, height: size }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={TRACK_GREY} strokeWidth={strokeWidth} />
          {segMeta.map((seg, i) => {
            const dash = (seg.percent / 100) * circumference;
            return (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                transform={`rotate(${seg.startAngleDeg} ${cx} ${cy})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}
        </svg>
        <div
          style={{
            ...analyticsStyles.donutTooltip,
            left: `${tooltipLeft}px`,
            top: `${tooltipTop}px`,
            transform: `translate(${translateX}, ${translateY})`,
          }}
        >
          <span style={analyticsStyles.donutTooltipLine1}>
            <span
              style={{ ...analyticsStyles.donutInfoSwatch, background: DONUT_PALETTE[activeIndex % DONUT_PALETTE.length] }}
            />
            <span style={analyticsStyles.donutInfoLabel}>{active.label}</span>
          </span>
          <span style={analyticsStyles.donutInfoMeta}>
            {active.count} {active.count === 1 ? "Booking" : "Bookings"} ({activePercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductLineChart({
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const total = rows.reduce((sum, r) => sum + Number(r[countKey]), 0);
  const visibleRows = rows
    .filter((r) => Number(r[countKey]) > 0)
    .sort((a, b) => Number(b[countKey]) - Number(a[countKey]))
    .slice(0, 6);

  if (visibleRows.length === 0) {
    return <p style={analyticsStyles.emptyState}>{emptyLabel}</p>;
  }

  const maxCount = Math.max(...visibleRows.map((r) => Number(r[countKey])));
  const plotAreaHeight = 130;
  const topPadding = 28;
  const baselineY = topPadding + plotAreaHeight;
  const chartHeight = baselineY + 40;
  const sidePadding = 24;
  const lineColor = ANALYTICS_ACCENT;

  const viewBoxWidth = Math.max(containerWidth, 240);
  const usablePlotWidth = Math.max(viewBoxWidth - sidePadding * 2, 0);
  const step = visibleRows.length > 1 ? usablePlotWidth / (visibleRows.length - 1) : 0;

  const points = visibleRows.map((row, i) => {
    const count = Number(row[countKey]);
    const label = String(row[labelKey]);
    const x = visibleRows.length > 1 ? sidePadding + i * step : viewBoxWidth / 2;
    const y = maxCount ? baselineY - (count / maxCount) * plotAreaHeight : baselineY;
    return { x, y, count, label };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  const activeIndex = hoveredIndex;
  const active = activeIndex !== null ? points[activeIndex] : null;
  const activePercent = active && total ? Math.round((active.count / total) * 100) : 0;
  const hitWidth = step > 0 ? step : viewBoxWidth;

  const tooltipTranslateX = active
    ? active.x < viewBoxWidth * 0.2
      ? "0%"
      : active.x > viewBoxWidth * 0.8
        ? "-100%"
        : "-50%"
    : "-50%";

  return (
    <div ref={containerRef} style={analyticsStyles.lineChartWrap} onMouseLeave={() => setHoveredIndex(null)}>
      {containerWidth > 0 && (
        <svg width={viewBoxWidth} height={chartHeight} viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="productLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={0} y1={baselineY} x2={viewBoxWidth} y2={baselineY} stroke={TRACK_GREY} strokeWidth={1} />
          <path d={areaPath} fill="url(#productLineFill)" stroke="none" />
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={p.label}>
              {}
              <rect
                x={p.x - hitWidth / 2}
                y={0}
                width={hitWidth}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIndex === i ? 6 : 4}
                fill="#FFFFFF"
                stroke={lineColor}
                strokeWidth={2}
                style={{ pointerEvents: "none" }}
              />
              {}
              <circle
                cx={p.x}
                cy={baselineY + 22}
                r={9}
                fill={activeIndex === i ? lineColor : "#F1F3F5"}
                style={{ pointerEvents: "none" }}
              />
              <text
                x={p.x}
                y={baselineY + 22}
                dy="0.35em"
                textAnchor="middle"
                fontSize="10"
                fontFamily="Inter"
                fontWeight={600}
                fill={activeIndex === i ? "#FFFFFF" : MUTED_GREY}
                style={{ pointerEvents: "none" }}
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      )}
      {active && (
        <div
          style={{
            ...analyticsStyles.donutTooltip,
            ...analyticsStyles.productTooltip,
            left: `${active.x}px`,
            top: `${active.y}px`,
            transform: `translate(${tooltipTranslateX}, calc(-100% - 12px))`,
          }}
        >
          <span style={analyticsStyles.donutTooltipLine1}>
            <span style={{ ...analyticsStyles.donutInfoSwatch, background: lineColor }} />
            <span style={{ ...analyticsStyles.donutInfoLabel, ...analyticsStyles.productTooltipLabel }}>
              {active.label}
            </span>
          </span>
          <span style={analyticsStyles.donutInfoMeta}>
            {active.count} {active.count === 1 ? "Booking" : "Bookings"} ({activePercent}%)
          </span>
        </div>
      )}
    </div>
  );
}

const BOOKING_WIDGET_BLOCK_HANDLE = "booking-widget";

function buildGuideSteps(
  shop: string,
  apiKey: string,
  registered: boolean,
): GuideStep[] {
  const workingSteps: GuideStep[] = [
    {
      title: "Turn on the booking widget",
      body: "Switch the EasyBooking app embed on in the theme editor. It shows up automatically on every bookable product page - no manual placement needed.",
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
      title: "Set your booking schedule and Location",
      body: "In Booking Settings, set your working days, hours, slot rules, and det up your business locations.",
      cta: "Go to Booking Settings",
      href: "/app/settings/booking",
    },
    {
      title: "Block off unavailable days & collect extra info (optional)",
      body: "Add holidays or closures on the Blackout Dates tab, shop-wide or for a specific product. You can also collect extra info like notes or special requests at booking time using Custom Fields.",
      cta: "Go to Blackout Dates",
      href: "/app/settings/blackout-dates",
    },
    {
      title: "Turn on booking emails",
      body: "Configure SMTP Settings so customers automatically get confirmation, reminder, and cancellation emails.",
      cta: "Go to Email Settings",
      href: "/app/settings/email",
    },
    {
      title: "Manage bookings as they come in",
      body: "View, search, reschedule, or cancel bookings from Bookings. You can also add bookings manually from the New Booking tab there.",
      cta: "Go to Bookings",
      href: "/app/bookings",
    },
  ];

  return [
    {
      title: "Create your account",
      body: "Register with your name and email to unlock the rest of EasyBooking.",
      cta: "Register",
      href: "/app/account",
      done: registered,
    },
    ...workingSteps,
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
      href: "/app/settings/locations",
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
      href: "/app/settings/email",
      cta: "Go to Settings",
    },
  ];
  const remainingSteps = setupSteps.filter((s) => !s.done);

  return (
    <s-page heading="Dashboard" inlineSize="950px" style={{ fontFamily: "Inter" }}>
      <GetStartedGuide
        appName="EasyBooking"
        intro="A quick walkthrough of how to get bookings running end to end."
        steps={guideSteps}
      />

      <div style={analyticsStyles.outerCard}>
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

      {registered && report && (
        <>
          <style>{`
            .eb-date-input::-webkit-calendar-picker-indicator {
              opacity: 0;
              position: absolute;
              right: 0;
              width: 100%;
              height: 100%;
              cursor: pointer;
            }
            .eb-date-input {
              position: relative;
            }
            @media (max-width: 700px) {
              .eb-analytics-card {
                height: auto !important;
              }
              .eb-reports-row {
                flex-direction: column !important;
              }
              .eb-report-card {
                height: auto !important;
                width: 100% !important;
              }
              .eb-analytics-filter-row {
                flex-wrap: wrap !important;
                height: auto !important;
              }
              .eb-analytics-filter-row > div {
                flex: 1 1 100% !important;
                height: auto !important;
              }
              .eb-analytics-stats-row {
                flex-wrap: wrap !important;
              }
              .eb-stat-tile {
                flex: 1 1 calc(50% - 9px) !important;
              }
            }
            @media (max-width: 420px) {
              .eb-stat-tile {
                flex: 1 1 100% !important;
              }
            }
          `}</style>
          <div className="eb-analytics-card" style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Store Analytics</h2>
            <div className="eb-analytics-filter-row" style={analyticsStyles.filterRow}>
              <div style={analyticsStyles.productFilterField}>
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
                <div style={analyticsStyles.dateFieldBox}>
                  <img src="/date-icon.svg" alt="" width={20} height={20} />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={analyticsStyles.dateInput}
                    className="eb-date-input"
                  />
                </div>
              </div>
              <div style={analyticsStyles.filterField}>
                <label style={analyticsStyles.filterLabel}>To</label>
                <div style={analyticsStyles.dateFieldBox}>
                  <img src="/date-icon.svg" alt="" width={20} height={20} />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={analyticsStyles.dateInput}
                    className="eb-date-input"
                  />
                </div>
              </div>
              <div style={analyticsStyles.applyButtonWrap}>
                <button type="button" onClick={applyReportFilters} style={analyticsStyles.applyButton}>
                  Apply
                </button>
              </div>
            </div>
            <hr style={analyticsStyles.divider} />
            <div className="eb-analytics-stats-row" style={analyticsStyles.statsRow}>
              <StatTile
                label="Bookings Today"
                value={stats.todayCount}
                href={`/app/bookings?dateFrom=${todayISO()}&dateTo=${todayISO()}`}
              />
              <StatTile
                label="Total Bookings"
                value={report.totalBookings}
                href="/app/bookings"
                icon="/cart-total.svg"
              />
              <StatTile
                label="Overbooked (needs review)"
                value={report.overbookedCount}
                href="/app/bookings?status=OVERBOOKED"
                icon="/msg-icon.svg"
              />
            </div>
            <div className="eb-analytics-stats-row" style={analyticsStyles.statsRow}>
              <StatTile
                label="Confirmed Bookings"
                value={report.confirmedCount}
                href="/app/bookings?status=CONFIRMED"
              />
              <StatTile
                label="Cancellation Rate"
                value={`${report.cancellationRatePercent}%`}
                href="/app/bookings?status=CANCELLED"
              />
            </div>
          </div>

          <div className="eb-reports-row" style={analyticsStyles.reportsRow}>
            <div className="eb-analytics-card eb-report-card" style={analyticsStyles.reportCard}>
              <h2 style={analyticsStyles.heading}>Peak Hours</h2>
              <hr style={analyticsStyles.divider} />
              <div style={analyticsStyles.reportCardBody}>
                <DonutChart
                  rows={report.bookingsByHour.map((r) => ({ ...r, hour: to12Hour(r.hour) }))}
                  labelKey="hour"
                  countKey="count"
                  emptyLabel="No bookings yet for this range."
                />
              </div>
            </div>

            <div className="eb-analytics-card eb-report-card" style={analyticsStyles.reportCard}>
              <h2 style={analyticsStyles.heading}>Popular Days</h2>
              <hr style={analyticsStyles.divider} />
              <div style={analyticsStyles.reportCardBody}>
                <DonutChart
                  rows={report.bookingsByDayOfWeek}
                  labelKey="day"
                  countKey="count"
                  emptyLabel="No bookings yet for this range."
                />
              </div>
            </div>
          </div>

          <div className="eb-analytics-card" style={analyticsStyles.card}>
            <h2 style={analyticsStyles.heading}>Bookings by Product</h2>
            <hr style={analyticsStyles.divider} />
            <div style={analyticsStyles.productCardBody}>
              <ProductLineChart
                rows={report.bookingsByProduct}
                labelKey="productTitle"
                countKey="count"
                emptyLabel="No bookings yet for this range."
              />
            </div>
          </div>
        </>
      )}

      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};