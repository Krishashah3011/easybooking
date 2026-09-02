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

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

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
    <s-select
      label="Country"
      value={value}
      onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
    >
      <s-option value="">Select a country</s-option>
      {extraOption && (
        <s-option value={extraOption.code}>{extraOption.name}</s-option>
      )}
      {SORTED_COUNTRIES.map((country) => (
        <s-option key={country.code} value={country.code}>
          {country.name}
        </s-option>
      ))}
    </s-select>
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
    <s-select
      label="Region"
      value={value}
      onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
    >
      {country.timezones.map((zone) => (
        <s-option key={zone.tz} value={zone.tz}>
          {zone.label} ({timezoneOffsetLabel(zone.tz)})
        </s-option>
      ))}
    </s-select>
  );
}

function LocationEditor({
  initial,
  onCancel,
  submitLabel,
  locationId,
}: {
  initial: LocationFormValues;
  onCancel?: () => void;
  submitLabel: string;
  locationId?: string;
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

  return (
    <s-stack direction="block" gap="base">
      <s-text-field
        label="Location name"
        placeholder="California"
        value={values.name}
        error={errors.name}
        onChange={(e: FieldChangeEvent) => {
          const value = e.currentTarget.value;
          setValues((prev) => ({ ...prev, name: value }));
        }}
      ></s-text-field>

      <CountrySelect
        value={countryCode}
        extraOption={customOption}
        onChange={handleCountryChange}
      />

      {selectedCountry && selectedCountry.timezones.length > 1 && (
        <RegionSelect
          country={selectedCountry}
          value={values.timezone}
          onChange={(tz) => setValues((prev) => ({ ...prev, timezone: tz }))}
        />
      )}

      {errors.timezone && <s-text tone="critical">{errors.timezone}</s-text>}
      <s-paragraph>
        Booking hours and the times shoppers see for this location are
        calculated in this timezone.
      </s-paragraph>

      <s-paragraph>
        Leave the fields below blank/unchecked to use the shop (or
        product-level) default. Set them here only if this location's own
        opening hours are different — e.g. one branch closes earlier than
        the rest.
      </s-paragraph>
      <s-stack direction="inline" gap="base">
        <s-checkbox
          label="Select all"
          checked={allWeekdaysSelected}
          onChange={toggleSelectAllWorkingDays}
        ></s-checkbox>
      </s-stack>
      <s-stack direction="inline" gap="base">
        {WEEKDAY_LABELS.map((day) => (
          <s-checkbox
            key={day.value}
            label={day.label}
            checked={(values.workingDays ?? []).includes(day.value)}
            onChange={() => toggleWorkingDay(day.value)}
          ></s-checkbox>
        ))}
      </s-stack>
      {errors.workingDays && (
        <s-banner tone="critical">{errors.workingDays}</s-banner>
      )}
      <s-stack direction="inline" gap="base">
        <s-text-field
          label="Start time"
          placeholder="Shop default"
          details="Blank = use shop/product default"
          value={values.dailyStartTime ?? ""}
          error={errors.dailyStartTime}
          onChange={(e: FieldChangeEvent) =>
            setValues((prev) => ({
              ...prev,
              dailyStartTime: e.currentTarget.value || null,
            }))
          }
        ></s-text-field>
        <s-text-field
          label="End time"
          placeholder="Shop default"
          details="Blank = use shop/product default"
          value={values.dailyEndTime ?? ""}
          error={errors.dailyEndTime}
          onChange={(e: FieldChangeEvent) =>
            setValues((prev) => ({
              ...prev,
              dailyEndTime: e.currentTarget.value || null,
            }))
          }
        ></s-text-field>
      </s-stack>

      <s-checkbox
        label="Visible to shoppers"
        checked={values.isEnabled}
        onChange={() =>
          setValues((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))
        }
      ></s-checkbox>

      <s-stack direction="inline" gap="small">
        <s-button
          variant="primary"
          onClick={handleSubmit}
          {...(isSaving ? { loading: true } : {})}
        >
          {submitLabel}
        </s-button>
        {onCancel && (
          <s-button
            variant="tertiary"
            onClick={onCancel}
            {...(isSaving ? { disabled: true } : {})}
          >
            Cancel
          </s-button>
        )}
      </s-stack>
    </s-stack>
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
      <s-table-row>
        <s-table-cell colSpan={5}>
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
        </s-table-cell>
      </s-table-row>
    );
  }

  const offset = timezoneOffsetLabel(location.timezone);

  return (
    <s-table-row>
      <s-table-cell>{location.name}</s-table-cell>
      <s-table-cell>
        {location.timezone}
        {offset ? ` (${offset})` : ""}
      </s-table-cell>
      <s-table-cell>
        {location.workingDays || location.dailyStartTime || location.dailyEndTime
          ? "Custom"
          : "Shop default"}
      </s-table-cell>
      <s-table-cell>{location.isEnabled ? "Visible" : "Hidden"}</s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small">
          <s-button
            variant="tertiary"
            {...(isFirst || isBusy ? { disabled: true } : {})}
            onClick={onMoveUp}
            accessibilityLabel={`Move ${location.name} up`}
          >
            ↑
          </s-button>
          <s-button
            variant="tertiary"
            {...(isLast || isBusy ? { disabled: true } : {})}
            onClick={onMoveDown}
            accessibilityLabel={`Move ${location.name} down`}
          >
            ↓
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => setIsEditing(true)}
            {...(isBusy ? { disabled: true } : {})}
          >
            Edit
          </s-button>
          <s-button
            variant="tertiary"
            tone="critical"
            onClick={handleDelete}
            {...(isReordering ? { disabled: true } : {})}
            {...(isDeleting ? { loading: true } : {})}
          >
            Delete
          </s-button>
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export default function LocationsPage() {
  const { locations: loaderLocations } = useLoaderData<typeof loader>();
  const reorderFetcher = useFetcher<typeof action>();
  const [locations, setLocations] = useState(loaderLocations);
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
    <s-page heading="Locations" style={{ width: "950px", maxWidth: "950px", boxSizing: "border-box", marginInline: "auto" }}>
      <s-section heading="Add a location">
        <s-paragraph>
          Locations customers choose from before picking a date and time on
          the storefront booking widget — e.g. "California" or "New York".
          Each location has its own timezone, so the calendar and time
          slots shoppers see are always local to the location they pick.
          If no locations are added, the location step is skipped and
          booking works exactly as before.
        </s-paragraph>
        <LocationEditor initial={EMPTY_FORM} submitLabel="Add location" />
      </s-section>

      <s-section heading="Current locations">
        {locations.length === 0 ? (
          <s-paragraph>No locations yet.</s-paragraph>
        ) : (
          <>
            <s-paragraph>
              Use the arrows to change the order shoppers see these in on
              the storefront.
            </s-paragraph>
            <s-table>
              <s-table-header-row>
                <s-table-header>Name</s-table-header>
                <s-table-header>Timezone</s-table-header>
                <s-table-header>Hours</s-table-header>
                <s-table-header>Visibility</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {locations.map((location, index) => (
                  <LocationRow
                    key={location.id}
                    location={location}
                    isFirst={index === 0}
                    isLast={index === locations.length - 1}
                    onMoveUp={() => moveLocation(index, -1)}
                    onMoveDown={() => moveLocation(index, 1)}
                    isReordering={isReordering}
                  />
                ))}
              </s-table-body>
            </s-table>
          </>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};