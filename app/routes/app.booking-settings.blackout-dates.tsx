import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  addBlackoutDate,
  deleteBlackoutDate,
  listShopBlackoutDates,
  parseBlackoutDateForm,
  type BlackoutDateFieldErrors,
} from "../models/blackoutDate.server";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const dates = await listShopBlackoutDates(session.shop);
  return {
    blackoutDates: dates.map(
      (b: { id: string; date: Date; reason: string | null }) => ({
        id: b.id,
        date: b.date.toISOString().slice(0, 10),
        reason: b.reason,
      }),
    ),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as "add" | "delete" | "";

  if (intent === "add") {
    const { date, reason, errors } = parseBlackoutDateForm(formData);
    if (!date) {
      return { intent, ok: false as const, errors };
    }
    await addBlackoutDate(session.shop, date, reason, null);
    return { intent, ok: true as const, errors: {} };
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    await deleteBlackoutDate(session.shop, id);
    return { intent, ok: true as const };
  }

  return { intent, ok: false as const };
};

export default function BlackoutDatesPage() {
  const { blackoutDates } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const errors: BlackoutDateFieldErrors =
    fetcher.data?.intent === "add" ? (fetcher.data.errors ?? {}) : {};

  useEffect(() => {
    if (fetcher.data?.intent === "add" && fetcher.data.ok) {
      setDate("");
      setReason("");
    }
  }, [fetcher.data]);

  const isSubmitting = fetcher.state !== "idle";
  const pendingIntent = isSubmitting
    ? String(fetcher.formData?.get("intent") ?? "")
    : "";
  const pendingDeleteId = isSubmitting
    ? String(fetcher.formData?.get("id") ?? "")
    : "";
  const isAdding = pendingIntent === "add";

  const handleAdd = () => {
    if (!date) return;
    fetcher.submit({ intent: "add", date, reason }, { method: "POST" });
  };

  const handleDelete = (id: string) => {
    fetcher.submit({ intent: "delete", id }, { method: "POST" });
  };

  return (
    <s-page heading="Blackout Dates" inlineSize="large" style={{ width: "950px", maxWidth: "950px", boxSizing: "border-box", marginInline: "auto" }}>
      <s-section heading="Shop-wide blackout dates">
        <s-paragraph>
          These dates block booking across every bookable product in the store —
          holidays, store closures, and so on. To block a date for just one
          product, use that product&apos;s own booking config page instead.
        </s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-date-field
            label="Date"
            value={date}
            error={errors.date}
            onChange={(e: FieldChangeEvent) => setDate(e.currentTarget.value)}
          ></s-date-field>
          <s-text-field
            label="Reason (optional)"
            value={reason}
            onChange={(e: FieldChangeEvent) => setReason(e.currentTarget.value)}
          ></s-text-field>
          <s-button
            onClick={handleAdd}
            {...(isSubmitting ? { disabled: true } : {})}
            {...(isAdding ? { loading: true } : {})}
          >
            Add blackout date
          </s-button>
        </s-stack>

        {blackoutDates.length === 0 ? (
          <s-paragraph>No shop-wide blackout dates yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Date</s-table-header>
              <s-table-header>Reason</s-table-header>
              <s-table-header>Remove</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {blackoutDates.map((b) => (
                <s-table-row key={b.id}>
                  <s-table-cell>{b.date}</s-table-cell>
                  <s-table-cell>{b.reason ?? "—"}</s-table-cell>
                  <s-table-cell>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => handleDelete(b.id)}
                      {...(isSubmitting ? { disabled: true } : {})}
                      {...(pendingIntent === "delete" && pendingDeleteId === b.id
                        ? { loading: true }
                        : {})}
                    >
                      Remove
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};