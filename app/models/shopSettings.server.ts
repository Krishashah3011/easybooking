import type { ShopSettings } from "@prisma/client";
import crypto from "crypto";
import prisma from "../db.server";

function generateSerialKey(): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `EB-${Date.now()}-${rand}`;
}

export async function getOrCreateShopSettings(
  shop: string,
): Promise<ShopSettings> {
  let settings = await prisma.shopSettings.findUnique({ where: { shop } });

  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: { shop, serialKey: generateSerialKey() },
    });
  } else if (!settings.serialKey) {
    settings = await prisma.shopSettings.update({
      where: { shop },
      data: { serialKey: generateSerialKey() },
    });
  }

  return settings;
}