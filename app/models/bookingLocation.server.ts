import type { BookingLocation } from "@prisma/client";
import prismaML from "../db.server";
import { isValidTimezoneML } from "../utils/timezones";
import { getBookingSettingsML } from "./bookingSettings.server";

const MAX_NAME_LENGTH_ML = 80;
const TIME_RE_ML = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type LocationFormValues = {
  name: string;
  timezone: string;
  isEnabled: boolean;
  workingDays: number[] | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
};

export type LocationFieldErrors = Partial<Record<keyof LocationFormValues, string>>;

export async function listLocationsML(shopML: string): Promise<BookingLocation[]> {
  return prismaML.bookingLocation.findMany({
    where: { shop: shopML },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listEnabledLocationsML(
  shopML: string,
): Promise<BookingLocation[]> {
  return prismaML.bookingLocation.findMany({
    where: { shop: shopML, isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getLocationByIdML(
  shopML: string,
  idML: string,
): Promise<BookingLocation | null> {
  return prismaML.bookingLocation.findFirst({ where: { id: idML, shop: shopML } });
}

function emptyToNullML(valueML: FormDataEntryValue | null): string | null {
  const strML = String(valueML ?? "").trim();
  return strML === "" ? null : strML;
}

export function parseLocationFormML(formDataML: FormData): {
  values: LocationFormValues;
  errors: LocationFieldErrors;
} {
  const errorsML: LocationFieldErrors = {};
  const nameML = String(formDataML.get("name") ?? "").trim();
  const timezoneML = String(formDataML.get("timezone") ?? "UTC").trim() || "UTC";

  if (!nameML) {
    errorsML.name = "Enter a location name.";
  } else if (nameML.length > MAX_NAME_LENGTH_ML) {
    errorsML.name = `Keep it under ${MAX_NAME_LENGTH_ML} characters.`;
  }

  if (!isValidTimezoneML(timezoneML)) {
    errorsML.timezone = "Pick a valid timezone.";
  }

  const isEnabledML = formDataML.get("isEnabled") !== "false";

  const workingDaysRawML = String(formDataML.get("workingDays") ?? "");
  const workingDaysML =
    workingDaysRawML === ""
      ? null
      : workingDaysRawML
          .split(",")
          .map((vML) => Number(vML.trim()))
          .filter((nML) => Number.isInteger(nML) && nML >= 0 && nML <= 6);
  if (workingDaysML !== null && workingDaysML.length === 0) {
    errorsML.workingDays =
      "Select at least one day, or clear all to inherit the shop default.";
  }

  const dailyStartTimeML = emptyToNullML(formDataML.get("dailyStartTime"));
  const dailyEndTimeML = emptyToNullML(formDataML.get("dailyEndTime"));
  if (dailyStartTimeML && !TIME_RE_ML.test(dailyStartTimeML)) {
    errorsML.dailyStartTime = "Enter a valid start time (HH:mm).";
  }
  if (dailyEndTimeML && !TIME_RE_ML.test(dailyEndTimeML)) {
    errorsML.dailyEndTime = "Enter a valid end time (HH:mm).";
  }
  if (
    dailyStartTimeML &&
    dailyEndTimeML &&
    !errorsML.dailyStartTime &&
    !errorsML.dailyEndTime &&
    dailyEndTimeML <= dailyStartTimeML
  ) {
    errorsML.dailyEndTime = "End time must be after start time.";
  }

  return {
    values: {
      name: nameML,
      timezone: timezoneML,
      isEnabled: isEnabledML,
      workingDays: workingDaysML,
      dailyStartTime: dailyStartTimeML,
      dailyEndTime: dailyEndTimeML,
    },
    errors: errorsML,
  };
}

export async function createLocationML(
  shopML: string,
  valuesML: LocationFormValues,
): Promise<{ ok: true; location: BookingLocation } | { ok: false; error: string }> {
  const existingML = await prismaML.bookingLocation.findUnique({
    where: { shop_name: { shop: shopML, name: valuesML.name } },
  });
  if (existingML) {
    return { ok: false, error: "A location with this name already exists." };
  }

  const lastLocationML = await prismaML.bookingLocation.findFirst({
    where: { shop: shopML },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrderML = (lastLocationML?.sortOrder ?? -1) + 1;

  const locationML = await prismaML.bookingLocation.create({
    data: {
      shop: shopML,
      name: valuesML.name,
      timezone: valuesML.timezone,
      isEnabled: valuesML.isEnabled,
      sortOrder: sortOrderML,
      workingDays: valuesML.workingDays ? valuesML.workingDays.join(",") : null,
      dailyStartTime: valuesML.dailyStartTime,
      dailyEndTime: valuesML.dailyEndTime,
    },
  });
  return { ok: true, location: locationML };
}

export async function updateLocationML(
  shopML: string,
  idML: string,
  valuesML: LocationFormValues,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existingML = await prismaML.bookingLocation.findFirst({
    where: { id: idML, shop: shopML },
  });
  if (!existingML) {
    return { ok: false, error: "Location not found." };
  }

  const nameTakenML = await prismaML.bookingLocation.findFirst({
    where: { shop: shopML, name: valuesML.name, id: { not: idML } },
  });
  if (nameTakenML) {
    return { ok: false, error: "A location with this name already exists." };
  }

  await prismaML.bookingLocation.update({
    where: { id: idML },
    data: {
      name: valuesML.name,
      timezone: valuesML.timezone,
      isEnabled: valuesML.isEnabled,
      workingDays: valuesML.workingDays ? valuesML.workingDays.join(",") : null,
      dailyStartTime: valuesML.dailyStartTime,
      dailyEndTime: valuesML.dailyEndTime,
    },
  });
  return { ok: true };
}

export async function deleteLocationML(
  shopML: string,
  idML: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existingML = await prismaML.bookingLocation.findFirst({
    where: { id: idML, shop: shopML },
  });
  if (!existingML) {
    return { ok: false, error: "Location not found." };
  }
  try {
    await prismaML.bookingLocation.delete({ where: { id: idML } });
  } catch (errML) {
    console.error(`deleteLocation failed for shop=${shopML} id=${idML}:`, errML);
    return {
      ok: false,
      error: "Couldn't delete this location. Please try again.",
    };
  }
  return { ok: true };
}

export async function reorderLocationsML(
  shopML: string,
  orderedIdsML: string[],
): Promise<void> {
  await prismaML.$transaction(
    orderedIdsML.map((idML, indexML) =>
      prismaML.bookingLocation.update({
        where: { id: idML },
        data: { sortOrder: indexML },
      }),
    ),
  );
}

export type PublicLocation = {
  id: string;
  name: string;
  timezone: string;
};

export function toPublicLocationML(locationML: BookingLocation): PublicLocation {
  return { id: locationML.id, name: locationML.name, timezone: locationML.timezone };
}

type MinimalAdminGraphqlClient = {
  graphql: (query: string) => Promise<Response>;
};

export async function maybePrefillFirstLocationFromShopTimezoneML(
  shopML: string,
  adminML: MinimalAdminGraphqlClient,
): Promise<void> {
  const settingsML = await getBookingSettingsML(shopML);
  if (settingsML.locationPrefillDone) return;

  const existingCountML = await prismaML.bookingLocation.count({ where: { shop: shopML } });
  if (existingCountML > 0) {
    await prismaML.bookingSettings.update({
      where: { shop: shopML },
      data: { locationPrefillDone: true },
    });
    return;
  }

  try {
    const responseML = await adminML.graphql(
      `#graphql
        query ShopTimezoneForLocationPrefill {
          shop {
            ianaTimezone
          }
        }`,
    );
    const responseJsonML = await responseML.json();
    const timezoneML = responseJsonML?.data?.shop?.ianaTimezone;
    if (timezoneML && isValidTimezoneML(timezoneML)) {
      await createLocationML(shopML, {
        name: "Main location",
        timezone: timezoneML,
        isEnabled: true,
        workingDays: null,
        dailyStartTime: null,
        dailyEndTime: null,
      });
    }
  } catch (errorML) {
    console.warn(
      `Could not prefill a first Location for ${shopML} from the shop's Shopify timezone`,
      errorML,
    );
  } finally {
    await prismaML.bookingSettings.update({
      where: { shop: shopML },
      data: { locationPrefillDone: true },
    });
  }
}