import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  createLocationML,
  deleteLocationML,
  listLocationsML,
  parseLocationFormML,
  reorderLocationsML,
  updateLocationML,
  type LocationFieldErrors,
  type LocationFormValues,
} from "../models/bookingLocation.server";
import { timezoneOffsetLabelML } from "../utils/timezones";
import { COUNTRIES_ML, findCountryByTimezoneML, type Country } from "../utils/countries";
import { WEEKDAY_LABELS_ML } from "../models/weekday-labels";
import { TimeField12h } from "../components/TimeField12h";
import { parseWorkingDaysML } from "../utils/workingDays";

type FieldChangeEvent = { currentTarget: { value: string } };

const EMPTY_FORM_ML: LocationFormValues = {
  name: "",
  timezone: "UTC",
  isEnabled: true,
  workingDays: null,
  dailyStartTime: null,
  dailyEndTime: null,
};

const ACCENT_ML = "#073E74";
const LINE_BORDER_ML = "#DBDBDB";
const INPUT_BORDER_ML = "#E9E9EA";
const LABEL_GREY_ML = "#373737";
const TEXT_BLACK_ML = "#000000";

const SORTED_COUNTRIES_ML = [...COUNTRIES_ML].sort((aML, bML) =>
  aML.name.localeCompare(bML.name),
);

