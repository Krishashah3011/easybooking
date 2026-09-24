import type { BlackoutDate } from "@prisma/client";
import prismaML from "../db.server";

export type BlackoutDateFieldErrors = {
  date?: string;
};

const EXCLUSION_REASON_ML = "__excluded__";

export async function listShopBlackoutDatesML(
  shopML: string,
): Promise<BlackoutDate[]> {
  return prismaML.blackoutDate.findMany({
    where: { shop: shopML, bookableProductId: null },
    orderBy: { date: "asc" },
  });
}

export async function listProductBlackoutDatesML(
  shopML: string,
  bookableProductIdML: string,
): Promise<BlackoutDate[]> {
  return prismaML.blackoutDate.findMany({
    where: { shop: shopML, bookableProductId: bookableProductIdML, NOT: { reason: EXCLUSION_REASON_ML } },
    orderBy: { date: "asc" },
  });
}

export async function listProductBlackoutExclusionsML(
  shopML: string,
  bookableProductIdML: string,
): Promise<Set<string>> {
  const rowsML = await prismaML.blackoutDate.findMany({
    where: { shop: shopML, bookableProductId: bookableProductIdML, reason: EXCLUSION_REASON_ML },
    select: { date: true },
  });
  return new Set(rowsML.map((rML) => rML.date.toISOString().slice(0, 10)));
}

export async function excludeShopBlackoutDateForProductML(
  shopML: string,
  bookableProductIdML: string,
  dateML: string,
): Promise<void> {
  const alreadyML = await prismaML.blackoutDate.findFirst({
    where: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      date: new Date(dateML),
      reason: EXCLUSION_REASON_ML,
    },
    select: { id: true },
  });
  if (alreadyML) return;
  await prismaML.blackoutDate.create({
    data: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      date: new Date(dateML),
      reason: EXCLUSION_REASON_ML,
    },
  });
}

export function parseBlackoutDateFormML(formDataML: FormData): {
  date: string | null;
  reason: string | null;
  errors: BlackoutDateFieldErrors;
} {
  const errorsML: BlackoutDateFieldErrors = {};
  const dateML = String(formDataML.get("date") ?? "");
  const reasonML = String(formDataML.get("reason") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateML)) {
    errorsML.date = "Choose a date.";
  }

  return { date: errorsML.date ? null : dateML, reason: reasonML, errors: errorsML };
}

export async function addBlackoutDateML(
  shopML: string,
  dateML: string,
  reasonML: string | null,
  bookableProductIdML: string | null,
): Promise<BlackoutDate> {
  return prismaML.blackoutDate.create({
    data: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      date: new Date(dateML),
      reason: reasonML,
    },
  });
}

export async function deleteBlackoutDateML(
  shopML: string,
  idML: string,
): Promise<void> {
  const existingML = await prismaML.blackoutDate.findFirst({
    where: { id: idML, shop: shopML },
    select: { date: true, bookableProductId: true },
  });
  if (!existingML) return;

  await prismaML.blackoutDate.deleteMany({
    where: { id: idML, shop: shopML },
  });

  if (existingML.bookableProductId === null) {
    await prismaML.blackoutDate.deleteMany({
      where: {
        shop: shopML,
        date: existingML.date,
        bookableProductId: { not: null },
        reason: EXCLUSION_REASON_ML,
      },
    });
  }
}