import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import { styles } from "../components/SettingsUI";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopSettings = await getOrCreateShopSettings(session.shop);
  return { serialKey: shopSettings.serialKey };
};

export default function GeneralSettingsTab() {
  const { serialKey } = useLoaderData<typeof loader>();

  return (
    <div style={styles.innerCard}>
      <div style={styles.licenseBox}>
        <div style={styles.licenseTitle}>License</div>
        <hr style={styles.divider} />

        <div style={styles.rowBetween}>
          <div style={styles.label}>Serial Key</div>
          <div style={styles.serialPill}>{serialKey}</div>
        </div>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
