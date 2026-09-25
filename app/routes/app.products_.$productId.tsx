import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { WEEKDAY_LABELS_ML } from "../models/weekday-labels";
import { TimeField12h } from "../components/TimeField12h";
import { BOOKING_TYPES_ML, BOOKING_TYPE_LABELS_ML } from "../models/bookingTypes";
import { getBookingSettingsML } from "../models/bookingSettings.server";
import {
  ensureBookableProductML,
  parseBookableProductFormML,
  toBookableProductFormValuesML,
  upsertBookableProductOverridesML,
  type BookableProductFieldErrors,
  type BookableProductFormValues,
} from "../models/bookableProduct.server";
import {
  addBlackoutDateML,
  deleteBlackoutDateML,
  excludeShopBlackoutDateForProductML,
  listProductBlackoutDatesML,
  listProductBlackoutExclusionsML,
  listShopBlackoutDatesML,
  parseBlackoutDateFormML,
  type BlackoutDateFieldErrors,
} from "../models/blackoutDate.server";
import { listEnabledLocationsML } from "../models/bookingLocation.server";
import { COUNTRIES_ML, findCountryByTimezoneML } from "../utils/countries";
import {
  BLUE_ML,
  BORDER_ML,
  LICENSE_BORDER_ML,
  TEXT_DARK_ML,
  TEXT_MUTED_ML,
  stylesML as pageStyles,
  saveWrapperStyleML,
  saveButtonStyleML,
} from "../components/SettingsUI";

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request: requestML, params: paramsML }: LoaderFunctionArgs) => {
  const { admin: adminML, session: sessionML } = await authenticate.admin(requestML);
  const productIdML = `gid://shopify/Product/${paramsML.productId}`;

  const responseML = await adminML.graphql(
    `#graphql
      query BookingProductLookup($id: ID!) {
        product(id: $id) {
          id
          title
        }
      }`,
    { variables: { id: productIdML } },
  );
  const responseJsonML = await responseML.json();
  const productML = responseJsonML.data?.product;

  if (!productML) {
    throw new Response("Product not found", { status: 404 });
  }

  const bookableProductML = await ensureBookableProductML(
    sessionML.shop,
    productIdML,
    productML.title,
  );
  const [shopSettingsML, blackoutDatesML, shopBlackoutDatesML, productExclusionsML, enabledLocationsML] =
    await Promise.all([
      getBookingSettingsML(sessionML.shop),
      listProductBlackoutDatesML(sessionML.shop, bookableProductML.id),
      listShopBlackoutDatesML(sessionML.shop),
      listProductBlackoutExclusionsML(sessionML.shop, bookableProductML.id),
      listEnabledLocationsML(sessionML.shop),
    ]);

  const availableCountryCodesML = Array.from(
    new Set(
      enabledLocationsML
        .map((locML) => findCountryByTimezoneML(locML.timezone)?.code)
        .filter((codeML): codeML is string => Boolean(codeML)),
    ),
  );

  return {
    productId: productIdML,
    productTitle: productML.title as string,
    values: toBookableProductFormValuesML(bookableProductML),
    hasLocations: enabledLocationsML.length > 0,
    availableCountryCodes: availableCountryCodesML,
    shopDefaults: {
      workingDays: shopSettingsML.workingDays,
      dailyStartTime: shopSettingsML.dailyStartTime,
      dailyEndTime: shopSettingsML.dailyEndTime,
      slotDurationMinutes: shopSettingsML.slotDurationMinutes,
      bufferMinutes: shopSettingsML.bufferMinutes,
      minAdvanceHours: shopSettingsML.minAdvanceHours,
      maxAdvanceDays: shopSettingsML.maxAdvanceDays,
      maxBookingsPerSlot: shopSettingsML.maxBookingsPerSlot,
    },
    blackoutDates: [
      ...shopBlackoutDatesML
        .filter((bML: { date: Date }) => !productExclusionsML.has(bML.date.toISOString().slice(0, 10)))
        .map((bML: { id: string; date: Date; reason: string | null }) => ({
          id: bML.id,
          date: bML.date.toISOString().slice(0, 10),
          reason: bML.reason,
          source: "shop" as const,
        })),
      ...blackoutDatesML.map(
        (bML: { id: string; date: Date; reason: string | null }) => ({
          id: bML.id,
          date: bML.date.toISOString().slice(0, 10),
          reason: bML.reason,
          source: "product" as const,
        }),
      ),
    ],
  };
};

