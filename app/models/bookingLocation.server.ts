import type { BookingLocation } from "@prisma/client";
import prisma from "../db.server";
import { isValidTimezone } from "../utils/timezones";

const MAX_NAME_LENGTH = 80;

export type LocationFormValues = {
  name: string;
  timezone: string;
  isEnabled: boolean;
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

  return { values: { name, timezone, isEnabled }, errors };
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