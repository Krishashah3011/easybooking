import { useEffect, useMemo, useState } from "react";
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
  updateLocation,
  type LocationFieldErrors,
  type LocationFormValues,
} from "../models/bookingLocation.server";
import { listTimezones, timezoneOffsetLabel } from "../utils/timezones";

type FieldChangeEvent = { currentTarget: { value: string } };

const EMPTY_FORM: LocationFormValues = {
  name: "",
  timezone: "UTC",
  isEnabled: true,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const locations = await listLocations(session.shop);
  const timezones = listTimezones();
  return { locations, timezones };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "create" | "update" | "delete" | "";

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

function TimezoneSelect({
  value,
  timezones,
  onChange,
}: {
  value: string;
  timezones: string[];
  onChange: (value: string) => void;
}) {
  const options = useMemo(
    () =>
      timezones.map((tz) => {
        const offset = timezoneOffsetLabel(tz);
        return { tz, label: offset ? `${tz} (${offset})` : tz };
      }),
    [timezones],
  );

  return (
    <s-select
      label="Timezone"
      value={value}
      onChange={(e: FieldChangeEvent) => onChange(e.currentTarget.value)}
    >
      {options.map((opt) => (
        <s-option key={opt.tz} value={opt.tz}>
          {opt.label}
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
  timezones,
}: {
  initial: LocationFormValues;
  onCancel?: () => void;
  submitLabel: string;
  locationId?: string;
  timezones: string[];
}) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [values, setValues] = useState<LocationFormValues>(initial);

  const isEdit = Boolean(locationId);
  const errors: LocationFieldErrors =
    fetcher.data && "errors" in fetcher.data ? fetcher.data.errors ?? {} : {};

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show(isEdit ? "Location updated" : "Location added");
      if (!isEdit) {
        setValues(EMPTY_FORM);
      }
      onCancel?.();
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    fetcher.submit(
      {
        intent: isEdit ? "update" : "create",
        ...(locationId ? { id: locationId } : {}),
        name: values.name,
        timezone: values.timezone,
        isEnabled: String(values.isEnabled),
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

      <TimezoneSelect
        value={values.timezone}
        timezones={timezones}
        onChange={(value) => setValues((prev) => ({ ...prev, timezone: value }))}
      />
      {errors.timezone && <s-text tone="critical">{errors.timezone}</s-text>}
      <s-paragraph>
        Booking hours and the times shoppers see for this location are
        calculated in this timezone.
      </s-paragraph>

      <s-checkbox
        label="Visible to shoppers"
        checked={values.isEnabled}
        onChange={() =>
          setValues((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))
        }
      ></s-checkbox>

      <s-stack direction="inline" gap="small">
        <s-button variant="primary" onClick={handleSubmit}>
          {submitLabel}
        </s-button>
        {onCancel && (
          <s-button variant="tertiary" onClick={onCancel}>
            Cancel
          </s-button>
        )}
      </s-stack>
    </s-stack>
  );
}

function LocationRow({
  location,
  timezones,
}: {
  location: {
    id: string;
    name: string;
    timezone: string;
    isEnabled: boolean;
  };
  timezones: string[];
}) {
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (deleteFetcher.data?.intent === "delete" && deleteFetcher.data.ok) {
      shopify.toast.show("Location removed");
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
        <s-table-cell colSpan={4}>
          <LocationEditor
            locationId={location.id}
            submitLabel="Save"
            onCancel={() => setIsEditing(false)}
            timezones={timezones}
            initial={{
              name: location.name,
              timezone: location.timezone,
              isEnabled: location.isEnabled,
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
      <s-table-cell>{location.isEnabled ? "Visible" : "Hidden"}</s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small">
          <s-button variant="tertiary" onClick={() => setIsEditing(true)}>
            Edit
          </s-button>
          <s-button variant="tertiary" tone="critical" onClick={handleDelete}>
            Delete
          </s-button>
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export default function LocationsPage() {
  const { locations, timezones } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Locations">
      <s-section heading="Add a location">
        <s-paragraph>
          Locations customers choose from before picking a date and time on
          the storefront booking widget — e.g. "California" or "New York".
          Each location has its own timezone, so the calendar and time
          slots shoppers see are always local to the location they pick.
          If no locations are added, the location step is skipped and
          booking works exactly as before.
        </s-paragraph>
        <LocationEditor
          initial={EMPTY_FORM}
          submitLabel="Add location"
          timezones={timezones}
        />
      </s-section>

      <s-section heading="Current locations">
        {locations.length === 0 ? (
          <s-paragraph>No locations yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Name</s-table-header>
              <s-table-header>Timezone</s-table-header>
              <s-table-header>Visibility</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {locations.map((location) => (
                <LocationRow
                  key={location.id}
                  location={location}
                  timezones={timezones}
                />
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