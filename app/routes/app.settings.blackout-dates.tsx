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

const ACCENT = "#073E74";
const LINE_BORDER = "#DBDBDB";
const INPUT_BORDER = "#E9E9EA";
const LABEL_GREY = "#373737";
const TEXT_BLACK = "#000000";

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7.25" stroke={ACCENT} strokeWidth="1.5" />
    <circle cx="8" cy="4.9" r="1" fill={ACCENT} />
    <path d="M8 7.2V11.6" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="11"
    height="6"
    viewBox="0 0 11 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  >
    <path
      d="M1 1L5.5 5L10 1"
      stroke={ACCENT}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="3" width="16" height="16" rx="2" stroke={ACCENT} strokeWidth="1.4" />
    <path d="M1 7.5H17" stroke={ACCENT} strokeWidth="1.4" />
    <path d="M5 1V4.5" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M13 1V4.5" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "10px 10px 13px",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
    borderRadius: "4px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
    alignSelf: "stretch",
  },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
  },
  title: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  descRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  descText: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK,
    margin: 0,
  },
  chevronButton: {
    width: "20px",
    height: "20px",
    minWidth: "20px",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
  },
  fieldGroupDate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "200px",
    flex: "none",
  },
  fieldGroupReason: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 auto",
  },
  fieldLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY,
    margin: 0,
  },
  inputBoxDate: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "200px",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "4px",
  },
  inputBoxReason: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "4px",
  },
  dateInput: {
    flex: "1 1 auto",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
    padding: 0,
    minWidth: 0,
  },
  reasonInput: {
    flex: "1 1 auto",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
    padding: 0,
    minWidth: 0,
  },
  addButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    gap: "4px",
    width: "188px",
    height: "42px",
    background: ACCENT,
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
  },
  addButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  addButtonLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: "#FFFFFF",
  },
  plusWrap: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "3px",
    width: "20px",
    height: "20px",
  },
  listCard: {
    boxSizing: "border-box",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
    borderRadius: "4px",
    padding: "16px",
    marginTop: "16px",
  },
  listHeading: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
    margin: "0 0 12px",
  },
};

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
  const [open, setOpen] = useState(true);

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
    <>
      <div style={styles.card}>
        <style>{`
          .eb-blackout-date-input::-webkit-calendar-picker-indicator {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            cursor: pointer;
          }
          .eb-blackout-date-input {
            position: relative;
          }
        `}</style>

        <div style={styles.body}>
          <div style={styles.headerRow}>
            <div style={styles.headerLeft}>
              <p style={styles.title}>Add a Blackout Date</p>
              <div style={styles.descRow}>
                <p style={styles.descText}>
                  Block bookings across your store on specific dates —
                  holidays, closures, and one-off events.
                </p>
                <InfoIcon />
              </div>
            </div>
            <button
              type="button"
              style={styles.chevronButton}
              onClick={() => setOpen(!open)}
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronIcon open={open} />
            </button>
          </div>

          {open && (
            <>
              <hr style={styles.divider} />

              <div style={styles.fieldsRow}>
                <div style={styles.fieldGroupDate}>
                  <p style={styles.fieldLabel}>Date</p>
                  <div style={styles.inputBoxDate}>
                    <CalendarIcon />
                    <input
                      type="date"
                      className="eb-blackout-date-input"
                      style={styles.dateInput}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  {errors.date && (
                    <p
                      style={{
                        ...styles.fieldLabel,
                        color: "#D82C0D",
                        fontWeight: 400,
                        fontSize: "12px",
                      }}
                    >
                      {errors.date}
                    </p>
                  )}
                </div>

                <div style={styles.fieldGroupReason}>
                  <p style={styles.fieldLabel}>Reason (Optional)</p>
                  <div style={styles.inputBoxReason}>
                    <input
                      type="text"
                      style={styles.reasonInput}
                      placeholder="e.g. Public holiday"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr style={styles.divider} />
            </>
          )}
        </div>

        <button
          type="button"
          style={{
            ...styles.addButton,
            ...(isAdding ? styles.addButtonDisabled : {}),
          }}
          onClick={handleAdd}
          disabled={isAdding}
        >
          <span style={styles.addButtonLabel}>Add Blackout Date</span>
          <span style={styles.plusWrap}>
            <PlusIcon />
          </span>
        </button>
      </div>

      <div style={styles.listCard}>
        <h2 style={styles.listHeading}>Current Blackout Dates</h2>

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
      </div>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};