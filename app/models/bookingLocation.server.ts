import type { BookingLocation } from "@prisma/client";
import prisma from "../db.server";
import { isValidTimezone } from "../utils/timezones";
import { getBookingSettings } from "./bookingSettings.server";

const MAX_NAME_LENGTH = 80;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type LocationFormValues = {
  name: string;
  timezone: string;
  isEnabled: boolean;
  workingDays: number[] | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
};

export type LocationFieldErrors = Partial<Record<keyof LocationFormValues, string>>;

export async function listLocations(shop: string): Promise<BookingLocation[]> {
  return prisma.bookingLocation.findMany({
    where: { shop },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listEnabledLocations(
  shop: string,
): Promise<BookingLocation[]> {
  return prisma.bookingLocation.findMany({
    where: { shop, isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getLocationById(
  shop: string,
  id: string,
): Promise<BookingLocation | null> {
  return prisma.bookingLocation.findFirst({ where: { id, shop } });
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str === "" ? null : str;
}

export function parseLocationForm(formData: FormData): {
  values: LocationFormValues;
  errors: LocationFieldErrors;
} {
  const errors: LocationFieldErrors = {};
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";

  if (!name) {
    errors.name = "Enter a location name.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Keep it under ${MAX_NAME_LENGTH} characters.`;
  }

  if (!isValidTimezone(timezone)) {
    errors.timezone = "Pick a valid timezone.";
  }

  const isEnabled = formData.get("isEnabled") !== "false";

  const workingDaysRaw = String(formData.get("workingDays") ?? "");
  const workingDays =
    workingDaysRaw === ""
      ? null
      : workingDaysRaw
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (workingDays !== null && workingDays.length === 0) {
    errors.workingDays =
      "Select at least one day, or clear all to inherit the shop default.";
  }

  const dailyStartTime = emptyToNull(formData.get("dailyStartTime"));
  const dailyEndTime = emptyToNull(formData.get("dailyEndTime"));
  if (dailyStartTime && !TIME_RE.test(dailyStartTime)) {
    errors.dailyStartTime = "Enter a valid start time (HH:mm).";
  }
  if (dailyEndTime && !TIME_RE.test(dailyEndTime)) {
    errors.dailyEndTime = "Enter a valid end time (HH:mm).";
  }
  if (
    dailyStartTime &&
    dailyEndTime &&
    !errors.dailyStartTime &&
    !errors.dailyEndTime &&
    dailyEndTime <= dailyStartTime
  ) {
    errors.dailyEndTime = "End time must be after start time.";
  }

  return {
    values: {
      name,
      timezone,
      isEnabled,
      workingDays,
      dailyStartTime,
      dailyEndTime,
    },
    errors,
  };
}

export async function createLocation(
  shop: string,
  values: LocationFormValues,
): Promise<{ ok: true; location: BookingLocation } | { ok: false; error: string }> {
  const existing = await prisma.bookingLocation.findUnique({
    where: { shop_name: { shop, name: values.name } },
  });
  if (existing) {
    return { ok: false, error: "A location with this name already exists." };
  }

  const lastLocation = await prisma.bookingLocation.findFirst({
    where: { shop },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastLocation?.sortOrder ?? -1) + 1;

  const location = await prisma.bookingLocation.create({
    data: {
      shop,
      name: values.name,
      timezone: values.timezone,
      isEnabled: values.isEnabled,
      sortOrder,
      workingDays: values.workingDays ? values.workingDays.join(",") : null,
      dailyStartTime: values.dailyStartTime,
      dailyEndTime: values.dailyEndTime,
    },
  });
  return { ok: true, location };
}

export async function updateLocation(
  shop: string,
  id: string,
  values: LocationFormValues,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.bookingLocation.findFirst({
    where: { id, shop },
  });
  if (!existing) {
    return { ok: false, error: "Location not found." };
  }

  const nameTaken = await prisma.bookingLocation.findFirst({
    where: { shop, name: values.name, id: { not: id } },
  });
  if (nameTaken) {
    return { ok: false, error: "A location with this name already exists." };
  }

  await prisma.bookingLocation.update({
    where: { id },
    data: {
      name: values.name,
      timezone: values.timezone,
      isEnabled: values.isEnabled,
      workingDays: values.workingDays ? values.workingDays.join(",") : null,
      dailyStartTime: values.dailyStartTime,
      dailyEndTime: values.dailyEndTime,
    },
  });
  return { ok: true };
}

export async function deleteLocation(
  shop: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.bookingLocation.findFirst({
    where: { id, shop },
  });
  if (!existing) {
    return { ok: false, error: "Location not found." };
  }
  await prisma.bookingLocation.delete({ where: { id } });
  return { ok: true };
}

export async function reorderLocations(
  shop: string,
  orderedIds: string[],
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.bookingLocation.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}

export type PublicLocation = {
  id: string;
  name: string;
  timezone: string;
};

export function toPublicLocation(location: BookingLocation): PublicLocation {
  return { id: location.id, name: location.name, timezone: location.timezone };
}

type MinimalAdminGraphqlClient = {
  graphql: (query: string) => Promise<Response>;
};

export async function maybePrefillFirstLocationFromShopTimezone(
  shop: string,
  admin: MinimalAdminGraphqlClient,
): Promise<void> {
  const settings = await getBookingSettings(shop);
  if (settings.locationPrefillDone) return;

  const existingCount = await prisma.bookingLocation.count({ where: { shop } });
  if (existingCount > 0) {
    await prisma.bookingSettings.update({
      where: { shop },
      data: { locationPrefillDone: true },
    });
    return;
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query ShopTimezoneForLocationPrefill {
          shop {
            ianaTimezone
          }
        }`,
    );
    const responseJson = await response.json();
    const timezone = responseJson?.data?.shop?.ianaTimezone;
    if (timezone && isValidTimezone(timezone)) {
      await createLocation(shop, {
        name: "Main location",
        timezone,
        isEnabled: true,
        workingDays: null,
        dailyStartTime: null,
        dailyEndTime: null,
      });
    }
  } catch (error) {
    console.warn(
      `Could not prefill a first Location for ${shop} from the shop's Shopify timezone`,
      error,
    );
  } finally {
    await prisma.bookingSettings.update({
      where: { shop },
      data: { locationPrefillDone: true },
    });
  }
}