export const action = async ({ request: requestML, params: paramsML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const productIdML = `gid://shopify/Product/${paramsML.productId}`;
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as
    | "saveOverrides"
    | "addBlackoutDate"
    | "deleteBlackoutDate"
    | "excludeBlackoutDate"
    | "";

  if (intentML === "saveOverrides") {
    const productTitleML = String(formDataML.get("productTitle") ?? "");
    const { values: valuesML, errors: errorsML } = parseBookableProductFormML(formDataML);

    if (Object.keys(errorsML).length > 0) {
      return { intent: intentML, ok: false as const, errors: errorsML, values: valuesML };
    }

    if (valuesML.isEnabled) {
      const enabledLocationsML = await listEnabledLocationsML(sessionML.shop);
      if (enabledLocationsML.length === 0) {
        return {
          intent: intentML,
          ok: false as const,
          errors: {
            isEnabled:
              "Add at least one location in Booking Settings before enabling booking for a product.",
          },
          values: valuesML,
        };
      }
    }

    const savedML = await upsertBookableProductOverridesML(
      sessionML.shop,
      productIdML,
      productTitleML,
      valuesML,
    );
    return {
      intent: intentML,
      ok: true as const,
      errors: {},
      values: toBookableProductFormValuesML(savedML),
    };
  }

  if (intentML === "addBlackoutDate") {
    const bookableProductML = await ensureBookableProductML(
      sessionML.shop,
      productIdML,
      String(formDataML.get("productTitle") ?? ""),
    );
    const { date: dateML, reason: reasonML, errors: errorsML } = parseBlackoutDateFormML(formDataML);
    if (!dateML) {
      return { intent: intentML, ok: false as const, blackoutErrors: errorsML };
    }
    await addBlackoutDateML(sessionML.shop, dateML, reasonML, bookableProductML.id);
    return { intent: intentML, ok: true as const, blackoutErrors: {} };
  }

  if (intentML === "deleteBlackoutDate") {
    const idML = String(formDataML.get("id") ?? "");
    await deleteBlackoutDateML(sessionML.shop, idML);
    return { intent: intentML, ok: true as const };
  }

  if (intentML === "excludeBlackoutDate") {
    const bookableProductML = await ensureBookableProductML(
      sessionML.shop,
      productIdML,
      String(formDataML.get("productTitle") ?? ""),
    );
    const dateML = String(formDataML.get("date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateML)) {
      return { intent: intentML, ok: false as const };
    }
    await excludeShopBlackoutDateForProductML(sessionML.shop, bookableProductML.id, dateML);
    return { intent: intentML, ok: true as const };
  }

  return { intent: intentML, ok: false as const };
};

const ERROR_RED_ML = "#D82C0D";
const INPUT_BORDER_ML = LICENSE_BORDER_ML;

const uiML: Record<string, React.CSSProperties> = {
  root: { fontFamily: "Inter" },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  headerActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  closeButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    width: "40px",
    height: "40px",
    padding: "10px",
    borderRadius: "4px",
    textDecoration: "none",
  },
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px 10px 13px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
  },
  toggleCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "10px",
    gap: "12px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
  },
  toggleRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "128px",
    width: "100%",
  },
  toggleText: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "4px",
  },
  cardHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    width: "100%",
  },
  cardHeaderText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    minWidth: 0,
  },
  title: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  descRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_DARK_ML,
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
    borderTop: `1px solid ${BORDER_ML}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  daysGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
  },
  daysRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 20px",
    width: "100%",
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
    border: `1.5px solid ${BLUE_ML}`,
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
    background: BLUE_ML,
  },
  dayLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    margin: 0,
    cursor: "pointer",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    width: "100%",
  },
  fieldHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldThird: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 220px",
    minWidth: 0,
  },
  fieldFixed: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "200px",
    maxWidth: "100%",
    flex: "none",
  },
  fieldGrow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldLabelGrey: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_MUTED_ML,
    margin: 0,
  },
  fieldLabelBlack: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  inputBox: {
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
  },
  timeInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_DARK_ML,
    padding: 0,
  },
  numberInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    padding: 0,
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
    color: TEXT_DARK_ML,
    padding: 0,
    cursor: "pointer",
  },
  select: {
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    width: "100%",
    height: "34px",
    padding: "5px 34px 5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
    borderRadius: "4px",
    outline: "none",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    cursor: "pointer",
  },
  selectWrap: {
    position: "relative",
    width: "100%",
  },
  selectChevron: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    pointerEvents: "none",
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
  hintText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_MUTED_ML,
    margin: 0,
  },
  errorText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: ERROR_RED_ML,
    margin: 0,
  },
  textInput: {
    boxSizing: "border-box",
    width: "100%",
    height: "34px",
    padding: "5px 10px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
    borderRadius: "4px",
    outline: "none",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
  },
  countryListScroll: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    maxHeight: "220px",
    overflowY: "auto",
    padding: "10px",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "4px",
  },
  toggleButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "46px",
    height: "24px",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  },
  toggleOff: {
    position: "relative",
    display: "block",
    boxSizing: "border-box",
    width: "46px",
    height: "24px",
    borderRadius: "12px",
    background: "#E4E4E4",
    border: `1px solid ${BORDER_ML}`,
  },
  toggleKnob: {
    position: "absolute",
    top: "50%",
    left: "3px",
    transform: "translateY(-50%)",
    width: "17px",
    height: "17px",
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
  },
  addButton: {
    alignSelf: "flex-end",
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    gap: "4px",
    minWidth: "min(188px, 100%)",
    height: "42px",
    background: BLUE_ML,
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    justifyContent: "center",
    alignItems: "center",
    padding: "3px",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  columnHeaderRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "20px",
    width: "100%",
  },
  columnHeaderCell: {
    flex: "1 1 0",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  rowWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "20px",
    width: "100%",
    height: "40px",
  },
  rowCell: {
    flex: "1 1 0",
    alignSelf: "center",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_DARK_ML,
    margin: 0,
  },
  actionsCell: {
    flex: "1 1 0",
    alignSelf: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    display: "flex",
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
};

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="904 27 20 20"
      fill="none"
      aria-hidden="true"
      overflow="visible"
      style={{ display: "block" }}
    >
      <path
        d="M904 47L914 37L924 47M924 27L913.998 37L904 27"
        stroke={BLUE_ML}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
        stroke={BLUE_ML}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseChevron({ open: openML }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="6"
      viewBox="0 0 11 6"
      fill="none"
      aria-hidden="true"
      style={{
        transform: openML ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path
        d="M1 1L5.5 5L10 1"
        stroke={BLUE_ML}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Toggle({
  checked: checkedML,
  disabled: disabledML,
  onChange: onChangeML,
  label: labelML,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checkedML}
      aria-label={labelML}
      disabled={disabledML}
      onClick={onChangeML}
      style={{
        ...uiML.toggleButton,
        ...(disabledML ? { opacity: 0.5, cursor: "not-allowed" } : {}),
      }}
    >
      {checkedML ? (
        <img src="/enable.svg" width={46} height={24} alt="" />
      ) : (
        <span style={uiML.toggleOff}>
          <span style={uiML.toggleKnob} />
        </span>
      )}
    </button>
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
    <div style={uiML.dayItem}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checkedML}
        aria-label={labelML}
        style={uiML.checkbox}
        onClick={onChangeML}
      >
        {checkedML && <span style={uiML.checkboxDot} />}
      </button>
      <p style={uiML.dayLabel} onClick={onChangeML}>
        {labelML}
      </p>
    </div>
  );
}

function NumberStepper({
  onIncrement: onIncrementML,
  onDecrement: onDecrementML,
  label: labelML,
}: {
  onIncrement: () => void;
  onDecrement: () => void;
  label: string;
}) {
  return (
    <div style={uiML.stepperWrap}>
      <button
        type="button"
        style={uiML.stepperBtn}
        onClick={onIncrementML}
        aria-label={`Increase ${labelML}`}
        tabIndex={-1}
      >
        <span style={{ display: "flex", transform: "rotate(180deg)" }}>
          <ChevronDownIcon />
        </span>
      </button>
      <button
        type="button"
        style={uiML.stepperBtn}
        onClick={onDecrementML}
        aria-label={`Decrease ${labelML}`}
        tabIndex={-1}
      >
        <ChevronDownIcon />
      </button>
    </div>
  );
}

type FieldSize = "half" | "third" | "fixed" | "grow";

function fieldSizeStyleML(sizeML: FieldSize): React.CSSProperties {
  if (sizeML === "third") return uiML.fieldThird;
  if (sizeML === "fixed") return uiML.fieldFixed;
  if (sizeML === "grow") return uiML.fieldGrow;
  return uiML.fieldHalf;
}

function FieldGroup({
  label: labelML,
  grey: greyML,
  size: sizeML = "half",
  hint: hintML,
  error: errorML,
  children: childrenML,
}: {
  label: string;
  grey?: boolean;
  size?: FieldSize;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={fieldSizeStyleML(sizeML)}>
      <p style={greyML ? uiML.fieldLabelGrey : uiML.fieldLabelBlack}>{labelML}</p>
      {childrenML}
      {hintML && <p style={uiML.hintText}>{hintML}</p>}
      {errorML && <p style={uiML.errorText}>{errorML}</p>}
    </div>
  );
}

function Card({
  title: titleML,
  description: descriptionML,
  collapsible: collapsibleML,
  open: openML = true,
  onToggle: onToggleML,
  children: childrenML,
}: {
  title: string;
  description?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={uiML.card}>
      <div
        style={{
          ...uiML.cardHeaderRow,
          ...(collapsibleML ? { cursor: "pointer" } : {}),
        }}
        onClick={collapsibleML ? onToggleML : undefined}
      >
        <div style={uiML.cardHeaderText}>
          <p style={uiML.title}>{titleML}</p>
          {descriptionML && (
            <div style={uiML.descRow}>
              <p style={uiML.descText}>{descriptionML}</p>
            </div>
          )}
        </div>
        {collapsibleML && (
          <button
            type="button"
            style={uiML.chevronButton}
            aria-label={openML ? "Collapse" : "Expand"}
            aria-expanded={openML}
          >
            <CollapseChevron open={openML} />
          </button>
        )}
      </div>
      {openML && (
        <>
          <hr style={uiML.divider} />
          {childrenML}
        </>
      )}
    </div>
  );
}

function InlineTimeField({
  value: valueML,
  placeholder: placeholderML,
  onChange: onChangeML,
}: {
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  return (
    <TimeField12h
      value={valueML}
      placeholder={placeholderML}
      onChange={(nextML) => {
        if (nextML) onChangeML(nextML);
      }}
      inputBoxStyle={{
        ...uiML.inputBox,
        width: "auto",
        padding: "4px 8px",
        height: "32px",
      }}
      inputStyle={{ ...uiML.timeInput, flex: "0 0 20px" }}
      borderColor={INPUT_BORDER_ML}
      textColor={TEXT_DARK_ML}
      periodButtonStyle={{ fontSize: "11px", padding: "2px 6px" }}
    />
  );
}

function NumberField({
  label: labelML,
  value: valueML,
  placeholder: placeholderML,
  base: baseML,
  min: minML,
  step: stepML,
  size: sizeML = "half",
  hint: hintML,
  error: errorML,
  onChange: onChangeML,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  base?: number;
  min: number;
  step: number;
  size?: FieldSize;
  hint?: string;
  error?: string;
  onChange: (next: number | null) => void;
}) {
  const currentML = valueML ?? baseML ?? minML;
  return (
    <FieldGroup label={labelML} size={sizeML} hint={hintML} error={errorML}>
      <div style={uiML.inputBox}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          className="pc-no-spinner"
          style={uiML.numberInput}
          placeholder={placeholderML}
          value={valueML ?? ""}
          aria-label={labelML}
          onFocus={(eML: { currentTarget: HTMLInputElement }) =>
            eML.currentTarget.select()
          }
          onChange={(eML: FieldChangeEvent) => {
            const digitsML = eML.currentTarget.value.replace(/\D/g, "").slice(0, 4);
            onChangeML(digitsML === "" ? null : Number(digitsML));
          }}
        />
        <NumberStepper
          label={labelML.toLowerCase()}
          onIncrement={() => onChangeML(currentML + stepML)}
          onDecrement={() => onChangeML(Math.max(minML, currentML - stepML))}
        />
      </div>
    </FieldGroup>
  );
}

function DateField({
  label: labelML,
  value: valueML,
  grey: greyML,
  size: sizeML = "half",
  error: errorML,
  onChange: onChangeML,
  min: minML,
  max: maxML,
}: {
  label: string;
  value: string;
  grey?: boolean;
  size?: FieldSize;
  error?: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
}) {
  const refML = useRef<HTMLInputElement>(null);
  const openPickerML = () => {
    const elML = refML.current;
    if (!elML) return;
    if (typeof elML.showPicker === "function") {
      elML.showPicker();
    } else {
      elML.focus();
    }
  };
  return (
    <FieldGroup label={labelML} grey={greyML} size={sizeML} error={errorML}>
      <div
        style={{ ...uiML.inputBox, cursor: "pointer" }}
        onClick={openPickerML}
      >
        <img src="/date-icon.svg" width={18} height={20} alt="" />
        <input
          ref={refML}
          type="date"
          className="pc-date-input"
          style={uiML.dateInput}
          value={valueML}
          min={minML}
          max={maxML}
          onChange={(eML: FieldChangeEvent) => onChangeML(eML.currentTarget.value)}
          onClick={(eML) => eML.stopPropagation()}
          aria-label={labelML}
        />
      </div>
    </FieldGroup>
  );
}

export default function BookableProductPage() {
  const {
    productId: productIdML,
    productTitle: productTitleML,
    values: initialValuesML,
    hasLocations: hasLocationsML,
    availableCountryCodes: availableCountryCodesML,
    shopDefaults: shopDefaultsML,
    blackoutDates: blackoutDatesML,
  } = useLoaderData<typeof loader>();
  const overridesFetcherML = useFetcher<typeof action>();
  const blackoutFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();

  const [valuesML, setValuesML] =
    useState<BookableProductFormValues>(initialValuesML);
  const [newBlackoutDateML, setNewBlackoutDateML] = useState("");
  const [newBlackoutReasonML, setNewBlackoutReasonML] = useState("");
  const [blackoutOpenML, setBlackoutOpenML] = useState(false);
  const [countrySearchML, setCountrySearchML] = useState("");

  const errorsML: BookableProductFieldErrors =
    overridesFetcherML.data?.intent === "saveOverrides"
      ? (overridesFetcherML.data.errors ?? {})
      : {};
  const isSavingML =
    overridesFetcherML.state === "submitting" ||
    overridesFetcherML.state === "loading";
  const blackoutErrorsML: BlackoutDateFieldErrors =
    blackoutFetcherML.data && "blackoutErrors" in blackoutFetcherML.data
      ? (blackoutFetcherML.data.blackoutErrors ?? {})
      : {};
  const isBlackoutBusyML = blackoutFetcherML.state !== "idle";
  const isAddingBlackoutML =
    isBlackoutBusyML &&
    String(blackoutFetcherML.formData?.get("intent") ?? "") ===
      "addBlackoutDate";
  const numericProductIdML = productIdML.split("/").pop() ?? productIdML;

  useEffect(() => {
    if (
      overridesFetcherML.data?.intent === "saveOverrides" &&
      overridesFetcherML.data.ok
    ) {
      setValuesML(overridesFetcherML.data.values);
      shopifyML.toast.show("Product booking settings saved");
    }
  }, [overridesFetcherML.data, shopifyML]);

  useEffect(() => {
    if (
      blackoutFetcherML.data?.intent === "addBlackoutDate" &&
      blackoutFetcherML.data.ok
    ) {
      setNewBlackoutDateML("");
      setNewBlackoutReasonML("");
    }
  }, [blackoutFetcherML.data]);

  const setFieldML = <K extends keyof BookableProductFormValues>(
    keyML: K,
    valueML: BookableProductFormValues[K],
  ) => {
    setValuesML((prevML) => ({ ...prevML, [keyML]: valueML }));
  };

  const toggleWorkingDayML = (dayML: number) => {
    setValuesML((prevML) => {
      const currentML = { ...(prevML.dayTimes ?? {}) };
      if (currentML[dayML]) {
        delete currentML[dayML];
      } else {
        currentML[dayML] = { start: "09:00", end: "17:00" };
      }
      return { ...prevML, dayTimes: Object.keys(currentML).length ? currentML : null };
    });
  };

  const setDayTimeML = (dayML: number, fieldML: "start" | "end", valueML: string) => {
    setValuesML((prevML) => {
      const existingML = prevML.dayTimes?.[dayML] ?? { start: "09:00", end: "17:00" };
      return {
        ...prevML,
        dayTimes: {
          ...(prevML.dayTimes ?? {}),
          [dayML]: { ...existingML, [fieldML]: valueML },
        },
      };
    });
  };

  const toggleCountryML = (codeML: string) => {
    setValuesML((prevML) => {
      const hasML = prevML.countryCodes.includes(codeML);
      const countryCodesML = hasML
        ? prevML.countryCodes.filter((cML) => cML !== codeML)
        : [...prevML.countryCodes, codeML];
      return { ...prevML, countryCodes: countryCodesML };
    });
  };

  const availableCountriesML = COUNTRIES_ML.filter((countryML) =>
    availableCountryCodesML.includes(countryML.code),
  );

  const filteredCountriesML = availableCountriesML.filter((countryML) =>
    countryML.name.toLowerCase().includes(countrySearchML.trim().toLowerCase()),
  );

  const allWeekdaysSelectedML = WEEKDAY_LABELS_ML.every(
    (dayML) => valuesML.dayTimes?.[dayML.value] != null,
  );

  const toggleSelectAllWorkingDaysML = () => {
    setValuesML((prevML) => {
      if (allWeekdaysSelectedML) return { ...prevML, dayTimes: null };
      const nextML = { ...(prevML.dayTimes ?? {}) };
      for (const dayML of WEEKDAY_LABELS_ML) {
        if (!nextML[dayML.value]) nextML[dayML.value] = { start: "09:00", end: "17:00" };
      }
      return { ...prevML, dayTimes: nextML };
    });
  };

  const handleSaveML = () => {
    overridesFetcherML.submit(
      {
        intent: "saveOverrides",
        productTitle: productTitleML,
        isEnabled: String(valuesML.isEnabled),
        bookingType: valuesML.bookingType,
        workingDays: valuesML.workingDays ? valuesML.workingDays.join(",") : "",
        dailyStartTime: valuesML.dailyStartTime ?? "",
        dailyEndTime: valuesML.dailyEndTime ?? "",
        dayTimesJson: valuesML.dayTimes ? JSON.stringify(valuesML.dayTimes) : "",
        slotDurationMinutes:
          valuesML.slotDurationMinutes !== null
            ? String(valuesML.slotDurationMinutes)
            : "",
        bufferMinutes:
          valuesML.bufferMinutes !== null ? String(valuesML.bufferMinutes) : "",
        minAdvanceHours:
          valuesML.minAdvanceHours !== null ? String(valuesML.minAdvanceHours) : "",
        maxAdvanceDays:
          valuesML.maxAdvanceDays !== null ? String(valuesML.maxAdvanceDays) : "",
        maxBookingsPerSlot:
          valuesML.maxBookingsPerSlot !== null
            ? String(valuesML.maxBookingsPerSlot)
            : "",
        bookingStartDate: valuesML.bookingStartDate ?? "",
        bookingEndDate: valuesML.bookingEndDate ?? "",
        minNights: valuesML.minNights !== null ? String(valuesML.minNights) : "",
        maxNights: valuesML.maxNights !== null ? String(valuesML.maxNights) : "",
        bundleSessionCount:
          valuesML.bundleSessionCount !== null
            ? String(valuesML.bundleSessionCount)
            : "",
        bundleSessionDurationMinutes:
          valuesML.bundleSessionDurationMinutes !== null
            ? String(valuesML.bundleSessionDurationMinutes)
            : "",
        bundleValidityDays:
          valuesML.bundleValidityDays !== null
            ? String(valuesML.bundleValidityDays)
            : "",
        countryMode: valuesML.countryMode,
        countryCodes: valuesML.countryCodes.join(","),
      },
      { method: "POST" },
    );
  };

  const handleAddBlackoutDateML = () => {
    if (!newBlackoutDateML) return;
    blackoutFetcherML.submit(
      {
        intent: "addBlackoutDate",
        productTitle: productTitleML,
        date: newBlackoutDateML,
        reason: newBlackoutReasonML,
      },
      { method: "POST" },
    );
  };

  const handleDeleteBlackoutDateML = (idML: string) => {
    blackoutFetcherML.submit(
      { intent: "deleteBlackoutDate", id: idML },
      { method: "POST" },
    );
  };

  const handleExcludeBlackoutDateML = (dateML: string) => {
    blackoutFetcherML.submit(
      { intent: "excludeBlackoutDate", productTitle: productTitleML, date: dateML },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Booking and Reservation" inlineSize="large">
      <div style={uiML.root}>
        <style>{`
          .pc-no-spinner::-webkit-outer-spin-button,
          .pc-no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .pc-no-spinner {
            -moz-appearance: textfield;
          }
          .pc-date-input::-webkit-calendar-picker-indicator {
            opacity: 0;
            position: absolute;
            right: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
          }
        `}</style>

        <div style={pageStyles.outerCard}>
          <div style={pageStyles.headerRow}>
            <div style={{ minWidth: 0 }}>
              <h1 style={pageStyles.heading}>{productTitleML}</h1>
              <p style={pageStyles.pageSubtitle}>
                Product ID: {numericProductIdML}
              </p>
            </div>
            <div style={uiML.headerActions}>
              <div style={saveWrapperStyleML()}>
                <button
                  type="button"
                  style={saveButtonStyleML(isSavingML)}
                  disabled={isSavingML}
                  onClick={handleSaveML}
                >
                  {isSavingML ? "Saving..." : "Save Settings"}
                </button>
              </div>
              <Link
                to="/app/products"
                style={uiML.closeButton}
                aria-label="Close and go back to Products"
                title="Back to Products"
              >
                <CloseIcon />
              </Link>
            </div>
          </div>

          <div style={uiML.stack}>
            {!hasLocationsML && (
              <s-banner tone="warning" heading="No locations configured">
                <s-paragraph>
                  Booking needs at least one location so every slot has a
                  timezone to anchor to.
                </s-paragraph>
                <s-link href="/app/settings/locations">
                  Go to Locations
                </s-link>
              </s-banner>
            )}

            <div style={uiML.toggleCard}>
              <div style={uiML.toggleRow}>
                <div style={uiML.toggleText}>
                  <p style={uiML.fieldLabelBlack}>Bookings</p>
                </div>
                <Toggle
                  checked={valuesML.isEnabled}
                  disabled={!hasLocationsML && !valuesML.isEnabled}
                  onChange={() => setFieldML("isEnabled", !valuesML.isEnabled)}
                  label="Booking enabled for this product"
                />
              </div>
              {errorsML.isEnabled && (
                <p style={uiML.errorText}>{errorsML.isEnabled}</p>
              )}
            </div>

            <Card
              title="Booking Type"
              description="Choose how this product is booked. Changing this only affects what settings apply below, existing bookings aren’t touched."
            >
              <div style={uiML.fieldsRow}>
                <FieldGroup label="Booking Type" size="grow">
                  <div style={uiML.selectWrap}>
                    <select
                      style={uiML.select}
                      value={valuesML.bookingType}
                      aria-label="Booking Type"
                      onChange={(eML: FieldChangeEvent) =>
                        setFieldML(
                          "bookingType",
                          eML.currentTarget
                            .value as BookableProductFormValues["bookingType"],
                        )
                      }
                    >
                      {BOOKING_TYPES_ML.map((typeML) => (
                        <option key={typeML} value={typeML}>
                          {BOOKING_TYPE_LABELS_ML[typeML]}
                        </option>
                      ))}
                    </select>
                    <span style={uiML.selectChevron}>
                      <ChevronDownIcon />
                    </span>
                  </div>
                </FieldGroup>
              </div>
            </Card>

            <Card
              title="Country Availability"
              description='Control which countries can book this product. Leave as "All countries" to keep it open everywhere.'
            >
              <div style={uiML.fieldsRow}>
                <FieldGroup label="Availability" size="grow">
                  <div style={uiML.selectWrap}>
                    <select
                      style={uiML.select}
                      value={valuesML.countryMode}
                      aria-label="Country Availability"
                      onChange={(eML: FieldChangeEvent) => {
                        const nextModeML = eML.currentTarget
                          .value as BookableProductFormValues["countryMode"];
                        setFieldML("countryMode", nextModeML);
                        if (nextModeML === "ALL") {
                          setFieldML("countryCodes", []);
                        }
                      }}
                    >
                      <option value="ALL">All countries</option>
                      <option value="INCLUDE">Only these countries</option>
                      <option value="EXCLUDE">
                        All except these countries
                      </option>
                    </select>
                    <span style={uiML.selectChevron}>
                      <ChevronDownIcon />
                    </span>
                  </div>
                </FieldGroup>
              </div>

              {valuesML.countryMode !== "ALL" && (
                <div style={{ marginTop: "12px" }}>
                  <input
                    type="text"
                    style={uiML.textInput}
                    placeholder="Search countries…"
                    value={countrySearchML}
                    onChange={(eML: FieldChangeEvent) =>
                      setCountrySearchML(eML.currentTarget.value)
                    }
                  />
                  <div style={{ ...uiML.countryListScroll, marginTop: "8px" }}>
                    {filteredCountriesML.map((countryML) => (
                      <Checkbox
                        key={countryML.code}
                        checked={valuesML.countryCodes.includes(countryML.code)}
                        onChange={() => toggleCountryML(countryML.code)}
                        label={countryML.name}
                      />
                    ))}
                    {filteredCountriesML.length === 0 && (
                      <p style={uiML.hintText}>No countries match your search.</p>
                    )}
                  </div>
                  {valuesML.countryCodes.length > 0 && (
                    <p style={uiML.hintText}>
                      {valuesML.countryMode === "INCLUDE"
                        ? `Bookable only from: ${valuesML.countryCodes.join(", ")}`
                        : `Blocked in: ${valuesML.countryCodes.join(", ")}`}
                    </p>
                  )}
                  {errorsML.countryCodes && (
                    <p style={uiML.errorText}>{errorsML.countryCodes}</p>
                  )}
                </div>
              )}
            </Card>

            {(valuesML.bookingType === "SLOT" ||
              valuesML.bookingType === "FULL_DAY" ||
              valuesML.bookingType === "BUNDLE") && (
              <Card
                title="Working Days & Hours"
                description="Choose which days this product can be booked on, and set each day's own hours. Leave a day unchecked to leave it unavailable, or clear the whole schedule to inherit the shop default."
              >
                <div style={uiML.daysGroup}>
                  <div style={uiML.daysRow}>
                    <Checkbox
                      checked={allWeekdaysSelectedML}
                      onChange={toggleSelectAllWorkingDaysML}
                      label="Select All"
                    />
                  </div>
                  <div style={uiML.dayGrid}>
                  {WEEKDAY_LABELS_ML.map((dayML) => {
                    const dayTimeML = valuesML.dayTimes?.[dayML.value];
                    const isCheckedML = dayTimeML != null;
                    return (
                      <div
                        key={dayML.value}
                        style={{
                          ...uiML.dayTimeRow,
                          ...(isCheckedML ? uiML.dayTimeRowActive : {}),
                        }}
                      >
                <Checkbox
                    checked={isCheckedML}
                    onChange={() => toggleWorkingDayML(dayML.value)}
                    label={dayML.label}
                  />
                        {!isCheckedML && <p style={uiML.hintText}>Closed</p>}
                        {isCheckedML && (
                          <div style={uiML.dayTimeInputs}>
                            <InlineTimeField
                              value={dayTimeML.start}
                              placeholder={shopDefaultsML.dailyStartTime}
                              onChange={(nextML) =>
                                setDayTimeML(dayML.value, "start", nextML)
                              }
                            />
                            <span style={uiML.hintText}>to</span>
                            <InlineTimeField
                              value={dayTimeML.end}
                              placeholder={shopDefaultsML.dailyEndTime}
                              onChange={(nextML) =>
                                setDayTimeML(dayML.value, "end", nextML)
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
                {errorsML.dayTimes && (
                  <p style={uiML.errorText}>{errorsML.dayTimes}</p>
                )}
              </Card>
            )}

            {valuesML.bookingType === "SLOT" && (
              <Card
                title="Slot Configuration"
                description="Leave any field blank to use the shop default."
              >
                <div style={uiML.fieldsRow}>
                  <NumberField
                    label="Slot Duration (minutes)"
                    size="third"
                    value={valuesML.slotDurationMinutes}
                    placeholder={String(shopDefaultsML.slotDurationMinutes)}
                    base={shopDefaultsML.slotDurationMinutes}
                    min={5}
                    step={5}
                    error={errorsML.slotDurationMinutes}
                    onChange={(nextML) => setFieldML("slotDurationMinutes", nextML)}
                  />
                  <NumberField
                    label="Buffer Time Between Slots (minutes)"
                    size="third"
                    value={valuesML.bufferMinutes}
                    placeholder={String(shopDefaultsML.bufferMinutes)}
                    base={shopDefaultsML.bufferMinutes}
                    min={0}
                    step={5}
                    error={errorsML.bufferMinutes}
                    onChange={(nextML) => setFieldML("bufferMinutes", nextML)}
                  />
                  <NumberField
                    label="Max Bookings Per Slot"
                    size="third"
                    value={valuesML.maxBookingsPerSlot}
                    placeholder={String(shopDefaultsML.maxBookingsPerSlot)}
                    base={shopDefaultsML.maxBookingsPerSlot}
                    min={1}
                    step={1}
                    error={errorsML.maxBookingsPerSlot}
                    onChange={(nextML) => setFieldML("maxBookingsPerSlot", nextML)}
                  />
                </div>
              </Card>
            )}

            {valuesML.bookingType === "FULL_DAY" && (
              <Card
                title="Capacity"
                description="How many units of this product can be booked for the same day (e.g. number of identical venues/rooms). Leave blank to use the shop default."
              >
                <div style={uiML.fieldsRow}>
                  <NumberField
                    label="Max Bookings Per Day"
                    value={valuesML.maxBookingsPerSlot}
                    placeholder={String(shopDefaultsML.maxBookingsPerSlot)}
                    base={shopDefaultsML.maxBookingsPerSlot}
                    min={1}
                    step={1}
                    error={errorsML.maxBookingsPerSlot}
                    onChange={(nextML) => setFieldML("maxBookingsPerSlot", nextML)}
                  />
                </div>
              </Card>
            )}

            {valuesML.bookingType === "MULTI_DAY" && (
              <>
                <Card
                  title="Multi-day Settings"
                  description="The number of nights a customer can book in one go for this product."
                >
                  <div style={uiML.fieldsRow}>
                    <NumberField
                      label="Minimum Nights"
                      value={valuesML.minNights}
                      min={1}
                      step={1}
                      error={errorsML.minNights}
                      onChange={(nextML) => setFieldML("minNights", nextML)}
                    />
                    <NumberField
                      label="Maximum Nights"
                      value={valuesML.maxNights}
                      min={1}
                      step={1}
                      error={errorsML.maxNights}
                      onChange={(nextML) => setFieldML("maxNights", nextML)}
                    />
                  </div>
                </Card>

                <Card
                  title="Capacity"
                  description="How many identical rooms or units can be booked for the same night (e.g. number of rooms of this type). Leave blank to use the shop default."
                >
                  <div style={uiML.fieldsRow}>
                    <NumberField
                      label="Rooms / Units Available"
                      value={valuesML.maxBookingsPerSlot}
                      placeholder={String(shopDefaultsML.maxBookingsPerSlot)}
                      base={shopDefaultsML.maxBookingsPerSlot}
                      min={1}
                      step={1}
                      error={errorsML.maxBookingsPerSlot}
                      onChange={(nextML) => setFieldML("maxBookingsPerSlot", nextML)}
                    />
                  </div>
                </Card>
              </>
            )}

            {valuesML.bookingType === "BUNDLE" && (
              <Card
                title="Bundle Settings"
                description="How many sessions make up one bundle purchase, how long each session runs, and how many days the customer has to use them all."
              >
                <div style={uiML.fieldsRow}>
                  <NumberField
                    label="Sessions Per Bundle"
                    size="third"
                    value={valuesML.bundleSessionCount}
                    min={2}
                    step={1}
                    error={errorsML.bundleSessionCount}
                    onChange={(nextML) => setFieldML("bundleSessionCount", nextML)}
                  />
                  <NumberField
                    label="Session Duration (minutes)"
                    size="third"
                    value={valuesML.bundleSessionDurationMinutes}
                    min={5}
                    step={5}
                    error={errorsML.bundleSessionDurationMinutes}
                    onChange={(nextML) =>
                      setFieldML("bundleSessionDurationMinutes", nextML)
                    }
                  />
                  <NumberField
                    label="Validity Window (days)"
                    size="third"
                    value={valuesML.bundleValidityDays}
                    min={1}
                    step={1}
                    hint="How many days after purchase the customer can use all sessions"
                    error={errorsML.bundleValidityDays}
                    onChange={(nextML) => setFieldML("bundleValidityDays", nextML)}
                  />
                </div>
              </Card>
            )}

            <Card
              title="Advance Booking Rules"
              description="Control how soon and how far ahead customers can book this product (Leave blank to use the shop default)."
            >
              <div style={uiML.fieldsRow}>
                <NumberField
                  label="Minimum Advance Booking Time (hours)"
                  value={valuesML.minAdvanceHours}
                  placeholder={String(shopDefaultsML.minAdvanceHours)}
                  base={shopDefaultsML.minAdvanceHours}
                  min={0}
                  step={1}
                  error={errorsML.minAdvanceHours}
                  onChange={(nextML) => setFieldML("minAdvanceHours", nextML)}
                />
                <NumberField
                  label="Maximum Advance Booking (days)"
                  value={valuesML.maxAdvanceDays}
                  placeholder={String(shopDefaultsML.maxAdvanceDays)}
                  base={shopDefaultsML.maxAdvanceDays}
                  min={1}
                  step={1}
                  error={errorsML.maxAdvanceDays}
                  onChange={(nextML) => setFieldML("maxAdvanceDays", nextML)}
                />
              </div>
            </Card>

            <Card
              title="Booking Start and End Date"
              description="Set the overall window in which bookings are accepted (Leave blank to use the shop default)."
            >
              <div style={uiML.fieldsRow}>
                <DateField
                  label="Booking Start Date"
                  value={valuesML.bookingStartDate ?? ""}
                  error={errorsML.bookingStartDate}
                  onChange={(nextML) => setFieldML("bookingStartDate", nextML || null)}
                  max={valuesML.bookingEndDate ?? undefined}
                />
                <DateField
                  label="Booking End Date"
                  value={valuesML.bookingEndDate ?? ""}
                  error={errorsML.bookingEndDate}
                  onChange={(nextML) => setFieldML("bookingEndDate", nextML || null)}
                  min={valuesML.bookingStartDate ?? undefined}
                />
              </div>
            </Card>

            <Card
              title="Add a Blackout Date"
              description="Block bookings of this product on specific dates- holidays, closures, and one-off events (on top of any shop-wide blackout dates)."
              collapsible
              open={blackoutOpenML}
              onToggle={() => setBlackoutOpenML((prevML) => !prevML)}
            >
              <div style={uiML.fieldsRow}>
                <DateField
                  label="Date"
                  grey
                  size="fixed"
                  value={newBlackoutDateML}
                  error={blackoutErrorsML.date}
                  onChange={setNewBlackoutDateML}
                />
                <FieldGroup label="Reason (Optional)" grey size="grow">
                  <div style={uiML.inputBox}>
                    <input
                      type="text"
                      style={uiML.timeInput}
                      placeholder="e.g. Maintenance"
                      value={newBlackoutReasonML}
                      onChange={(eML: FieldChangeEvent) =>
                        setNewBlackoutReasonML(eML.currentTarget.value)
                      }
                    />
                  </div>
                </FieldGroup>
              </div>

              <hr style={uiML.divider} />

              <button
                type="button"
                className="eb-add-btn"
                style={{
                  ...uiML.addButton,
                  ...(isAddingBlackoutML
                    ? { opacity: 0.6, cursor: "not-allowed" }
                    : {}),
                }}
                onClick={handleAddBlackoutDateML}
                disabled={isAddingBlackoutML}
              >
                <span style={uiML.addButtonLabel}>Add Blackout Date</span>
                <span style={uiML.plusWrap}>
                  <PlusIcon />
                </span>
              </button>
            </Card>

            {blackoutDatesML.length > 0 && (
              <div style={uiML.card}>
                <div style={uiML.cardHeaderText}>
                  <p style={uiML.title}>Current Blackout Dates</p>
                  <p style={uiML.descText}>
                    This blackout dates block bookings for this product. Shop-wide dates are listed here too - removing one only excludes it for this product, it stays blacked out everywhere else.
                  </p>
                </div>

                <hr style={uiML.divider} />

                <div style={uiML.columnHeaderRow}>
                  <p style={uiML.columnHeaderCell}>Date</p>
                  <p style={uiML.columnHeaderCell}>Reason</p>
                  <p style={{ ...uiML.columnHeaderCell, textAlign: "center" }}>
                    Actions
                  </p>
                </div>

                <hr style={uiML.divider} />

                {blackoutDatesML.map(
                  (bML: {
                    id: string;
                    date: string;
                    reason: string | null;
                    source: "shop" | "product";
                  }) => (
                    <div key={bML.id} style={{ width: "100%" }}>
                      <div style={uiML.rowWrap}>
                        <p style={uiML.rowCell}>{bML.date}</p>
                        <p style={uiML.rowCell}>{bML.reason ?? "—"}</p>
                        <div style={uiML.actionsCell}>
                          <button
                            type="button"
                            style={uiML.deleteButton}
                            onClick={() =>
                              bML.source === "shop"
                                ? handleExcludeBlackoutDateML(bML.date)
                                : handleDeleteBlackoutDateML(bML.id)
                            }
                            disabled={isBlackoutBusyML}
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
                      <hr style={uiML.divider} />
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};