import { useEffect, useRef, useState } from "react";
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
    width: "886px",
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
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  descText: {
    fontFamily: "Inter",
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
    fontFamily: "Inter",
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
  visibleDateInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
    padding: 0,
    cursor: "pointer",
  },
  inputBoxDateClickable: {
    cursor: "pointer",
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
  reasonInput: {
    flex: "1 1 auto",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
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
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    gap: "4px",
    width: "auto",
    minWidth: "188px",
    height: "42px",
    background: ACCENT,
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  addButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  plusWrap: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "3px",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  listCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
    borderRadius: "4px",
    padding: "10px 10px 13px",
    marginTop: "16px",
  },
  listHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  listHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "3px",
  },
  listTitle: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  columnHeaderRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "20px",
    width: "100%",
    alignSelf: "stretch",
  },
  columnHeaderCell: {
    flex: "1 1 0",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
  },
  rowWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "20px",
    width: "100%",
    alignSelf: "stretch",
    height: "40px",
  },
  rowCell: {
    flex: "1 1 0",
    alignSelf: "center",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
  },
  actionsCell: {
    flex: "1 1 0",
    alignSelf: "center",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: "44px",
    height: "40px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  emptyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY,
    margin: 0,
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.focus();
    }
  };

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
  const isAdding = pendingIntent === "add";

  const handleAdd = () => {
    if (!date) return;
    fetcher.submit({ intent: "add", date, reason }, { method: "POST" });
  };

  const handleDelete = (id: string) => {
    fetcher.submit({ intent: "delete", id }, { method: "POST" });
  };

  return (
    <div style={{ fontFamily: "Inter" }}>
      <style>{`
        .blackout-date-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          cursor: pointer;
        }
        .blackout-date-input {
          position: relative;
        }
      `}</style>
      <div style={{ ...styles.card, height: open ? "225px" : "auto" }}>
        <div style={styles.body}>
          <div
            style={{ ...styles.headerRow, cursor: "pointer" }}
            onClick={() => setOpen(!open)}
          >
            <div style={styles.headerLeft}>
              <p style={styles.title}>Add a Blackout Date</p>
              <p style={styles.descText}>
                Block bookings across your store on specific dates-
                holidays, closures, and one-off events.
              </p>
            </div>
            <button
              type="button"
              style={styles.chevronButton}
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
                  <div
                    style={{
                      ...styles.inputBoxDate,
                      ...styles.inputBoxDateClickable,
                    }}
                    onClick={openDatePicker}
                  >
                    <img src="/date-icon.svg" width={18} height={20} alt="" />
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="blackout-date-input"
                      style={styles.visibleDateInput}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Date"
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
        <div style={styles.listHeaderRow}>
          <div style={styles.listHeaderLeft}>
            <p style={styles.listTitle}>Current Blackout Dates</p>
            <p style={styles.descText}>
              All shop-wide blackout dates block bookings across your entire
              store.
            </p>
          </div>
        </div>

        <hr style={styles.divider} />

        <div style={styles.columnHeaderRow}>
          <p style={styles.columnHeaderCell}>Date</p>
          <p style={styles.columnHeaderCell}>Reason</p>
          <p style={{ ...styles.columnHeaderCell, textAlign: "center" }}>
            Actions
          </p>
        </div>

        <hr style={styles.divider} />

        {blackoutDates.length === 0 ? (
          <p style={styles.emptyText}>No shop-wide blackout dates yet.</p>
        ) : (
          blackoutDates.map((b) => (
            <div key={b.id}>
              <div style={styles.rowWrap}>
                <p style={styles.rowCell}>{b.date}</p>
                <p style={styles.rowCell}>{b.reason ?? "—"}</p>
                <div style={styles.actionsCell}>
                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => handleDelete(b.id)}
                    disabled={isSubmitting}
                    aria-label="Delete blackout date"
                  >
                    <img
                      src="/delete-icon.svg"
                      width={44}
                      height={40}
                      alt="Delete"
                      style={{ display: "block" }}
                    />
                  </button>
                </div>
              </div>
              <hr style={styles.divider} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};