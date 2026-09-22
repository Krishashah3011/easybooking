import type { BlackoutDate } from "@prisma/client";
import prisma from "../db.server";

export type BlackoutDateFieldErrors = {
  date?: string;
};

const EXCLUSION_REASON = "__excluded__";

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
    where: { shop, bookableProductId, NOT: { reason: EXCLUSION_REASON } },
    orderBy: { date: "asc" },
  });
}

export async function listProductBlackoutExclusions(
  shop: string,
  bookableProductId: string,
): Promise<Set<string>> {
  const rows = await prisma.blackoutDate.findMany({
    where: { shop, bookableProductId, reason: EXCLUSION_REASON },
    select: { date: true },
  });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
}

export async function excludeShopBlackoutDateForProduct(
  shop: string,
  bookableProductId: string,
  date: string,
): Promise<void> {
  const already = await prisma.blackoutDate.findFirst({
    where: {
      shop,
      bookableProductId,
      date: new Date(date),
      reason: EXCLUSION_REASON,
    },
    select: { id: true },
  });
  if (already) return;
  await prisma.blackoutDate.create({
    data: {
      shop,
      bookableProductId,
      date: new Date(date),
      reason: EXCLUSION_REASON,
    },
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
  const existing = await prisma.blackoutDate.findFirst({
    where: { id, shop },
    select: { date: true, bookableProductId: true },
  });
  if (!existing) return;

  await prisma.blackoutDate.deleteMany({
    where: { id, shop },
  });

  if (existing.bookableProductId === null) {
    await prisma.blackoutDate.deleteMany({
      where: {
        shop,
        date: existing.date,
        bookableProductId: { not: null },
        reason: EXCLUSION_REASON,
      },
    });
  }
}