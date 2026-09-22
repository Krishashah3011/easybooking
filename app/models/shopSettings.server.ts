import type { ShopSettings } from "@prisma/client";
import crypto from "crypto";
import prisma from "../db.server";

function generateSerialKey(): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `EB-${Date.now()}-${rand}`;
}

export async function setAppEnabled(
  shop: string,
  isAppEnabled: boolean,
): Promise<ShopSettings> {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, serialKey: generateSerialKey(), isAppEnabled },
    update: { isAppEnabled },
  });
}

export type AppEmbedStatus = "enabled" | "disabled" | "unknown";

export async function checkAppEmbedStatus(
  admin: { graphql: (query: string) => Promise<Response> },
): Promise<AppEmbedStatus> {
  try {
    const response = await admin.graphql(
      `#graphql
        query MainThemeEmbedCheck {
          themes(first: 1, roles: [MAIN]) {
            nodes {
              files(filenames: ["config/settings_data.json"]) {
                nodes {
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }
        }`,
    );
    const json = await response.json();
    const content =
      json?.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
    if (!content) return "unknown";

    const parsed = JSON.parse(content);
    const blocks = parsed?.current?.blocks ?? {};
    const match = Object.values(blocks).find(
      (block: any) =>
        typeof block?.type === "string" && block.type.includes("/booking-widget/"),
    ) as { disabled?: boolean } | undefined;

    if (!match) return "disabled";
    return match.disabled === true ? "disabled" : "enabled";
  } catch {
    return "unknown";
  }
}

export async function getOrCreateShopSettings(
  shop: string,
): Promise<ShopSettings> {
  let settings = await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, serialKey: generateSerialKey() },
    update: {},
  });

  if (!settings.serialKey) {
    settings = await prisma.shopSettings.update({
      where: { shop },
      data: { serialKey: generateSerialKey() },
    });
  }

  return settings;
}