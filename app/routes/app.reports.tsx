import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { getBookingReportData } from "../models/bookingReports.server";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const bookableProductId = url.searchParams.get("productId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const [report, products] = await Promise.all([
    getBookingReportData(session.shop, { bookableProductId, dateFrom, dateTo }),
    listBookableProducts(session.shop),
  ]);

  return {
    report,
    products: products.map((p) => ({ id: p.id, title: p.productTitle })),
    filters: {
      bookableProductId: bookableProductId ?? "",
      dateFrom: dateFrom ?? "",
      dateTo: dateTo ?? "",
    },
  };
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: "160px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "12px",
        padding: "1.1rem 1.25rem",
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: accent,
        }}
      />
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#111", lineHeight: 1.15 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(0,0,0,0.55)", marginTop: "0.25rem" }}>
        {label}
      </div>
    </div>
  );
}

const BAR_PALETTE = ["#2F6FED", "#0EA5A5", "#8B5CF6", "#F59E0B", "#EC4899", "#16A34A"];

function BarList({
  rows,
  labelKey,
  countKey,
}: {
  rows: Record<string, string | number>[];
  labelKey: string;
  countKey: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[countKey])));
  const total = rows.reduce((sum, r) => sum + Number(r[countKey]), 0);

  if (rows.every((r) => Number(r[countKey]) === 0)) {
    return (
      <div style={{ padding: "1.5rem 0", textAlign: "center", color: "rgba(0,0,0,0.45)", fontSize: "0.9rem" }}>
        No data for this range yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {rows.map((row, index) => {
        const count = Number(row[countKey]);
        const widthPercent = Math.max(3, Math.round((count / max) * 100));
        const percentOfTotal = total ? Math.round((count / total) * 100) : 0;
        const color = BAR_PALETTE[index % BAR_PALETTE.length];
        return (
          <div key={String(row[labelKey])}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "0.3rem",
              }}
            >
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#111" }}>
                {row[labelKey]}
              </span>
              <span style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.5)" }}>
                {count} {count === 1 ? "booking" : "bookings"}
                {total > 0 ? ` \u00b7 ${percentOfTotal}%` : ""}
              </span>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.05)",
                borderRadius: "999px",
                height: "0.6rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${widthPercent}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BookingReportsPage() {
  const { report, products, filters } = useLoaderData<typeof loader>();

  const [productId, setProductId] = useState(filters.bookableProductId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.location.search = params.toString();
  };

  return (
    <s-page heading="Booking Reports">
      <s-section heading="Filters">
        <s-stack direction="inline" gap="base">
          <s-select
            label="Product"
            value={productId}
            onChange={(e: FieldChangeEvent) => setProductId(e.currentTarget.value)}
          >
            <s-option value="">All products</s-option>
            {products.map((p) => (
              <s-option key={p.id} value={p.id}>
                {p.title}
              </s-option>
            ))}
          </s-select>
          <s-date-field
            label="From"
            value={dateFrom}
            onChange={(e: FieldChangeEvent) => setDateFrom(e.currentTarget.value)}
          ></s-date-field>
          <s-date-field
            label="To"
            value={dateTo}
            onChange={(e: FieldChangeEvent) => setDateTo(e.currentTarget.value)}
          ></s-date-field>
          <s-button onClick={applyFilters}>Apply</s-button>
        </s-stack>
      </s-section>

      <s-section heading="Summary">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
          <StatCard label="Total bookings" value={report.totalBookings} accent="#2F6FED" />
          <StatCard label="Confirmed" value={report.confirmedCount} accent="#16A34A" />
          <StatCard label="Overbooked (needs review)" value={report.overbookedCount} accent="#F59E0B" />
          <StatCard label="Cancellation rate" value={`${report.cancellationRatePercent}%`} accent="#EF4444" />
        </div>
      </s-section>

      <s-section heading="Bookings by product">
        <BarList rows={report.bookingsByProduct} labelKey="productTitle" countKey="count" />
      </s-section>

      <s-section heading="Peak hours">
        <BarList rows={report.bookingsByHour} labelKey="hour" countKey="count" />
      </s-section>

      <s-section heading="Popular days">
        <BarList rows={report.bookingsByDayOfWeek} labelKey="day" countKey="count" />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};