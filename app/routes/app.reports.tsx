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

  if (rows.every((r) => Number(r[countKey]) === 0)) {
    return <s-paragraph>No data for this range yet.</s-paragraph>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {rows.map((row) => {
        const count = Number(row[countKey]);
        const widthPercent = Math.round((count / max) * 100);
        return (
          <div
            key={String(row[labelKey])}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <div style={{ width: "9rem", fontSize: "0.85rem" }}>
              {row[labelKey]}
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.06)",
                borderRadius: "4px",
                height: "1.1rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${widthPercent}%`,
                  background: "#111",
                  height: "100%",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div style={{ width: "2rem", fontSize: "0.85rem", textAlign: "right" }}>
              {count}
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
        <s-stack direction="inline" gap="large">
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {report.totalBookings}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.6)" }}>
              Total bookings
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {report.confirmedCount}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.6)" }}>
              Confirmed
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {report.overbookedCount}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.6)" }}>
              Overbooked (needs review)
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {report.cancellationRatePercent}%
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.6)" }}>
              Cancellation rate
            </div>
          </div>
        </s-stack>
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
