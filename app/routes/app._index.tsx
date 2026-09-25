import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProductsML } from "../models/bookableProduct.server";
import { countBookingsML } from "../models/booking.server";
import { getSmtpSettingsML } from "../models/smtpSettings.server";
import { listEnabledLocationsML, maybePrefillFirstLocationFromShopTimezoneML } from "../models/bookingLocation.server";
import { getOrCreateShopSettingsML } from "../models/shopSettings.server";
import { getBookingReportDataML, type BookingReportData } from "../models/bookingReports.server";
import GetStartedGuide, { type GuideStep } from "../components/GetStartedGuide";
import { to12HourML } from "../utils/format";
import { useState, useRef, useEffect } from "react";

const DIVIDER_ML = "#DBDBDB";
const TEXT_BLACK_ML = "#000000";

const ANALYTICS_ACCENT_ML = "#073E74";
const TRACK_GREY_ML = "#DBDBDB";
const MUTED_GREY_ML = "#898989";

const analyticsStylesML: Record<string, React.CSSProperties> = {
  outerCard: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${DIVIDER_ML}`,
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
  reportCardHeader: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    gap: "12px",
  },
  donutToggle: {
    display: "inline-flex",
    flexShrink: 0,
    boxSizing: "border-box",
    padding: "3px",
    gap: "2px",
    background: "#F2F9FF",
    border: "1px solid #D5E6F5",
    borderRadius: "10px",
  },
  donutToggleBtn: {
    border: "none",
    background: "transparent",
    color: "#4A5B6D",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "13px",
    lineHeight: "16px",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  donutToggleBtnActive: {
    background: ANALYTICS_ACCENT_ML,
    color: "#FFFFFF",
    fontWeight: 600,
  },

  heading: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "18px",
    lineHeight: "normal",
    letterSpacing: "0.02em",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${DIVIDER_ML}`,
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
    color: TEXT_BLACK_ML,
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
    color: TEXT_BLACK_ML,
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
    color: TEXT_BLACK_ML,
  },
  applyButton: {
    width: "60px",
    height: "34px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: ANALYTICS_ACCENT_ML,
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
    border: `1px solid ${TRACK_GREY_ML}`,
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
    color: TEXT_BLACK_ML,
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
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  emptyState: {
    fontFamily: "Inter",
    fontSize: "14px",
    color: MUTED_GREY_ML,
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
    color: TEXT_BLACK_ML,
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
    color: MUTED_GREY_ML,
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

const DONUT_PALETTE_ML = ["#073E74", "#2E6DA4", "#5B94C4", "#9EC3E0", "#C9DFF0", "#898989"];

function ChevronIcon() {
  return (
    <svg width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 1L5 5.5L1 10"
        stroke={ANALYTICS_ACCENT_ML}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({
  label: labelML,
  value: valueML,
  href: hrefML,
  icon: iconML = "/abandoned-cart-icon.svg",
  width: widthML,
}: {
  label: string;
  value: string | number;
  href: string;
  icon?: string;
  width?: string;
}) {
  return (
    <Link
      className="eb-stat-tile"
      to={hrefML}
      prefetch="intent"
      style={widthML ? { ...analyticsStylesML.statTile, width: widthML } : analyticsStylesML.statTile}
    >
      <div style={analyticsStylesML.statTileHeader}>
        <p style={analyticsStylesML.statTileLabel}>{labelML}</p>
        <img src={iconML} alt="" width={20} height={20} />
      </div>
      <div style={analyticsStylesML.statTileFooter}>
        <p style={analyticsStylesML.statTileValue}>{valueML}</p>
        <ChevronIcon />
      </div>
    </Link>
  );
}

function DonutChart({
  rows: rowsML,
  labelKey: labelKeyML,
  countKey: countKeyML,
  emptyLabel: emptyLabelML,
}: {
  rows: Record<string, string | number>[];
  labelKey: string;
  countKey: string;
  emptyLabel: string;
}) {
  const [hoveredIndexML, setHoveredIndexML] = useState<number | null>(null);

  const totalML = rowsML.reduce((sumML, rML) => sumML + Number(rML[countKeyML]), 0);
  const sortedML = rowsML
    .filter((rML) => Number(rML[countKeyML]) > 0)
    .sort((aML, bML) => Number(bML[countKeyML]) - Number(aML[countKeyML]));

  const topML = sortedML.slice(0, 5);
  const otherCountML = sortedML.slice(5).reduce((sumML, rML) => sumML + Number(rML[countKeyML]), 0);
  const segmentsML = [
    ...topML.map((rML) => ({ label: String(rML[labelKeyML]), count: Number(rML[countKeyML]) })),
    ...(otherCountML > 0 ? [{ label: "Other", count: otherCountML }] : []),
  ];

  if (segmentsML.length === 0) {
    return <p style={analyticsStylesML.emptyState}>{emptyLabelML}</p>;
  }

  const sizeML = 188;
  const strokeWidthML = 26;
  const rML = (sizeML - strokeWidthML) / 2;
  const cxML = sizeML / 2;
  const cyML = sizeML / 2;
  const circumferenceML = 2 * Math.PI * rML;

  let cumulativePercentML = 0;
  const segMetaML = segmentsML.map((segML) => {
    const percentML = totalML ? (segML.count / totalML) * 100 : 0;
    const startAngleDegML = (cumulativePercentML / 100) * 360 - 90;
    const midAngleDegML = startAngleDegML + percentML * 1.8;
    cumulativePercentML += percentML;
    return { ...segML, percent: percentML, startAngleDeg: startAngleDegML, midAngleDeg: midAngleDegML };
  });

  const activeIndexML = hoveredIndexML ?? 0;
  const activeML = segMetaML[activeIndexML];
  const activePercentML = Math.round(activeML.percent);

  const tooltipGapML = 16;
  const tooltipRadiusML = sizeML / 2 + tooltipGapML;
  const angleRadML = (activeML.midAngleDeg * Math.PI) / 180;
  const dxML = Math.cos(angleRadML);
  const dyML = Math.sin(angleRadML);
  const tooltipLeftML = cxML + tooltipRadiusML * dxML;
  const tooltipTopML = cyML + tooltipRadiusML * dyML;

  const translateXML = dxML > 0.3 ? "0%" : dxML < -0.3 ? "-100%" : "-50%";
  const translateYML = dyML > 0.3 ? "0%" : dyML < -0.3 ? "-100%" : "-50%";

  return (
    <div className="eb-donut-wrap" style={analyticsStylesML.donutWrap}>
      <div
        style={{ ...analyticsStylesML.donutSvgBox, width: sizeML, height: sizeML }}
        onMouseLeave={() => setHoveredIndexML(null)}
      >
        <svg width={sizeML} height={sizeML} viewBox={`0 0 ${sizeML} ${sizeML}`}>
          <circle cx={cxML} cy={cyML} r={rML} fill="none" stroke={TRACK_GREY_ML} strokeWidth={strokeWidthML} />
          {segMetaML.map((segML, iML) => {
            const dashML = (segML.percent / 100) * circumferenceML;
            return (
              <circle
                key={segML.label}
                cx={cxML}
                cy={cyML}
                r={rML}
                fill="none"
                stroke={DONUT_PALETTE_ML[iML % DONUT_PALETTE_ML.length]}
                strokeWidth={strokeWidthML}
                strokeDasharray={`${dashML} ${circumferenceML - dashML}`}
                transform={`rotate(${segML.startAngleDeg} ${cxML} ${cyML})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndexML(iML)}
              />
            );
          })}
        </svg>
        <div
          style={{
            ...analyticsStylesML.donutTooltip,
            left: `${tooltipLeftML}px`,
            top: `${tooltipTopML}px`,
            transform: `translate(${translateXML}, ${translateYML})`,
          }}
        >
          <span style={analyticsStylesML.donutTooltipLine1}>
            <span
              style={{ ...analyticsStylesML.donutInfoSwatch, background: DONUT_PALETTE_ML[activeIndexML % DONUT_PALETTE_ML.length] }}
            />
            <span style={analyticsStylesML.donutInfoLabel}>{activeML.label}</span>
          </span>
          <span style={analyticsStylesML.donutInfoMeta}>
            {activeML.count} {activeML.count === 1 ? "Booking" : "Bookings"} ({activePercentML}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductLineChart({
  rows: rowsML,
  labelKey: labelKeyML,
  countKey: countKeyML,
  emptyLabel: emptyLabelML,
}: {
  rows: Record<string, string | number>[];
  labelKey: string;
  countKey: string;
  emptyLabel: string;
}) {
  const [hoveredIndexML, setHoveredIndexML] = useState<number | null>(null);
  const containerRefML = useRef<HTMLDivElement | null>(null);
  const [containerWidthML, setContainerWidthML] = useState(0);

  useEffect(() => {
    const elML = containerRefML.current;
    if (!elML) return;
    const observerML = new ResizeObserver((entriesML) => {
      const widthML = entriesML[0]?.contentRect.width;
      if (widthML) setContainerWidthML(widthML);
    });
    observerML.observe(elML);
    return () => observerML.disconnect();
  }, []);

  const totalML = rowsML.reduce((sumML, rML) => sumML + Number(rML[countKeyML]), 0);
  const visibleRowsML = rowsML
    .filter((rML) => Number(rML[countKeyML]) > 0)
    .sort((aML, bML) => Number(bML[countKeyML]) - Number(aML[countKeyML]))
    .slice(0, 6);

  if (visibleRowsML.length === 0) {
    return <p style={analyticsStylesML.emptyState}>{emptyLabelML}</p>;
  }

  const maxCountML = Math.max(...visibleRowsML.map((rML) => Number(rML[countKeyML])));
  const plotAreaHeightML = 130;
  const topPaddingML = 28;
  const baselineYML = topPaddingML + plotAreaHeightML;
  const chartHeightML = baselineYML + 40;
  const sidePaddingML = 24;
  const lineColorML = ANALYTICS_ACCENT_ML;

  const viewBoxWidthML = Math.max(containerWidthML, 240);
  const usablePlotWidthML = Math.max(viewBoxWidthML - sidePaddingML * 2, 0);
  const stepML = visibleRowsML.length > 1 ? usablePlotWidthML / (visibleRowsML.length - 1) : 0;

  const pointsML = visibleRowsML.map((rowML, iML) => {
    const countML = Number(rowML[countKeyML]);
    const labelML = String(rowML[labelKeyML]);
    const xML = visibleRowsML.length > 1 ? sidePaddingML + iML * stepML : viewBoxWidthML / 2;
    const yML = maxCountML ? baselineYML - (countML / maxCountML) * plotAreaHeightML : baselineYML;
    return { x: xML, y: yML, count: countML, label: labelML };
  });

  const linePathML = pointsML.map((pML, iML) => `${iML === 0 ? "M" : "L"} ${pML.x} ${pML.y}`).join(" ");
  const areaPathML = `${linePathML} L ${pointsML[pointsML.length - 1].x} ${baselineYML} L ${pointsML[0].x} ${baselineYML} Z`;

  const activeIndexML = hoveredIndexML;
  const activeML = activeIndexML !== null ? pointsML[activeIndexML] : null;
  const activePercentML = activeML && totalML ? Math.round((activeML.count / totalML) * 100) : 0;
  const hitWidthML = stepML > 0 ? stepML : viewBoxWidthML;

  const tooltipTranslateXML = activeML
    ? activeML.x < viewBoxWidthML * 0.2
      ? "0%"
      : activeML.x > viewBoxWidthML * 0.8
        ? "-100%"
        : "-50%"
    : "-50%";

  return (
    <div ref={containerRefML} style={analyticsStylesML.lineChartWrap} onMouseLeave={() => setHoveredIndexML(null)}>
      {containerWidthML > 0 && (
        <svg width={viewBoxWidthML} height={chartHeightML} viewBox={`0 0 ${viewBoxWidthML} ${chartHeightML}`}>
          <defs>
            <linearGradient id="productLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColorML} stopOpacity="0.16" />
              <stop offset="100%" stopColor={lineColorML} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={0} y1={baselineYML} x2={viewBoxWidthML} y2={baselineYML} stroke={TRACK_GREY_ML} strokeWidth={1} />
          <path d={areaPathML} fill="url(#productLineFill)" stroke="none" />
          <path d={linePathML} fill="none" stroke={lineColorML} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pointsML.map((pML, iML) => (
            <g key={pML.label}>
              {}
              <rect
                x={pML.x - hitWidthML / 2}
                y={0}
                width={hitWidthML}
                height={chartHeightML}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndexML(iML)}
              />
              <circle
                cx={pML.x}
                cy={pML.y}
                r={activeIndexML === iML ? 6 : 4}
                fill="#FFFFFF"
                stroke={lineColorML}
                strokeWidth={2}
                style={{ pointerEvents: "none" }}
              />
              {}
              <circle
                cx={pML.x}
                cy={baselineYML + 22}
                r={9}
                fill={activeIndexML === iML ? lineColorML : "#F1F3F5"}
                style={{ pointerEvents: "none" }}
              />
              <text
                x={pML.x}
                y={baselineYML + 22}
                dy="0.35em"
                textAnchor="middle"
                fontSize="10"
                fontFamily="Inter"
                fontWeight={600}
                fill={activeIndexML === iML ? "#FFFFFF" : MUTED_GREY_ML}
                style={{ pointerEvents: "none" }}
              >
                {iML + 1}
              </text>
            </g>
          ))}
        </svg>
      )}
      {activeML && (
        <div
          style={{
            ...analyticsStylesML.donutTooltip,
            ...analyticsStylesML.productTooltip,
            left: `${activeML.x}px`,
            top: `${activeML.y}px`,
            transform: `translate(${tooltipTranslateXML}, calc(-100% - 12px))`,
          }}
        >
          <span style={analyticsStylesML.donutTooltipLine1}>
            <span style={{ ...analyticsStylesML.donutInfoSwatch, background: lineColorML }} />
            <span style={{ ...analyticsStylesML.donutInfoLabel, ...analyticsStylesML.productTooltipLabel }}>
              {activeML.label}
            </span>
          </span>
          <span style={analyticsStylesML.donutInfoMeta}>
            {activeML.count} {activeML.count === 1 ? "Booking" : "Bookings"} ({activePercentML}%)
          </span>
        </div>
      )}
    </div>
  );
}

const BOOKING_WIDGET_BLOCK_HANDLE_ML = "booking-widget";
const DEFAULT_APP_NAME_ML = "Milople Booking and Reservation App";

function buildGuideStepsML(
  shopML: string,
  apiKeyML: string,
  registeredML: boolean,
  appNameML: string,
): GuideStep[] {
  const workingStepsML: GuideStep[] = [
    {
      title: "Turn the booking app on",
      body: "In General Settings, switch on Booking App Status so the app is active across your storefront.",
      cta: "Go to General Settings",
      href: "/app/settings",
    },
    {
      title: "Turn on the booking widget",
      body: `Switch the ${appNameML} app embed on in the theme editor. It shows up automatically on every bookable product page (no manual placement needed).`,
      cta: "Activate App Embed",
      href: `https://${shopML}/admin/themes/current/editor?context=apps&activateAppId=${apiKeyML}/${BOOKING_WIDGET_BLOCK_HANDLE_ML}`,
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
      body: "In Booking Settings, shape your availability- pick your working days, hours, and slot rules so bookings only land when you're ready for them.",
      cta: "Go to Booking Settings",
      href: "/app/settings/booking",
    },
    {
      title: "Add your business locations",
      body: "In the Locations tab, add every place customers can book with you — each with its own timezone, so booking times are always accurate no matter where they are.",
      cta: "Go to Locations",
      href: "/app/settings/locations",
    },
    {
      title: "Block off unavailable days",
      body: "Add holidays or closures on the Blackout Dates tab, shop-wide or for a specific product.",
      cta: "Go to Blackout Dates",
      href: "/app/settings/blackout-dates",
    },
    {
      title: "Collect extra info at booking time",
      body: "Use Custom Fields to collect extra info like notes or special requests from customers when they book.",
      cta: "Go to Custom Fields",
      href: "/app/settings/custom-fields",
    },
    {
      title: "Turn on booking emails",
      body: "Configure Email Settings- set up SMTP so customers automatically get confirmation, reminder, reschedule, and cancellation emails, and customize the email templates they receive.",
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
      body: `Register with your name and email to unlock the rest of ${appNameML}.`,
      cta: "Register",
      href: "/app/account",
      done: registeredML,
    },
    ...workingStepsML,
  ];
}

function todayISOML(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfWeekISOML(): string {
  const endML = new Date();
  endML.setDate(endML.getDate() + 7);
  return endML.toISOString().slice(0, 10);
}

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { admin: adminML, session: sessionML } = await authenticate.admin(requestML);
  const shopSettingsML = await getOrCreateShopSettingsML(sessionML.shop);
  const sharedML = {
    shop: sessionML.shop,
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    registered: shopSettingsML.registered,
    appName: process.env.APP_NAME?.trim() || DEFAULT_APP_NAME_ML,
  };

  if (!shopSettingsML.registered) {
    return {
      stats: { todayCount: 0, weekCount: 0, overbookedCount: 0, enabledProductCount: 0 },
      smtpConfigured: false,
      hasLocations: false,
      report: null as BookingReportData | null,
      reportProducts: [] as { id: string; title: string }[],
      reportFilters: { bookableProductId: "", dateFrom: "", dateTo: "" },
      ...sharedML,
    };
  }

  const urlML = new URL(requestML.url);
  const bookableProductIdML = urlML.searchParams.get("productId") || undefined;
  const reportDateFromML = urlML.searchParams.get("dateFrom") || undefined;
  const reportDateToML = urlML.searchParams.get("dateTo") || undefined;

  const todayML = todayISOML();
  const weekEndML = endOfWeekISOML();

  const [
    ,
    productsML,
    todayCountML,
    weekCountML,
    overbookedCountML,
    smtpSettingsML,
    enabledLocationsML,
    reportML,
  ] = await Promise.all([
    maybePrefillFirstLocationFromShopTimezoneML(sessionML.shop, adminML),
    listBookableProductsML(sessionML.shop),
    countBookingsML(sessionML.shop, { dateFrom: todayML, dateTo: todayML }),
    countBookingsML(sessionML.shop, { dateFrom: todayML, dateTo: weekEndML }),
    countBookingsML(sessionML.shop, { status: "OVERBOOKED" }),
    getSmtpSettingsML(sessionML.shop),
    listEnabledLocationsML(sessionML.shop),
    getBookingReportDataML(sessionML.shop, {
      bookableProductId: bookableProductIdML,
      dateFrom: reportDateFromML,
      dateTo: reportDateToML,
    }),
  ]);

  const enabledProductCountML = productsML.filter((pML: { isEnabled: boolean }) => pML.isEnabled).length;
  const smtpConfiguredML = Boolean(
    smtpSettingsML?.host &&
      smtpSettingsML.port &&
      smtpSettingsML.username &&
      smtpSettingsML.password &&
      smtpSettingsML.fromEmail,
  );

  return {
    stats: { todayCount: todayCountML, weekCount: weekCountML, overbookedCount: overbookedCountML, enabledProductCount: enabledProductCountML },
    smtpConfigured: smtpConfiguredML,
    hasLocations: enabledLocationsML.length > 0,
    report: reportML,
    reportProducts: productsML
      .filter((pML: { isEnabled: boolean }) => pML.isEnabled)
      .map((pML: { id: string; productTitle: string }) => ({ id: pML.id, title: pML.productTitle })),
    reportFilters: {
      bookableProductId: bookableProductIdML ?? "",
      dateFrom: reportDateFromML ?? "",
      dateTo: reportDateToML ?? "",
    },
    ...sharedML,
  };
};

export default function Dashboard() {
  const {
    stats: statsML,
    smtpConfigured: smtpConfiguredML,
    hasLocations: hasLocationsML,
    shop: shopML,
    apiKey: apiKeyML,
    registered: registeredML,
    appName: appNameML,
    report: reportML,
    reportProducts: reportProductsML,
    reportFilters: reportFiltersML,
  } = useLoaderData<typeof loader>();
  const guideDefaultOpenML =
    !registeredML || !hasLocationsML || statsML.enabledProductCount === 0 || !smtpConfiguredML;
  const guideStepsML = buildGuideStepsML(shopML, apiKeyML, registeredML, appNameML);
  const navigateML = useNavigate();

  const [productIdML, setProductIdML] = useState(reportFiltersML.bookableProductId);
  const [donutViewML, setDonutViewML] = useState<"hours" | "days" | "months">("hours");
  const [dateFromML, setDateFromML] = useState(reportFiltersML.dateFrom);
  const [dateToML, setDateToML] = useState(reportFiltersML.dateTo);

  const applyReportFiltersML = () => {
    const paramsML = new URLSearchParams();
    if (productIdML) paramsML.set("productId", productIdML);
    if (dateFromML) paramsML.set("dateFrom", dateFromML);
    if (dateToML) paramsML.set("dateTo", dateToML);
    navigateML({ search: paramsML.toString() });
  };

  return (
    <s-page heading="Booking and Reservation" inlineSize="950px" style={{ fontFamily: "Inter" }}>
      <GetStartedGuide
        appName={appNameML}
        intro="A quick walkthrough of how to get bookings running end to end."
        steps={guideStepsML}
        defaultOpen={guideDefaultOpenML}
      />

      {registeredML && (
      <div style={analyticsStylesML.outerCard}>
      {registeredML && (
        <>
          {statsML.overbookedCount > 0 && (
            <s-banner tone="critical" heading="Bookings need review">
              <s-paragraph>
                {statsML.overbookedCount === 1
                  ? "1 booking landed in an already-full slot and needs a look."
                  : `${statsML.overbookedCount} bookings landed in already-full slots and need a look.`}
              </s-paragraph>
              <s-link href="/app/bookings?status=OVERBOOKED">
                Review overbooked bookings
              </s-link>
            </s-banner>
          )}
        </>
      )}

      {registeredML && reportML && (
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
            @media (max-width: 950px) {
              .eb-analytics-card {
                height: auto !important;
              }
              .eb-report-card {
                min-height: 420px;
              }
              .eb-analytics-filter-row {
                flex-wrap: wrap !important;
                height: auto !important;
                max-width: none !important;
              }
              .eb-analytics-filter-row > div {
                flex: 1 1 180px !important;
                height: auto !important;
              }
              .eb-analytics-filter-row > div:first-child {
                flex-basis: 100% !important;
              }
              .eb-analytics-filter-row > div:last-child {
                flex: 0 0 auto !important;
              }
              .eb-stat-tile {
                height: auto !important;
                min-height: 88px;
              }
            }
            @media (max-width: 700px) {
              .eb-reports-row {
                flex-direction: column !important;
              }
              .eb-report-card {
                height: auto !important;
                min-height: 0;
                width: 100% !important;
              }
              .eb-analytics-filter-row > div:not(:first-child):not(:last-child) {
                flex: 1 1 calc(50% - 8px) !important;
              }
              .eb-analytics-stats-row {
                flex-wrap: wrap !important;
              }
              .eb-stat-tile {
                flex: 1 1 calc(50% - 9px) !important;
              }
            }
            @media (max-width: 480px) {
              .eb-analytics-filter-row > div:not(:first-child):not(:last-child) {
                flex: 1 1 100% !important;
              }
              .eb-report-card-header {
                flex-wrap: wrap !important;
              }
            }
            @media (max-width: 420px) {
              .eb-stat-tile {
                flex: 1 1 100% !important;
              }
            }
          `}</style>
          <div className="eb-analytics-card" style={analyticsStylesML.card}>
            <h2 style={analyticsStylesML.heading}>Store Analytics</h2>
            <div className="eb-analytics-filter-row" style={analyticsStylesML.filterRow}>
              <div style={analyticsStylesML.productFilterField}>
                <label style={analyticsStylesML.filterLabel}>Products</label>
                <select
                  value={productIdML}
                  onChange={(eML) => setProductIdML(eML.target.value)}
                  style={analyticsStylesML.selectInput}
                >
                  <option value="">All Products</option>
                  {reportProductsML.map((pML: { id: string; title: string }) => (
                    <option key={pML.id} value={pML.id}>
                      {pML.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={analyticsStylesML.filterField}>
                <label style={analyticsStylesML.filterLabel}>From</label>
                <div style={analyticsStylesML.dateFieldBox}>
                  <img src="/date-icon.svg" alt="" width={20} height={20} />
                  <input
                    type="date"
                    value={dateFromML}
                    onChange={(eML) => setDateFromML(eML.target.value)}
                    style={analyticsStylesML.dateInput}
                    className="eb-date-input"
                  />
                </div>
              </div>
              <div style={analyticsStylesML.filterField}>
                <label style={analyticsStylesML.filterLabel}>To</label>
                <div style={analyticsStylesML.dateFieldBox}>
                  <img src="/date-icon.svg" alt="" width={20} height={20} />
                  <input
                    type="date"
                    value={dateToML}
                    onChange={(eML) => setDateToML(eML.target.value)}
                    style={analyticsStylesML.dateInput}
                    className="eb-date-input"
                  />
                </div>
              </div>
              <div style={analyticsStylesML.applyButtonWrap}>
                <button type="button" onClick={applyReportFiltersML} style={analyticsStylesML.applyButton}>
                  Apply
                </button>
              </div>
            </div>
            <hr style={analyticsStylesML.divider} />
            <div className="eb-analytics-stats-row" style={analyticsStylesML.statsRow}>
              <StatTile
                label="Bookings Today"
                value={statsML.todayCount}
                href={`/app/bookings?dateFrom=${todayISOML()}&dateTo=${todayISOML()}`}
              />
              <StatTile
                label="Total Bookings"
                value={reportML.totalBookings}
                href="/app/bookings"
                icon="/cart-total.svg"
              />
              <StatTile
                label="Overbooked (needs review)"
                value={reportML.overbookedCount}
                href="/app/bookings?status=OVERBOOKED"
                icon="/msg-icon.svg"
              />
            </div>
            <div className="eb-analytics-stats-row" style={analyticsStylesML.statsRow}>
              <StatTile
                label="Confirmed Bookings"
                value={reportML.confirmedCount}
                href="/app/bookings?status=CONFIRMED"
              />
              <StatTile
                label="Cancellation Rate"
                value={`${reportML.cancellationRatePercent}%`}
                href="/app/bookings?status=CANCELLED"
              />
            </div>
          </div>

          <div className="eb-reports-row" style={analyticsStylesML.reportsRow}>
            <div className="eb-analytics-card eb-report-card" style={analyticsStylesML.reportCard}>
              <div className="eb-report-card-header" style={analyticsStylesML.reportCardHeader}>
                <h2 style={analyticsStylesML.heading}>
                  {donutViewML === "hours"
                    ? "Peak Hours"
                    : donutViewML === "days"
                      ? "Popular Days"
                      : "Popular Months"}
                </h2>
                <div
                  role="tablist"
                  aria-label="Choose chart view"
                  style={analyticsStylesML.donutToggle}
                >
                  {(
                    [
                      { value: "hours", label: "Hours" },
                      { value: "days", label: "Days" },
                      { value: "months", label: "Months" },
                    ] as const
                  ).map((optML) => (
                    <button
                      key={optML.value}
                      type="button"
                      role="tab"
                      aria-selected={donutViewML === optML.value}
                      onClick={() => setDonutViewML(optML.value)}
                      style={{
                        ...analyticsStylesML.donutToggleBtn,
                        ...(donutViewML === optML.value
                          ? analyticsStylesML.donutToggleBtnActive
                          : {}),
                      }}
                    >
                      {optML.label}
                    </button>
                  ))}
                </div>
              </div>
              <hr style={analyticsStylesML.divider} />
              <div style={analyticsStylesML.reportCardBody}>
                {donutViewML === "hours" ? (
                  <DonutChart
                    key="hours"
                    rows={reportML.bookingsByHour.map((rML) => ({ ...rML, hour: to12HourML(rML.hour) }))}
                    labelKey="hour"
                    countKey="count"
                    emptyLabel="No bookings yet for this range."
                  />
                ) : donutViewML === "days" ? (
                  <DonutChart
                    key="days"
                    rows={reportML.bookingsByDayOfWeek}
                    labelKey="day"
                    countKey="count"
                    emptyLabel="No bookings yet for this range."
                  />
                ) : (
                  <DonutChart
                    key="months"
                    rows={reportML.bookingsByMonth}
                    labelKey="month"
                    countKey="count"
                    emptyLabel="No bookings yet for this range."
                  />
                )}
              </div>
            </div>

            <div className="eb-analytics-card eb-report-card" style={analyticsStylesML.reportCard}>
              <h2 style={analyticsStylesML.heading}>Bookings by Product</h2>
              <hr style={analyticsStylesML.divider} />
              <div style={analyticsStylesML.productCardBody}>
                <ProductLineChart
                  rows={reportML.bookingsByProduct}
                  labelKey="productTitle"
                  countKey="count"
                  emptyLabel="No bookings yet for this range."
                />
              </div>
            </div>
          </div>
        </>
      )}

      </div>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};