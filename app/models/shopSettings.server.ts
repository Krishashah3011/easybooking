import type { ShopSettings } from "@prisma/client";
import crypto from "crypto";
import prismaML from "../db.server";

function generateSerialKeyML(): string {
  const randML = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `EB-${Date.now()}-${randML}`;
}

export async function setAppEnabledML(
  shopML: string,
  isAppEnabledML: boolean,
): Promise<ShopSettings> {
  return prismaML.shopSettings.upsert({
    where: { shop: shopML },
    create: { shop: shopML, serialKey: generateSerialKeyML(), isAppEnabled: isAppEnabledML },
    update: { isAppEnabled: isAppEnabledML },
  });
}

export type AppEmbedStatus = "enabled" | "disabled" | "unknown";

export async function checkAppEmbedStatusML(
  adminML: { graphql: (query: string) => Promise<Response> },
): Promise<AppEmbedStatus> {
  try {
    const responseML = await adminML.graphql(
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
    const jsonML = await responseML.json();
    const contentML =
      jsonML?.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
    if (!contentML) return "unknown";

    const parsedML = JSON.parse(contentML);
    const blocksML = parsedML?.current?.blocks ?? {};
    const matchML = Object.values(blocksML).find(
      (blockML: any) =>
        typeof blockML?.type === "string" && blockML.type.includes("/booking-widget/"),
    ) as { disabled?: boolean } | undefined;

    if (!matchML) return "disabled";
    return matchML.disabled === true ? "disabled" : "enabled";
  } catch {
    return "unknown";
  }
}

export async function getOrCreateShopSettingsML(
  shopML: string,
): Promise<ShopSettings> {
  let settingsML = await prismaML.shopSettings.upsert({
    where: { shop: shopML },
    create: { shop: shopML, serialKey: generateSerialKeyML() },
    update: {},
  });

  if (!settingsML.serialKey) {
    settingsML = await prismaML.shopSettings.update({
      where: { shop: shopML },
      data: { serialKey: generateSerialKeyML() },
    });
  }

  return settingsML;
}