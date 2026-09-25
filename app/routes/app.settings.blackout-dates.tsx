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
  addBlackoutDateML,
  deleteBlackoutDateML,
  listShopBlackoutDatesML,
  parseBlackoutDateFormML,
  type BlackoutDateFieldErrors,
} from "../models/blackoutDate.server";

const ACCENT_ML = "#073E74";
const LINE_BORDER_ML = "#DBDBDB";
const INPUT_BORDER_ML = "#E9E9EA";
const LABEL_GREY_ML = "#373737";
const TEXT_BLACK_ML = "#000000";

const ChevronIcon = ({ open: openML }: { open: boolean }) => (
  <img
    src="/chevron.svg"
    width={11}
    height={6}
    alt=""
    style={{
      transform: openML ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  />
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const stylesML: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "10px 10px 13px",
    gap: "16px",
    width: "100%",
    maxWidth: "886px",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK_ML,
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
    borderTop: `1px solid ${LINE_BORDER_ML}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
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
    maxWidth: "100%",
    flex: "none",
  },
  fieldGroupReason: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 220px",
    minWidth: 0,
  },
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY_ML,
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
    maxWidth: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
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
    border: `1px solid ${INPUT_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
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
    minWidth: "min(188px, 100%)",
    height: "42px",
    background: ACCENT_ML,
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
    border: `1px solid ${LINE_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
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
    color: TEXT_BLACK_ML,
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
    color: TEXT_BLACK_ML,
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
    color: LABEL_GREY_ML,
    margin: 0,
  },
};

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const datesML = await listShopBlackoutDatesML(sessionML.shop);
  return {
    blackoutDates: datesML.map(
      (bML: { id: string; date: Date; reason: string | null }) => ({
        id: bML.id,
        date: bML.date.toISOString().slice(0, 10),
        reason: bML.reason,
      }),
    ),
  };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as "add" | "delete" | "";

  if (intentML === "add") {
    const { date: dateML, reason: reasonML, errors: errorsML } = parseBlackoutDateFormML(formDataML);
    if (!dateML) {
      return { intent: intentML, ok: false as const, errors: errorsML };
    }
    await addBlackoutDateML(sessionML.shop, dateML, reasonML, null);
    return { intent: intentML, ok: true as const, errors: {} };
  }

  if (intentML === "delete") {
    const idML = String(formDataML.get("id") ?? "");
    await deleteBlackoutDateML(sessionML.shop, idML);
    return { intent: intentML, ok: true as const };
  }

  return { intent: intentML, ok: false as const };
};

export default function BlackoutDatesPage() {
  const { blackoutDates: blackoutDatesML } = useLoaderData<typeof loader>();
  const fetcherML = useFetcher<typeof action>();

  const [dateML, setDateML] = useState("");
  const [reasonML, setReasonML] = useState("");
  const [openML, setOpenML] = useState(false);
  const dateInputRefML = useRef<HTMLInputElement>(null);

  const openDatePickerML = () => {
    const elML = dateInputRefML.current;
    if (!elML) return;
    if (typeof elML.showPicker === "function") {
      elML.showPicker();
    } else {
      elML.focus();
    }
  };

  const errorsML: BlackoutDateFieldErrors =
    fetcherML.data?.intent === "add" ? (fetcherML.data.errors ?? {}) : {};

  useEffect(() => {
    if (fetcherML.data?.intent === "add" && fetcherML.data.ok) {
      setDateML("");
      setReasonML("");
    }
  }, [fetcherML.data]);

  const isSubmittingML = fetcherML.state !== "idle";
  const pendingIntentML = isSubmittingML
    ? String(fetcherML.formData?.get("intent") ?? "")
    : "";
  const isAddingML = pendingIntentML === "add";

  const handleAddML = () => {
    if (!dateML) return;
    fetcherML.submit({ intent: "add", date: dateML, reason: reasonML }, { method: "POST" });
  };

  const handleDeleteML = (idML: string) => {
    fetcherML.submit({ intent: "delete", id: idML }, { method: "POST" });
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
      <div style={{ ...stylesML.card, minHeight: openML ? "225px" : "auto", height: "auto" }}>
        <div style={stylesML.body}>
          <div
            style={{ ...stylesML.headerRow, cursor: "pointer" }}
            onClick={() => setOpenML(!openML)}
          >
            <div style={stylesML.headerLeft}>
              <p style={stylesML.title}>Add a Blackout Date</p>
              <p style={stylesML.descText}>
                Block bookings across your store on specific dates-
                holidays, closures, and one-off events.
              </p>
            </div>
            <button
              type="button"
              style={stylesML.chevronButton}
              aria-label={openML ? "Collapse" : "Expand"}
            >
              <ChevronIcon open={openML} />
            </button>
          </div>

          {openML && (
            <>
              <hr style={stylesML.divider} />

              <div style={stylesML.fieldsRow}>
                <div style={stylesML.fieldGroupDate}>
                  <p style={stylesML.fieldLabel}>Date</p>
                  <div
                    style={{
                      ...stylesML.inputBoxDate,
                      ...stylesML.inputBoxDateClickable,
                    }}
                    onClick={openDatePickerML}
                  >
                    <img src="/date-icon.svg" width={18} height={20} alt="" />
                    <input
                      ref={dateInputRefML}
                      type="date"
                      className="blackout-date-input"
                      style={stylesML.visibleDateInput}
                      value={dateML}
                      onChange={(eML) => setDateML(eML.target.value)}
                      onClick={(eML) => eML.stopPropagation()}
                      aria-label="Date"
                    />
                  </div>
                  {errorsML.date && (
                    <p
                      style={{
                        ...stylesML.fieldLabel,
                        color: "#D82C0D",
                        fontWeight: 400,
                        fontSize: "12px",
                      }}
                    >
                      {errorsML.date}
                    </p>
                  )}
                </div>

                <div style={stylesML.fieldGroupReason}>
                  <p style={stylesML.fieldLabel}>Reason (Optional)</p>
                  <div style={stylesML.inputBoxReason}>
                    <input
                      type="text"
                      style={stylesML.reasonInput}
                      placeholder="e.g. Public holiday"
                      value={reasonML}
                      onChange={(eML) => setReasonML(eML.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr style={stylesML.divider} />

              <button
                type="button"
                className="eb-add-btn"
                style={{
                  ...stylesML.addButton,
                  ...(isAddingML ? stylesML.addButtonDisabled : {}),
                }}
                onClick={handleAddML}
                disabled={isAddingML}
              >
                <span style={stylesML.addButtonLabel}>Add Blackout Date</span>
                <span style={stylesML.plusWrap}>
                  <PlusIcon />
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      <div style={stylesML.listCard}>
        <div style={stylesML.listHeaderRow}>
          <div style={stylesML.listHeaderLeft}>
            <p style={stylesML.listTitle}>Current Blackout Dates</p>
            <p style={stylesML.descText}>
              This blackout dates block bookings across your entire store.
            </p>
          </div>
        </div>

        <hr style={stylesML.divider} />

        <div style={stylesML.columnHeaderRow}>
          <p style={stylesML.columnHeaderCell}>Date</p>
          <p style={stylesML.columnHeaderCell}>Reason</p>
          <p style={{ ...stylesML.columnHeaderCell, textAlign: "center" }}>
            Actions
          </p>
        </div>

        <hr style={stylesML.divider} />

        {blackoutDatesML.length === 0 ? (
          <p style={stylesML.emptyText}>No shop-wide blackout dates yet.</p>
        ) : (
          blackoutDatesML.map((bML) => (
            <div key={bML.id}>
              <div style={stylesML.rowWrap}>
                <p style={stylesML.rowCell}>{bML.date}</p>
                <p style={stylesML.rowCell}>{bML.reason ?? "—"}</p>
                <div style={stylesML.actionsCell}>
                  <button
                    type="button"
                    style={stylesML.deleteButton}
                    onClick={() => handleDeleteML(bML.id)}
                    disabled={isSubmittingML}
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
              <hr style={stylesML.divider} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};