const ChevronIcon = ({ open: openML }: { open: boolean }) => (
  <svg
    width="11"
    height="6"
    viewBox="0 0 11 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: openML ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  >
    <path
      d="M1 1L5.5 5L10 1"
      stroke={ACCENT_ML}
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

const stylesML: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "10px 10px 13px",
    gap: "16px",
    width: "100%",
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
  fieldGroupFull: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "100%",
    alignSelf: "stretch",
  },
  fieldGroupHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 260px",
    minWidth: 0,
  },
  fieldGroupThirty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "3 1 0",
    minWidth: 0,
  },
  fieldGroupSeventy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "7 1 0",
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
  selectInput: {
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
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  hintText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: LABEL_GREY_ML,
    margin: 0,
  },
  daysGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
  },
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "10px",
    width: "100%",
  },
  dayTile: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    minHeight: "48px",
    padding: "10px 14px",
    background: "#FFFFFF",
    border: "1px solid #E3E3E3",
    borderRadius: "10px",
    transition: "background 0.15s ease, border-color 0.15s ease",
  },
  dayTileActive: {
    background: "#F2F9FF",
    border: "1px solid #88B5E1",
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
  requiredLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK_ML,
    margin: 0,
    cursor: "pointer",
  },
  requiredRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    height: "24px",
    flex: "none",
  },
  addButton: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    gap: "4px",
    width: "fit-content",
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
  cancelButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    height: "42px",
    background: "transparent",
    borderRadius: "10px",
    border: `1px solid ${INPUT_BORDER_ML}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  cancelButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK_ML,
    whiteSpace: "nowrap",
  },
  buttonRow: {
    display: "flex",
    flexDirection: "row",
    gap: "10px",
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
    minHeight: "40px",
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
    alignItems: "center",
  },
  iconButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    width: "40px",
    height: "40px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
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
  const locationsML = await listLocationsML(sessionML.shop);
  return { locations: locationsML };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as
    "create" | "update" | "delete" | "reorder" | "";

  if (intentML === "reorder") {
    let orderedIdsML: string[] = [];
    try {
      orderedIdsML = JSON.parse(String(formDataML.get("orderedIds") ?? "[]"));
    } catch {
      orderedIdsML = [];
    }
    await reorderLocationsML(sessionML.shop, orderedIdsML);
    return { intent: intentML, ok: true as const };
  }

  if (intentML === "delete") {
    const idML = String(formDataML.get("id") ?? "");
    const resultML = await deleteLocationML(sessionML.shop, idML);
    return { intent: intentML, ...resultML };
  }

  const { values: valuesML, errors: errorsML } = parseLocationFormML(formDataML);
  if (Object.keys(errorsML).length > 0) {
    return { intent: intentML, ok: false as const, errors: errorsML, values: valuesML };
  }

  if (intentML === "update") {
    const idML = String(formDataML.get("id") ?? "");
    const resultML = await updateLocationML(sessionML.shop, idML, valuesML);
    return { intent: intentML, ...resultML, values: valuesML };
  }

  const resultML = await createLocationML(sessionML.shop, valuesML);
  if (!resultML.ok) {
    return {
      intent: "create" as const,
      ok: false as const,
      errors: { name: resultML.error },
      values: valuesML,
    };
  }
  return { intent: "create" as const, ok: true as const, values: EMPTY_FORM_ML };
};

function Checkbox({
  checked: checkedML,
  onChange: onChangeML,
  label: labelML,
  labelStyle: labelStyleML,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  labelStyle?: React.CSSProperties;
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
      <p style={labelStyleML ?? stylesML.dayLabel} onClick={onChangeML}>
        {labelML}
      </p>
    </div>
  );
}

function CountrySelect({
  value: valueML,
  extraOption: extraOptionML,
  onChange: onChangeML,
}: {
  value: string;
  extraOption: { code: string; name: string } | null;
  onChange: (code: string) => void;
}) {
  return (
    <div style={stylesML.inputBox}>
      <select
        style={stylesML.selectInput}
        value={valueML}
        onChange={(eML: FieldChangeEvent) => onChangeML(eML.currentTarget.value)}
      >
        <option value="">Select a country</option>
        {extraOptionML && (
          <option value={extraOptionML.code}>{extraOptionML.name}</option>
        )}
        {SORTED_COUNTRIES_ML.map((countryML) => (
          <option key={countryML.code} value={countryML.code}>
            {countryML.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RegionSelect({
  country: countryML,
  value: valueML,
  onChange: onChangeML,
}: {
  country: Country;
  value: string;
  onChange: (tz: string) => void;
}) {
  return (
    <div style={stylesML.inputBox}>
      <select
        style={stylesML.selectInput}
        value={valueML}
        onChange={(eML: FieldChangeEvent) => onChangeML(eML.currentTarget.value)}
      >
        {countryML.timezones.map((zoneML) => (
          <option key={zoneML.tz} value={zoneML.tz}>
            {zoneML.label} ({timezoneOffsetLabelML(zoneML.tz)})
          </option>
        ))}
      </select>
    </div>
  );
}

function LocationEditor({
  initial: initialML,
  onCancel: onCancelML,
  submitLabel: submitLabelML,
  locationId: locationIdML,
  open: openML,
  onToggleOpen: onToggleOpenML,
  title: titleML,
  description: descriptionML,
}: {
  initial: LocationFormValues;
  onCancel?: () => void;
  submitLabel: string;
  locationId?: string;
  open?: boolean;
  onToggleOpen?: () => void;
  title?: string;
  description?: string;
}) {
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const [valuesML, setValuesML] = useState<LocationFormValues>(initialML);

  const matchedCountryML = findCountryByTimezoneML(initialML.timezone);
  const [countryCodeML, setCountryCodeML] = useState<string>(
    matchedCountryML?.code ?? (initialML.timezone ? "__custom__" : ""),
  );
  const customOptionML =
    !matchedCountryML && initialML.timezone
      ? { code: "__custom__", name: `Custom (${initialML.timezone})` }
      : null;
  const selectedCountryML =
    SORTED_COUNTRIES_ML.find((cML) => cML.code === countryCodeML) ?? null;

  const isEditML = Boolean(locationIdML);
  const errorsML: LocationFieldErrors =
    fetcherML.data && "errors" in fetcherML.data ? fetcherML.data.errors ?? {} : {};

  useEffect(() => {
    if (fetcherML.data?.ok) {
      shopifyML.toast.show(isEditML ? "Location updated" : "Location added");
      if (!isEditML) {
        setValuesML(EMPTY_FORM_ML);
        setCountryCodeML("");
      }
      onCancelML?.();
    }
  }, [fetcherML.data]);

  const isSavingML = fetcherML.state !== "idle";

  const handleCountryChangeML = (codeML: string) => {
    setCountryCodeML(codeML);
    if (codeML === "__custom__") return;
    const countryML = SORTED_COUNTRIES_ML.find((cML) => cML.code === codeML);
    if (countryML) {
      setValuesML((prevML) => ({ ...prevML, timezone: countryML.timezones[0].tz }));
    }
  };

  const toggleWorkingDayML = (dayML: number) => {
    setValuesML((prevML) => {
      const currentML = prevML.workingDays ?? [];
      const hasML = currentML.includes(dayML);
      const workingDaysML = hasML
        ? currentML.filter((dML) => dML !== dayML)
        : [...currentML, dayML].sort((aML, bML) => aML - bML);
      return { ...prevML, workingDays: workingDaysML };
    });
  };

  const allWeekdaysSelectedML = WEEKDAY_LABELS_ML.every((dayML) =>
    (valuesML.workingDays ?? []).includes(dayML.value),
  );

  const toggleSelectAllWorkingDaysML = () => {
    setValuesML((prevML) => ({
      ...prevML,
      workingDays: allWeekdaysSelectedML
        ? []
        : WEEKDAY_LABELS_ML.map((dayML) => dayML.value),
    }));
  };

  const handleSubmitML = () => {
    fetcherML.submit(
      {
        intent: isEditML ? "update" : "create",
        ...(locationIdML ? { id: locationIdML } : {}),
        name: valuesML.name,
        timezone: valuesML.timezone,
        isEnabled: String(valuesML.isEnabled),
        workingDays: valuesML.workingDays ? valuesML.workingDays.join(",") : "",
        dailyStartTime: valuesML.dailyStartTime ?? "",
        dailyEndTime: valuesML.dailyEndTime ?? "",
      },
      { method: "POST" },
    );
  };

  const showChromeML = titleML !== undefined;

  return (
    <div style={{ ...stylesML.card, height: "auto" }}>
      <div style={stylesML.body}>
        {showChromeML && (
          <div
            style={{
              ...stylesML.headerRow,
              cursor: onToggleOpenML ? "pointer" : undefined,
            }}
            onClick={onToggleOpenML}
          >
            <div style={stylesML.headerLeft}>
              <p style={stylesML.title}>{titleML}</p>
              {descriptionML && <p style={stylesML.descText}>{descriptionML}</p>}
            </div>
            {onToggleOpenML && (
              <button
                type="button"
                style={stylesML.chevronButton}
                aria-label={openML ? "Collapse" : "Expand"}
              >
                <ChevronIcon open={Boolean(openML)} />
              </button>
            )}
          </div>
        )}

        {(openML ?? true) && (
          <>
            {showChromeML && <hr style={stylesML.divider} />}

            <div style={stylesML.fieldsRow}>
              <div style={stylesML.fieldGroupThirty}>
                <p style={stylesML.fieldLabel}>Location name</p>
                <div style={stylesML.inputBox}>
                  <input
                    type="text"
                    style={stylesML.textInput}
                    placeholder="California"
                    value={valuesML.name}
                    onChange={(eML: FieldChangeEvent) => {
                      const valueML = eML.currentTarget.value;
                      setValuesML((prevML) => ({ ...prevML, name: valueML }));
                    }}
                  />
                </div>
                {errorsML.name && (
                  <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                    {errorsML.name}
                  </p>
                )}
              </div>

              <div style={stylesML.fieldGroupSeventy}>
                <p style={stylesML.fieldLabel}>Country</p>
                <CountrySelect
                  value={countryCodeML}
                  extraOption={customOptionML}
                  onChange={handleCountryChangeML}
                />
              </div>
            </div>

            {selectedCountryML && selectedCountryML.timezones.length > 1 && (
              <div style={stylesML.fieldGroupFull}>
                <p style={stylesML.fieldLabel}>Region</p>
                <RegionSelect
                  country={selectedCountryML}
                  value={valuesML.timezone}
                  onChange={(tzML) =>
                    setValuesML((prevML) => ({ ...prevML, timezone: tzML }))
                  }
                />
                <p style={stylesML.hintText}>
                  Booking hours and slot times use this time zone.
                </p>
              </div>
            )}

            {errorsML.timezone && (
              <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                {errorsML.timezone}
              </p>
            )}

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
                  const isCheckedML = (valuesML.workingDays ?? []).includes(
                    dayML.value,
                  );
                  return (
                    <div
                      key={dayML.value}
                      style={{
                        ...stylesML.dayTile,
                        ...(isCheckedML ? stylesML.dayTileActive : {}),
                      }}
                    >
                      <Checkbox
                        checked={isCheckedML}
                        onChange={() => toggleWorkingDayML(dayML.value)}
                        label={dayML.label}
                      />
                    </div>
                  );
                })}
              </div>
              <p style={stylesML.descText}>
                Leave blank to use the shop default. Only set these if
                this location's hours differ.
              </p>
            </div>

            <div style={stylesML.fieldsRow}>
              <div style={stylesML.fieldGroupHalf}>
                <p style={stylesML.fieldLabel}>Start time</p>
                <TimeField12h
                  value={valuesML.dailyStartTime}
                  onChange={(nextML) =>
                    setValuesML((prevML) => ({ ...prevML, dailyStartTime: nextML }))
                  }
                  inputBoxStyle={stylesML.inputBox}
                  inputStyle={stylesML.textInput}
                  borderColor={INPUT_BORDER_ML}
                  textColor={TEXT_BLACK_ML}
                />
                <p style={stylesML.hintText}>12-hour format, hh:mm AM/PM</p>
                {errorsML.dailyStartTime && (
                  <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                    {errorsML.dailyStartTime}
                  </p>
                )}
              </div>
              <div style={stylesML.fieldGroupHalf}>
                <p style={stylesML.fieldLabel}>End time</p>
                <TimeField12h
                  value={valuesML.dailyEndTime}
                  onChange={(nextML) =>
                    setValuesML((prevML) => ({ ...prevML, dailyEndTime: nextML }))
                  }
                  inputBoxStyle={stylesML.inputBox}
                  inputStyle={stylesML.textInput}
                  borderColor={INPUT_BORDER_ML}
                  textColor={TEXT_BLACK_ML}
                />
                <p style={stylesML.hintText}>12-hour format, hh:mm AM/PM</p>
                {errorsML.dailyEndTime && (
                  <p style={{ ...stylesML.hintText, color: "#D82C0D" }}>
                    {errorsML.dailyEndTime}
                  </p>
                )}
              </div>
            </div>

            <Checkbox
              checked={valuesML.isEnabled}
              onChange={() =>
                setValuesML((prevML) => ({ ...prevML, isEnabled: !prevML.isEnabled }))
              }
              label="Visible to shoppers"
              labelStyle={stylesML.requiredLabel}
            />

            {showChromeML && <hr style={stylesML.divider} />}

            <div style={stylesML.buttonRow}>
              {onCancelML && (
                <button
                  type="button"
                  style={stylesML.cancelButton}
                  onClick={onCancelML}
                  disabled={isSavingML}
                >
                  <span style={stylesML.cancelButtonLabel}>Cancel</span>
                </button>
              )}
              <button
                type="button"
                style={{
                  ...stylesML.addButton,
                  ...(isSavingML ? stylesML.addButtonDisabled : {}),
                }}
                onClick={handleSubmitML}
                disabled={isSavingML}
              >
                <span style={stylesML.addButtonLabel}>{submitLabelML}</span>
                {!isEditML && (
                  <span style={stylesML.plusWrap}>
                    <PlusIcon />
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LocationRow({
  location: locationML,
  onMoveUp: onMoveUpML,
  onMoveDown: onMoveDownML,
  isFirst: isFirstML,
  isLast: isLastML,
  isReordering: isReorderingML,
}: {
  location: {
    id: string;
    name: string;
    timezone: string;
    isEnabled: boolean;
    workingDays: string | null;
    dailyStartTime: string | null;
    dailyEndTime: string | null;
  };
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
}) {
  const deleteFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const [isEditingML, setIsEditingML] = useState(false);
  const isDeletingML = deleteFetcherML.state !== "idle";
  const isBusyML = isDeletingML || isReorderingML;

  useEffect(() => {
    if (deleteFetcherML.data?.intent !== "delete") return;
    if (deleteFetcherML.data.ok) {
      shopifyML.toast.show("Location removed");
    } else {
      shopifyML.toast.show(deleteFetcherML.data.error || "Couldn't delete location.", {
        isError: true,
      });
    }
  }, [deleteFetcherML.data, shopifyML]);

  const handleDeleteML = () => {
    deleteFetcherML.submit(
      { intent: "delete", id: locationML.id },
      { method: "POST" },
    );
  };

  if (isEditingML) {
    return (
      <div>
        <LocationEditor
          locationId={locationML.id}
          submitLabel="Save"
          onCancel={() => setIsEditingML(false)}
          initial={{
            name: locationML.name,
            timezone: locationML.timezone,
            isEnabled: locationML.isEnabled,
            workingDays: locationML.workingDays
              ? parseWorkingDaysML(locationML.workingDays)
              : null,
            dailyStartTime: locationML.dailyStartTime,
            dailyEndTime: locationML.dailyEndTime,
          }}
        />
        <hr style={stylesML.divider} />
      </div>
    );
  }

  const offsetML = timezoneOffsetLabelML(locationML.timezone);

  return (
    <div>
      <div style={stylesML.rowWrap}>
        <p style={stylesML.rowCell}>{locationML.name}</p>
        <p style={stylesML.rowCell}>
          {locationML.timezone}
          {offsetML ? ` (${offsetML})` : ""}
        </p>
        <p style={stylesML.rowCell}>
          {locationML.workingDays || locationML.dailyStartTime || locationML.dailyEndTime
            ? "Custom"
            : "Shop default"}
        </p>
        <p style={stylesML.rowCell}>{locationML.isEnabled ? "Visible" : "Hidden"}</p>
        <div style={stylesML.actionsCell}>
          <button
            type="button"
            style={{
              ...stylesML.iconButton,
              ...(isFirstML || isBusyML ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveUpML}
            disabled={isBusyML}
            aria-label={`Move ${locationML.name} up`}
          >
            <img src="/arrow-up.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={{
              ...stylesML.iconButton,
              ...(isLastML || isBusyML ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveDownML}
            disabled={isBusyML}
            aria-label={`Move ${locationML.name} down`}
          >
            <img src="/arrow-down.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={stylesML.iconButton}
            onClick={() => setIsEditingML(true)}
            disabled={isBusyML}
            aria-label={`Edit ${locationML.name}`}
          >
            <img src="/edit-icon.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={stylesML.deleteButton}
            onClick={handleDeleteML}
            disabled={isReorderingML}
            aria-label={`Delete ${locationML.name}`}
          >
            <img
              src="/delete-icon.svg"
              width={44}
              height={40}
              alt="Delete"
              style={{
                display: "block",
                ...(isDeletingML ? { opacity: 0.5 } : {}),
              }}
            />
          </button>
        </div>
      </div>
      <hr style={stylesML.divider} />
    </div>
  );
}

export default function LocationsPage() {
  const { locations: loaderLocationsML } = useLoaderData<typeof loader>();
  const reorderFetcherML = useFetcher<typeof action>();
  const [locationsML, setLocationsML] = useState(loaderLocationsML);
  const [openML, setOpenML] = useState(false);
  const isReorderingML = reorderFetcherML.state !== "idle";

  useEffect(() => {
    setLocationsML(loaderLocationsML);
  }, [loaderLocationsML]);

  const persistOrderML = (orderedML: typeof locationsML) => {
    reorderFetcherML.submit(
      {
        intent: "reorder",
        orderedIds: JSON.stringify(orderedML.map((lML) => lML.id)),
      },
      { method: "POST" },
    );
  };

  const moveLocationML = (indexML: number, directionML: -1 | 1) => {
    const targetIndexML = (indexML + directionML + locationsML.length) % locationsML.length;

    const reorderedML = [...locationsML];
    const [movedML] = reorderedML.splice(indexML, 1);
    reorderedML.splice(targetIndexML, 0, movedML);

    setLocationsML(reorderedML);
    persistOrderML(reorderedML);
  };

  return (
    <div style={{ fontFamily: "Inter" }}>
      <LocationEditor
        initial={EMPTY_FORM_ML}
        submitLabel="Add Location"
        open={openML}
        onToggleOpen={() => setOpenML(!openML)}
        title="Add a Locations"
        description="Locations shoppers pick before choosing a date and time- Each has its own timezone, so slot times are always local."
      />

      <div style={stylesML.listCard}>
        <div style={stylesML.listHeaderRow}>
          <div style={stylesML.listHeaderLeft}>
            <p style={stylesML.listTitle}>Current locations</p>
            <p style={stylesML.descText}>
              Use the arrows to reorder how these appear on the storefront.
            </p>
          </div>
        </div>

        <hr style={stylesML.divider} />

        <div style={stylesML.columnHeaderRow}>
          <p style={stylesML.columnHeaderCell}>Location Name</p>
          <p style={stylesML.columnHeaderCell}>Timezone</p>
          <p style={stylesML.columnHeaderCell}>Hours</p>
          <p style={stylesML.columnHeaderCell}>Visibility</p>
          <p style={{ ...stylesML.columnHeaderCell, textAlign: "left" }}>
            Actions
          </p>
        </div>

        <hr style={stylesML.divider} />

        {locationsML.length === 0 ? (
          <p style={stylesML.emptyText}>No locations yet.</p>
        ) : (
          locationsML.map((locationML, indexML) => (
            <LocationRow
              key={locationML.id}
              location={locationML}
              isFirst={indexML === 0}
              isLast={indexML === locationsML.length - 1}
              onMoveUp={() => moveLocationML(indexML, -1)}
              onMoveDown={() => moveLocationML(indexML, 1)}
              isReordering={isReorderingML}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};