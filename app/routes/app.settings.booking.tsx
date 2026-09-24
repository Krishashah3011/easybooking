import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { WEEKDAY_LABELS_ML } from "../models/weekday-labels";
import { TimeField12h } from "../components/TimeField12h";
import {
  getBookingSettingsML,
  parseBookingSettingsFormML,
  toFormValuesML,
  upsertBookingSettingsML,
  type BookingSettingsFieldErrors,
  type BookingSettingsFormValues,
} from "../models/bookingSettings.server";
import type { RegisterSave } from "./app.settings";

type FieldChangeEvent = { currentTarget: { value: string } };

const ACCENT_ML = "#073E74";
const LINE_BORDER_ML = "#DBDBDB";
const INPUT_BORDER_ML = "#E9E9EA";
const LABEL_GREY_ML = "#373737";
const TEXT_BLACK_ML = "#000000";

const stylesML: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px 10px 13px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
    borderRadius: "4px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    width: "100%",
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
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER_ML}`,
    margin: 0,
    width: "100%",
  },
  daysGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
  },
  daysRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 20px",
    width: "100%",
    alignSelf: "stretch",
  },
  dayItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    height: "24px",
  },
  checkbox: {
    boxSizing: "border-box",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: `1.5px solid ${ACCENT_ML}`,
    background: "#FFFFFF",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
  checkboxDot: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: ACCENT_ML,
  },
  dayLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    margin: 0,
    cursor: "pointer",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
    flexWrap: "wrap",
  },
  fieldGroupHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldGroupThird: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    flex: "1 1 220px",
    minWidth: 0,
  },
  fieldLabelBlack: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  textInput: {
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
  },
  hintText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: LABEL_GREY_ML,
    margin: 0,
  },
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
    gap: "12px",
    width: "100%",
  },
  dayTimeRow: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
    minHeight: "112px",
    padding: "14px 16px",
    background: "#FFFFFF",
    border: "1px solid #E3E3E3",
    borderRadius: "10px",
    transition: "background 0.15s ease, border-color 0.15s ease",
  },
  dayTimeRowActive: {
    background: "#F2F9FF",
    border: "1px solid #88B5E1",
  },

  dayTimeInputs: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  smallInputBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "4px 8px",
    width: "84px",
    height: "30px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
    borderRadius: "4px",
  },
  smallTextInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    padding: 0,
  },
  selectBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 10px",
    gap: "10px",
    width: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
    borderRadius: "4px",
  },
  dateBox: {
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
    position: "relative",
    cursor: "pointer",
  },
  dateInput: {
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
  stepperWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "14px",
    height: "16px",
    marginLeft: "4px",
    overflow: "hidden",
  },
  stepperBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "14px",
    height: "8px",
    padding: 0,
    margin: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    lineHeight: 0,
    flexShrink: 0,
  },
};

function ChevronDownIcon() {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <path
        d="M1 1l3.15 3.433c.395.431.593.647.837.694.093.018.189.018.282 0 .244-.047.442-.263.837-.694L9.25 1"
        stroke={ACCENT_ML}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NumberStepper({
  onIncrement: onIncrementML,
  onDecrement: onDecrementML,
  incrementLabel: incrementLabelML,
  decrementLabel: decrementLabelML,
}: {
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel: string;
  decrementLabel: string;
}) {
  return (
    <div style={stylesML.stepperWrap}>
      <button
        type="button"
        style={stylesML.stepperBtn}
        onClick={onIncrementML}
        aria-label={incrementLabelML}
        tabIndex={-1}
      >
        <span style={{ display: "flex", transform: "rotate(180deg)" }}>
          <ChevronDownIcon />
        </span>
      </button>
      <button
        type="button"
        style={stylesML.stepperBtn}
        onClick={onDecrementML}
        aria-label={decrementLabelML}
        tabIndex={-1}
      >
        <ChevronDownIcon />
      </button>
    </div>
  );
}

function Checkbox({
  checked: checkedML,
  onChange: onChangeML,
  label: labelML,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div style={stylesML.dayItem}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checkedML}
        aria-label={labelML}
        style={stylesML.checkbox}
        onClick={onChangeML}
      >
        {checkedML && <span style={stylesML.checkboxDot} />}
      </button>
      <p style={stylesML.dayLabel} onClick={onChangeML}>
        {labelML}
      </p>
    </div>
  );
}

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const settingsML = await getBookingSettingsML(sessionML.shop);
  return {
    values: toFormValuesML(settingsML),
  };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const { values: valuesML, errors: errorsML } = parseBookingSettingsFormML(formDataML);

  if (Object.keys(errorsML).length > 0) {
    return { ok: false as const, errors: errorsML, values: valuesML };
  }

  const savedML = await upsertBookingSettingsML(sessionML.shop, valuesML);
  return { ok: true as const, errors: {}, values: toFormValuesML(savedML) };
};

export default function BookingSettingsPage() {
  const { values: initialValuesML } = useLoaderData<typeof loader>();
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const { registerSave: registerSaveML } = useOutletContext<{ registerSave: RegisterSave }>();

  const [valuesML, setValuesML] =
    useState<BookingSettingsFormValues>(initialValuesML);

  const bookingStartDateRefML = useRef<HTMLInputElement>(null);
  const bookingEndDateRefML = useRef<HTMLInputElement>(null);

  const openDatePickerML = (refML: React.RefObject<HTMLInputElement | null>) => {
    const elML = refML.current;
    if (!elML) return;
    if (typeof elML.showPicker === "function") {
      elML.showPicker();
    } else {
      elML.focus();
    }
  };

  const errorsML: BookingSettingsFieldErrors = fetcherML.data?.errors ?? {};
  const isSavingML =
    fetcherML.state === "submitting" || fetcherML.state === "loading";

  useEffect(() => {
    if (fetcherML.data?.ok) {
      setValuesML(fetcherML.data.values);
      shopifyML.toast.show("Booking settings saved");
    }
  }, [fetcherML.data, shopifyML]);

  const setFieldML = <K extends keyof BookingSettingsFormValues>(
    keyML: K,
    valueML: BookingSettingsFormValues[K],
  ) => {
    setValuesML((prevML) => ({ ...prevML, [keyML]: valueML }));
  };

  const handleNumericChangeML = <K extends keyof BookingSettingsFormValues>(
    keyML: K,
    rawML: string,
    maxDigitsML: number,
  ) => {
    const digitsML = rawML.replace(/\D/g, "").slice(0, maxDigitsML);
    setFieldML(keyML, (digitsML === "" ? 0 : Number(digitsML)) as BookingSettingsFormValues[K]);
  };

  const selectAllOnFocusML = (eML: { currentTarget: HTMLInputElement }) =>
    eML.currentTarget.select();

  const toggleWorkingDayML = (dayML: number) => {
    setValuesML((prevML) => {
      const currentML = { ...(prevML.dayTimes ?? {}) };
      if (currentML[dayML]) {
        delete currentML[dayML];
      } else {
        currentML[dayML] = { start: "09:00", end: "17:00" };
      }
      return { ...prevML, dayTimes: currentML };
    });
  };

  const setDayTimeML = (
    dayML: number,
    fieldML: "start" | "end",
    nextML: string | null,
  ) => {
    if (!nextML) return;
    setValuesML((prevML) => {
      const existingML = prevML.dayTimes?.[dayML] ?? { start: "09:00", end: "17:00" };
      return {
        ...prevML,
        dayTimes: {
          ...(prevML.dayTimes ?? {}),
          [dayML]: { ...existingML, [fieldML]: nextML },
        },
      };
    });
  };

  const allWeekdaysSelectedML = WEEKDAY_LABELS_ML.every(
    (dayML) => valuesML.dayTimes?.[dayML.value] != null,
  );

  const toggleSelectAllWorkingDaysML = () => {
    setValuesML((prevML) => {
      if (allWeekdaysSelectedML) return { ...prevML, dayTimes: {} };
      const nextML = { ...(prevML.dayTimes ?? {}) };
      for (const dayML of WEEKDAY_LABELS_ML) {
        if (!nextML[dayML.value]) nextML[dayML.value] = { start: "09:00", end: "17:00" };
      }
      return { ...prevML, dayTimes: nextML };
    });
  };

  const handleSaveML = () => {
    fetcherML.submit(
      {
        dayTimesJson: JSON.stringify(valuesML.dayTimes ?? {}),
        slotDurationMinutes: String(valuesML.slotDurationMinutes),
        bufferMinutes: String(valuesML.bufferMinutes),
        minAdvanceHours: String(valuesML.minAdvanceHours),
        maxAdvanceDays: String(valuesML.maxAdvanceDays),
        maxBookingsPerSlot: String(valuesML.maxBookingsPerSlot),
        bookingStartDate: valuesML.bookingStartDate ?? "",
        bookingEndDate: valuesML.bookingEndDate ?? "",
      },
      { method: "POST" }, 
    );
  };

  useEffect(() => {
    registerSaveML(handleSaveML, isSavingML);
    return () => registerSaveML(null, false);
  }, [registerSaveML, valuesML, isSavingML]);

  return (
    <>
      <style>{`
        .no-spinner-input::-webkit-outer-spin-button,
        .no-spinner-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner-input {
          -moz-appearance: textfield;
        }
        .booking-date-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          cursor: pointer;
        }
      `}</style>

      <div style={stylesML.card}>
        <div style={stylesML.headerLeft}>
          <p style={stylesML.title}>Working Days & Hours</p>
          <p style={stylesML.descText}>
            Choose which days customers can book, and set each day's own
            booking window. A day with no hours set isn't bookable.
          </p>
        </div>
        <hr style={stylesML.divider} />
        <div style={stylesML.daysGroup}>
          <div style={stylesML.daysRow}>
            <Checkbox
              checked={allWeekdaysSelectedML}
              onChange={toggleSelectAllWorkingDaysML}
              label="Select All"
            />
          </div>
          <div style={stylesML.dayGrid}>
          {WEEKDAY_LABELS_ML.map((dayML) => {
            const dayTimeML = valuesML.dayTimes?.[dayML.value];
            const isCheckedML = dayTimeML != null;
            const isOutOfOrderML =
              isCheckedML && dayTimeML.start != null && dayTimeML.end != null
                ? dayTimeML.end <= dayTimeML.start
                : false;
            return (
              <div
                key={dayML.value}
                style={{
                  ...stylesML.dayTimeRow,
                  ...(isCheckedML ? stylesML.dayTimeRowActive : {}),
                }}
              >
                <Checkbox
                    checked={isCheckedML}
                    onChange={() => toggleWorkingDayML(dayML.value)}
                    label={dayML.label}
                  />
                {!isCheckedML && <p style={stylesML.hintText}>Closed</p>}
                {isCheckedML && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "4px",
                    }}
                  >
                    <div style={stylesML.dayTimeInputs}>
                      <TimeField12h
                        value={dayTimeML.start}
                        onChange={(nextML) => setDayTimeML(dayML.value, "start", nextML)}
                        inputBoxStyle={{ ...stylesML.smallInputBox, width: "128px" }}
                        inputStyle={stylesML.smallTextInput}
                        borderColor={INPUT_BORDER_ML}
                        textColor={TEXT_BLACK_ML}
                      />
                      <span style={stylesML.hintText}>to</span>
                      <TimeField12h
                        value={dayTimeML.end}
                        onChange={(nextML) => setDayTimeML(dayML.value, "end", nextML)}
                        inputBoxStyle={{ ...stylesML.smallInputBox, width: "128px" }}
                        inputStyle={stylesML.smallTextInput}
                        borderColor={INPUT_BORDER_ML}
                        textColor={TEXT_BLACK_ML}
                      />
                    </div>
                    {isOutOfOrderML && (
                      <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                        End time must be after start time
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
        {errorsML.dayTimes && (
          <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
            {errorsML.dayTimes}
          </p>
        )}
      </div>

      <div style={{ ...stylesML.card, marginTop: "16px" }}>
        <div style={stylesML.headerLeft}>
          <p style={stylesML.title}>Slot Configuration</p>
          <p style={stylesML.descText}>
            Only applies to bookable products set to Slot or Bundle.
          </p>
        </div>
        <hr style={stylesML.divider} />
        <div style={stylesML.fieldsRow}>
          <div style={stylesML.fieldGroupThird}>
            <p style={stylesML.fieldLabelBlack}>Slot Duration (minutes)</p>
            <div style={stylesML.selectBox}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="no-spinner-input"
                style={stylesML.textInput}
                value={valuesML.slotDurationMinutes}
                onFocus={selectAllOnFocusML}
                onChange={(eML: FieldChangeEvent) =>
                  handleNumericChangeML(
                    "slotDurationMinutes",
                    eML.currentTarget.value,
                    4,
                  )
                }
              />
              <NumberStepper
                incrementLabel="Increase slot duration"
                decrementLabel="Decrease slot duration"
                onIncrement={() =>
                  setFieldML("slotDurationMinutes", valuesML.slotDurationMinutes + 5)
                }
                onDecrement={() =>
                  setFieldML(
                    "slotDurationMinutes",
                    Math.max(5, valuesML.slotDurationMinutes - 5),
                  )
                }
              />
            </div>
            {errorsML.slotDurationMinutes && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.slotDurationMinutes}
              </p>
            )}
          </div>
          <div style={stylesML.fieldGroupThird}>
            <p style={stylesML.fieldLabelBlack}>
              Buffer Time Between Slots (minutes)
            </p>
            <div style={stylesML.selectBox}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="no-spinner-input"
                style={stylesML.textInput}
                value={valuesML.bufferMinutes}
                onFocus={selectAllOnFocusML}
                onChange={(eML: FieldChangeEvent) =>
                  handleNumericChangeML("bufferMinutes", eML.currentTarget.value, 4)
                }
              />
              <NumberStepper
                incrementLabel="Increase buffer time"
                decrementLabel="Decrease buffer time"
                onIncrement={() =>
                  setFieldML("bufferMinutes", valuesML.bufferMinutes + 5)
                }
                onDecrement={() =>
                  setFieldML("bufferMinutes", Math.max(0, valuesML.bufferMinutes - 5))
                }
              />
            </div>
            {errorsML.bufferMinutes && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.bufferMinutes}
              </p>
            )}
          </div>
          <div style={stylesML.fieldGroupThird}>
            <p style={stylesML.fieldLabelBlack}>Max Bookings Per Slot</p>
            <div style={stylesML.selectBox}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                className="no-spinner-input"
                style={stylesML.textInput}
                value={valuesML.maxBookingsPerSlot}
                onFocus={selectAllOnFocusML}
                onChange={(eML: FieldChangeEvent) =>
                  handleNumericChangeML(
                    "maxBookingsPerSlot",
                    eML.currentTarget.value,
                    3,
                  )
                }
              />
              <NumberStepper
                incrementLabel="Increase max bookings per slot"
                decrementLabel="Decrease max bookings per slot"
                onIncrement={() =>
                  setFieldML("maxBookingsPerSlot", valuesML.maxBookingsPerSlot + 1)
                }
                onDecrement={() =>
                  setFieldML(
                    "maxBookingsPerSlot",
                    Math.max(1, valuesML.maxBookingsPerSlot - 1),
                  )
                }
              />
            </div>
            {errorsML.maxBookingsPerSlot && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.maxBookingsPerSlot}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...stylesML.card, marginTop: "16px" }}>
        <div style={stylesML.headerLeft}>
          <p style={stylesML.title}>Advance Booking Rules</p>
          <p style={stylesML.descText}>
            Control how soon and how far ahead customers are allowed to
            make a booking.
          </p>
        </div>
        <hr style={stylesML.divider} />
        <div style={stylesML.fieldsRow}>
          <div style={stylesML.fieldGroupHalf}>
            <p style={stylesML.fieldLabelBlack}>
              Minimum Advance Booking Time (hours)
            </p>
            <div style={stylesML.selectBox}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="no-spinner-input"
                style={stylesML.textInput}
                value={valuesML.minAdvanceHours}
                onFocus={selectAllOnFocusML}
                onChange={(eML: FieldChangeEvent) =>
                  handleNumericChangeML(
                    "minAdvanceHours",
                    eML.currentTarget.value,
                    4,
                  )
                }
              />
              <NumberStepper
                incrementLabel="Increase minimum advance booking time"
                decrementLabel="Decrease minimum advance booking time"
                onIncrement={() =>
                  setFieldML("minAdvanceHours", valuesML.minAdvanceHours + 1)
                }
                onDecrement={() =>
                  setFieldML(
                    "minAdvanceHours",
                    Math.max(0, valuesML.minAdvanceHours - 1),
                  )
                }
              />
            </div>
            {errorsML.minAdvanceHours && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.minAdvanceHours}
              </p>
            )}
          </div>
          <div style={stylesML.fieldGroupHalf}>
            <p style={stylesML.fieldLabelBlack}>
              Maximum Advance Booking (days)
            </p>
            <div style={stylesML.selectBox}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="no-spinner-input"
                style={stylesML.textInput}
                value={valuesML.maxAdvanceDays}
                onFocus={selectAllOnFocusML}
                onChange={(eML: FieldChangeEvent) =>
                  handleNumericChangeML(
                    "maxAdvanceDays",
                    eML.currentTarget.value,
                    4,
                  )
                }
              />
              <NumberStepper
                incrementLabel="Increase maximum advance booking days"
                decrementLabel="Decrease maximum advance booking days"
                onIncrement={() =>
                  setFieldML("maxAdvanceDays", valuesML.maxAdvanceDays + 1)
                }
                onDecrement={() =>
                  setFieldML(
                    "maxAdvanceDays",
                    Math.max(1, valuesML.maxAdvanceDays - 1),
                  )
                }
              />
            </div>
            {errorsML.maxAdvanceDays && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.maxAdvanceDays}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...stylesML.card, marginTop: "16px" }}>
        <div style={stylesML.headerLeft}>
          <p style={stylesML.title}>Booking Start and End Date</p>
          <p style={stylesML.descText}>
            Set the overall window in which bookings are accepted (leave blank to accept bookings anytime).
          </p>
        </div>
        <hr style={stylesML.divider} />
        <div style={stylesML.fieldsRow}>
          <div style={stylesML.fieldGroupHalf}>
            <p style={stylesML.fieldLabelBlack}>Booking Start Date</p>
            <div
              style={stylesML.dateBox}
              onClick={() => openDatePickerML(bookingStartDateRefML)}
            >
              <img src="/date-icon.svg" width={18} height={20} alt="" />
              <input
                ref={bookingStartDateRefML}
                type="date"
                className="booking-date-input"
                style={stylesML.dateInput}
                value={valuesML.bookingStartDate ?? ""}
                onChange={(eML: FieldChangeEvent) =>
                  setFieldML("bookingStartDate", eML.currentTarget.value || null)
                }
                onClick={(eML) => eML.stopPropagation()}
                aria-label="Booking Start Date"
              />
            </div>
            {errorsML.bookingStartDate && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.bookingStartDate}
              </p>
            )}
          </div>
          <div style={stylesML.fieldGroupHalf}>
            <p style={stylesML.fieldLabelBlack}>Booking End Date</p>
            <div
              style={stylesML.dateBox}
              onClick={() => openDatePickerML(bookingEndDateRefML)}
            >
              <img src="/date-icon.svg" width={18} height={20} alt="" />
              <input
                ref={bookingEndDateRefML}
                type="date"
                className="booking-date-input"
                style={stylesML.dateInput}
                value={valuesML.bookingEndDate ?? ""}
                onChange={(eML: FieldChangeEvent) =>
                  setFieldML("bookingEndDate", eML.currentTarget.value || null)
                }
                onClick={(eML) => eML.stopPropagation()}
                aria-label="Booking End Date"
              />
            </div>
            {errorsML.bookingEndDate && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.bookingEndDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};