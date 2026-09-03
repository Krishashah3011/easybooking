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
  createLocation,
  deleteLocation,
  listLocations,
  parseLocationForm,
  reorderLocations,
  updateLocation,
  type LocationFieldErrors,
  type LocationFormValues,
} from "../models/bookingLocation.server";
import { timezoneOffsetLabel } from "../utils/timezones";
import { COUNTRIES, findCountryByTimezone, type Country } from "../utils/countries";
import { WEEKDAY_LABELS } from "../models/weekday-labels";
import { parseWorkingDays } from "../utils/workingDays";

type FieldChangeEvent = { currentTarget: { value: string } };

const EMPTY_FORM: LocationFormValues = {
  name: "",
  timezone: "UTC",
  isEnabled: true,
  workingDays: null,
  dailyStartTime: null,
  dailyEndTime: null,
};

const ACCENT = "#073E74";
const LINE_BORDER = "#DBDBDB";
const INPUT_BORDER = "#E9E9EA";
const LABEL_GREY = "#373737";
const TEXT_BLACK = "#000000";

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name),
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
    color: LABEL_GREY,
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
    border: `1px solid ${INPUT_BORDER}`,
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
    color: TEXT_BLACK,
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
    color: TEXT_BLACK,
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
    color: LABEL_GREY,
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
    border: `1.5px solid ${ACCENT}`,
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
    background: ACCENT,
  },
  dayLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
    cursor: "pointer",
  },
  requiredLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK,
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
  cancelButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px 16px",
    height: "42px",
    background: "transparent",
    borderRadius: "10px",
    border: `1px solid ${INPUT_BORDER}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  cancelButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK,
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
    minHeight: "40px",
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
    color: LABEL_GREY,
    margin: 0,
  },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const locations = await listLocations(session.shop);
  return { locations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "create" | "update" | "delete" | "reorder" | "";

  if (intent === "reorder") {
    let orderedIds: string[] = [];
    try {
      orderedIds = JSON.parse(String(formData.get("orderedIds") ?? "[]"));
    } catch {
      orderedIds = [];
    }
    await reorderLocations(session.shop, orderedIds);
    return { intent, ok: true as const };
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    const result = await deleteLocation(session.shop, id);
    return { intent, ...result };
  }

  const { values, errors } = parseLocationForm(formData);
  if (Object.keys(errors).length > 0) {
    return { intent, ok: false as const, errors, values };
  }

  if (intent === "update") {
    const id = String(formData.get("id") ?? "");
    const result = await updateLocation(session.shop, id, values);
    return { intent, ...result, values };
  }

  const result = await createLocation(session.shop, values);
  if (!result.ok) {
    return {
      intent: "create" as const,
      ok: false as const,
      errors: { name: result.error },
      values,
    };
  }
  return { intent: "create" as const, ok: true as const, values: EMPTY_FORM };
};

function Checkbox({
  checked,
  onChange,
  label,
  labelStyle,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  labelStyle?: React.CSSProperties;
}) {
  return (
    <div style={styles.dayItem}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        style={styles.checkbox}
        onClick={onChange}
      >
        {checked && <span style={styles.checkboxDot} />}
      </button>
      <p style={labelStyle ?? styles.dayLabel} onClick={onChange}>
        {label}
      </p>
    </div>
  );
}

function CountrySelect({
  value,
  extraOption,
  onChange,
}: {
  value: string;
  extraOption: { code: string; name: string } | null;
  onChange: (code: string) => void;
}) {
  return (
    <div style={styles.inputBox}>
      <select
        style={styles.selectInput}
        value={value}
        onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
      >
        <option value="">Select a country</option>
        {extraOption && (
          <option value={extraOption.code}>{extraOption.name}</option>
        )}
        {SORTED_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RegionSelect({
  country,
  value,
  onChange,
}: {
  country: Country;
  value: string;
  onChange: (tz: string) => void;
}) {
  return (
    <div style={styles.inputBox}>
      <select
        style={styles.selectInput}
        value={value}
        onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
      >
        {country.timezones.map((zone) => (
          <option key={zone.tz} value={zone.tz}>
            {zone.label} ({timezoneOffsetLabel(zone.tz)})
          </option>
        ))}
      </select>
    </div>
  );
}

function LocationEditor({
  initial,
  onCancel,
  submitLabel,
  locationId,
  open,
  onToggleOpen,
  title,
  description,
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
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [values, setValues] = useState<LocationFormValues>(initial);

  const matchedCountry = findCountryByTimezone(initial.timezone);
  const [countryCode, setCountryCode] = useState<string>(
    matchedCountry?.code ?? (initial.timezone ? "__custom__" : ""),
  );
  const customOption =
    !matchedCountry && initial.timezone
      ? { code: "__custom__", name: `Custom (${initial.timezone})` }
      : null;
  const selectedCountry =
    SORTED_COUNTRIES.find((c) => c.code === countryCode) ?? null;

  const isEdit = Boolean(locationId);
  const errors: LocationFieldErrors =
    fetcher.data && "errors" in fetcher.data ? fetcher.data.errors ?? {} : {};

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show(isEdit ? "Location updated" : "Location added");
      if (!isEdit) {
        setValues(EMPTY_FORM);
        setCountryCode("");
      }
      onCancel?.();
    }
  }, [fetcher.data]);

  const isSaving = fetcher.state !== "idle";

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    if (code === "__custom__") return;
    const country = SORTED_COUNTRIES.find((c) => c.code === code);
    if (country) {
      setValues((prev) => ({ ...prev, timezone: country.timezones[0].tz }));
    }
  };

  const toggleWorkingDay = (day: number) => {
    setValues((prev) => {
      const current = prev.workingDays ?? [];
      const has = current.includes(day);
      const workingDays = has
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b);
      return { ...prev, workingDays };
    });
  };

  const allWeekdaysSelected = WEEKDAY_LABELS.every((day) =>
    (values.workingDays ?? []).includes(day.value),
  );

  const toggleSelectAllWorkingDays = () => {
    setValues((prev) => ({
      ...prev,
      workingDays: allWeekdaysSelected
        ? []
        : WEEKDAY_LABELS.map((day) => day.value),
    }));
  };

  const handleSubmit = () => {
    fetcher.submit(
      {
        intent: isEdit ? "update" : "create",
        ...(locationId ? { id: locationId } : {}),
        name: values.name,
        timezone: values.timezone,
        isEnabled: String(values.isEnabled),
        workingDays: values.workingDays ? values.workingDays.join(",") : "",
        dailyStartTime: values.dailyStartTime ?? "",
        dailyEndTime: values.dailyEndTime ?? "",
      },
      { method: "POST" },
    );
  };

  const showChrome = title !== undefined;

  return (
    <div style={{ ...styles.card, height: "auto" }}>
      <div style={styles.body}>
        {showChrome && (
          <div style={styles.headerRow}>
            <div style={styles.headerLeft}>
              <p style={styles.title}>{title}</p>
              {description && <p style={styles.descText}>{description}</p>}
            </div>
            {onToggleOpen && (
              <button
                type="button"
                style={styles.chevronButton}
                onClick={onToggleOpen}
                aria-label={open ? "Collapse" : "Expand"}
              >
                <ChevronIcon open={Boolean(open)} />
              </button>
            )}
          </div>
        )}

        {(open ?? true) && (
          <>
            {showChrome && <hr style={styles.divider} />}

            <div style={styles.fieldsRow}>
              <div style={styles.fieldGroupThirty}>
                <p style={styles.fieldLabel}>Location name</p>
                <div style={styles.inputBox}>
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="California"
                    value={values.name}
                    onChange={(e: FieldChangeEvent) => {
                      const value = e.currentTarget.value;
                      setValues((prev) => ({ ...prev, name: value }));
                    }}
                  />
                </div>
                {errors.name && (
                  <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                    {errors.name}
                  </p>
                )}
              </div>

              <div style={styles.fieldGroupSeventy}>
                <p style={styles.fieldLabel}>Country</p>
                <CountrySelect
                  value={countryCode}
                  extraOption={customOption}
                  onChange={handleCountryChange}
                />
              </div>
            </div>

            {selectedCountry && selectedCountry.timezones.length > 1 && (
              <div style={styles.fieldGroupFull}>
                <p style={styles.fieldLabel}>Region</p>
                <RegionSelect
                  country={selectedCountry}
                  value={values.timezone}
                  onChange={(tz) =>
                    setValues((prev) => ({ ...prev, timezone: tz }))
                  }
                />
                <p style={styles.hintText}>
                  Booking hours and the times shoppers see for this
                  location are calculated in this time zone.
                </p>
              </div>
            )}

            {errors.timezone && (
              <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                {errors.timezone}
              </p>
            )}

            <hr style={styles.divider} />

            <div style={styles.daysGroup}>
              <div style={styles.daysRow}>
                <Checkbox
                  checked={allWeekdaysSelected}
                  onChange={toggleSelectAllWorkingDays}
                  label="Select All"
                />
              </div>
              <div style={styles.daysRow}>
                {WEEKDAY_LABELS.map((day) => (
                  <Checkbox
                    key={day.value}
                    checked={(values.workingDays ?? []).includes(day.value)}
                    onChange={() => toggleWorkingDay(day.value)}
                    label={day.label}
                  />
                ))}
              </div>
              <p style={styles.descText}>
                Leave the fields below blank/unchecked to use the shop (or
                product-level) default. Set them here only if this
                location's own opening hours are different — e.g. one
                branch closes earlier than the rest.
              </p>
            </div>

            <div style={styles.fieldsRow}>
              <div style={styles.fieldGroupHalf}>
                <p style={styles.fieldLabel}>Start time</p>
                <div style={styles.inputBox}>
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Shop default"
                    value={values.dailyStartTime ?? ""}
                    onChange={(e: FieldChangeEvent) =>
                      setValues((prev) => ({
                        ...prev,
                        dailyStartTime: e.currentTarget.value || null,
                      }))
                    }
                  />
                </div>
                <p style={styles.hintText}>24-hour format, hh:mm</p>
                {errors.dailyStartTime && (
                  <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                    {errors.dailyStartTime}
                  </p>
                )}
              </div>
              <div style={styles.fieldGroupHalf}>
                <p style={styles.fieldLabel}>End time</p>
                <div style={styles.inputBox}>
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Shop default"
                    value={values.dailyEndTime ?? ""}
                    onChange={(e: FieldChangeEvent) =>
                      setValues((prev) => ({
                        ...prev,
                        dailyEndTime: e.currentTarget.value || null,
                      }))
                    }
                  />
                </div>
                <p style={styles.hintText}>24-hour format, hh:mm</p>
                {errors.dailyEndTime && (
                  <p style={{ ...styles.hintText, color: "#D82C0D" }}>
                    {errors.dailyEndTime}
                  </p>
                )}
              </div>
            </div>

            <Checkbox
              checked={values.isEnabled}
              onChange={() =>
                setValues((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))
              }
              label="Visible to shoppers"
              labelStyle={styles.requiredLabel}
            />

            {showChrome && <hr style={styles.divider} />}
          </>
        )}
      </div>

      <div style={styles.buttonRow}>
        {onCancel && (
          <button
            type="button"
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            <span style={styles.cancelButtonLabel}>Cancel</span>
          </button>
        )}
        <button
          type="button"
          style={{
            ...styles.addButton,
            ...(isSaving ? styles.addButtonDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={isSaving}
        >
          <span style={styles.addButtonLabel}>{submitLabel}</span>
          {!isEdit && (
            <span style={styles.plusWrap}>
              <PlusIcon />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function LocationRow({
  location,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isReordering,
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
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [isEditing, setIsEditing] = useState(false);
  const isDeleting = deleteFetcher.state !== "idle";
  const isBusy = isDeleting || isReordering;

  useEffect(() => {
    if (deleteFetcher.data?.intent !== "delete") return;
    if (deleteFetcher.data.ok) {
      shopify.toast.show("Location removed");
    } else {
      shopify.toast.show(deleteFetcher.data.error || "Couldn't delete location.", {
        isError: true,
      });
    }
  }, [deleteFetcher.data, shopify]);

  const handleDelete = () => {
    deleteFetcher.submit(
      { intent: "delete", id: location.id },
      { method: "POST" },
    );
  };

  if (isEditing) {
    return (
      <div>
        <LocationEditor
          locationId={location.id}
          submitLabel="Save"
          onCancel={() => setIsEditing(false)}
          initial={{
            name: location.name,
            timezone: location.timezone,
            isEnabled: location.isEnabled,
            workingDays: location.workingDays
              ? parseWorkingDays(location.workingDays)
              : null,
            dailyStartTime: location.dailyStartTime,
            dailyEndTime: location.dailyEndTime,
          }}
        />
        <hr style={styles.divider} />
      </div>
    );
  }

  const offset = timezoneOffsetLabel(location.timezone);

  return (
    <div>
      <div style={styles.rowWrap}>
        <p style={styles.rowCell}>{location.name}</p>
        <p style={styles.rowCell}>
          {location.timezone}
          {offset ? ` (${offset})` : ""}
        </p>
        <p style={styles.rowCell}>
          {location.workingDays || location.dailyStartTime || location.dailyEndTime
            ? "Custom"
            : "Shop default"}
        </p>
        <p style={styles.rowCell}>{location.isEnabled ? "Visible" : "Hidden"}</p>
        <div style={styles.actionsCell}>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isFirst || isBusy ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveUp}
            disabled={isFirst || isBusy}
            aria-label={`Move ${location.name} up`}
          >
            <img src="/arrow-up.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isLast || isBusy ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveDown}
            disabled={isLast || isBusy}
            aria-label={`Move ${location.name} down`}
          >
            <img src="/arrow-down.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={styles.iconButton}
            onClick={() => setIsEditing(true)}
            disabled={isBusy}
            aria-label={`Edit ${location.name}`}
          >
            <img src="/edit-icon.svg" width={44} height={40} alt="" />
          </button>
          <button
            type="button"
            style={styles.deleteButton}
            onClick={handleDelete}
            disabled={isReordering}
            aria-label={`Delete ${location.name}`}
          >
            <img
              src="/delete-icon.svg"
              width={44}
              height={40}
              alt="Delete"
              style={{
                display: "block",
                ...(isDeleting ? { opacity: 0.5 } : {}),
              }}
            />
          </button>
        </div>
      </div>
      <hr style={styles.divider} />
    </div>
  );
}

export default function LocationsPage() {
  const { locations: loaderLocations } = useLoaderData<typeof loader>();
  const reorderFetcher = useFetcher<typeof action>();
  const [locations, setLocations] = useState(loaderLocations);
  const [open, setOpen] = useState(true);
  const isReordering = reorderFetcher.state !== "idle";

  useEffect(() => {
    setLocations(loaderLocations);
  }, [loaderLocations]);

  const persistOrder = (ordered: typeof locations) => {
    reorderFetcher.submit(
      {
        intent: "reorder",
        orderedIds: JSON.stringify(ordered.map((l) => l.id)),
      },
      { method: "POST" },
    );
  };

  const moveLocation = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= locations.length) return;

    const reordered = [...locations];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setLocations(reordered);
    persistOrder(reordered);
  };

  return (
    <div style={{ fontFamily: "Inter" }}>
      <LocationEditor
        initial={EMPTY_FORM}
        submitLabel="Add Location"
        open={open}
        onToggleOpen={() => setOpen(!open)}
        title="Add a Locations"
        description="Locations customers choose from before picking a date and time on the storefront booking widget — e.g. &quot;California&quot; or &quot;New York&quot;. Each location has its own timezone, so the calendar and time slots shoppers see are always local to the location they pick. If no locations are added, the location step is skipped and booking works exactly as before."
      />

      <div style={styles.listCard}>
        <div style={styles.listHeaderRow}>
          <div style={styles.listHeaderLeft}>
            <p style={styles.listTitle}>Current locations</p>
            <p style={styles.descText}>
              Use the arrows to change the order shoppers see these in on
              the storefront.
            </p>
          </div>
        </div>

        <hr style={styles.divider} />

        <div style={styles.columnHeaderRow}>
          <p style={styles.columnHeaderCell}>Location Name</p>
          <p style={styles.columnHeaderCell}>Timezone</p>
          <p style={styles.columnHeaderCell}>Hours</p>
          <p style={styles.columnHeaderCell}>Visibility</p>
          <p style={{ ...styles.columnHeaderCell, textAlign: "left" }}>
            Actions
          </p>
        </div>

        <hr style={styles.divider} />

        {locations.length === 0 ? (
          <p style={styles.emptyText}>No locations yet.</p>
        ) : (
          locations.map((location, index) => (
            <LocationRow
              key={location.id}
              location={location}
              isFirst={index === 0}
              isLast={index === locations.length - 1}
              onMoveUp={() => moveLocation(index, -1)}
              onMoveDown={() => moveLocation(index, 1)}
              isReordering={isReordering}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};