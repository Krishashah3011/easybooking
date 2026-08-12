import type { BlackoutDate } from "@prisma/client";
import prisma from "../db.server";

export type BlackoutDateFieldErrors = {
  date?: string;
};

export async function listShopBlackoutDates(
  shop: string,
): Promise<BlackoutDate[]> {
  return prisma.blackoutDate.findMany({
    where: { shop, bookableProductId: null },
    orderBy: { date: "asc" },
  });
}

export async function listProductBlackoutDates(
  shop: string,
  bookableProductId: string,
): Promise<BlackoutDate[]> {
  return prisma.blackoutDate.findMany({
    where: { shop, bookableProductId },
    orderBy: { date: "asc" },
  });
}

export function parseBlackoutDateForm(formData: FormData): {
  date: string | null;
  reason: string | null;
  errors: BlackoutDateFieldErrors;
} {
  const errors: BlackoutDateFieldErrors = {};
  const date = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = "Choose a date.";
  }

  return { date: errors.date ? null : date, reason, errors };
}

export async function addBlackoutDate(
  shop: string,
  date: string,
  reason: string | null,
  bookableProductId: string | null,
): Promise<BlackoutDate> {
  return prisma.blackoutDate.create({
    data: {
      shop,
      bookableProductId,
      date: new Date(date),
      reason,
    },
  });
}

export async function deleteBlackoutDate(
  shop: string,
  id: string,
): Promise<void> {
  await prisma.blackoutDate.deleteMany({
    where: { id, shop },
  });
}