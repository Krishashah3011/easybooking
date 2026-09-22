import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  checkAppEmbedStatus,
  getOrCreateShopSettings,
  setAppEnabled,
} from "../models/shopSettings.server";
import { styles } from "../components/SettingsUI";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopSettings = await getOrCreateShopSettings(session.shop);
  const embedStatus = await checkAppEmbedStatus(admin);

  return {
    serialKey: shopSettings.serialKey,
    isAppEnabled: shopSettings.isAppEnabled,
    embedStatus,
    shop: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const isAppEnabled = formData.get("isAppEnabled") === "true";

  await setAppEnabled(session.shop, isAppEnabled);

  return { ok: true as const, isAppEnabled };
};

export default function GeneralSettingsTab() {
  const { serialKey, isAppEnabled, embedStatus, shop } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const currentEnabled =
    fetcher.formData?.get("isAppEnabled") != null
      ? fetcher.formData.get("isAppEnabled") === "true"
      : isAppEnabled;
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show(
        fetcher.data.isAppEnabled ? "Booking app enabled" : "Booking app disabled",
      );
    }
  }, [fetcher.data, shopify]);

  const toggleApp = () => {
    fetcher.submit(
      { isAppEnabled: String(!currentEnabled) },
      { method: "POST" },
    );
  };

  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps`;

  return (
    <div style={styles.innerCard}>
      <div style={styles.licenseBox}>
        <div style={styles.rowBetween}>
          <div>
            <div style={styles.label}>Booking App Status</div>
            <div style={styles.subLabel}>
              Turn the whole booking app on or off across your storefront.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={currentEnabled}
            aria-label={currentEnabled ? "Disable booking app" : "Enable booking app"}
            onClick={toggleApp}
            disabled={isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "46px",
              height: "24px",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {currentEnabled ? (
              <img src="/enable.svg" width={46} height={24} alt="" />
            ) : (
              <span
                style={{
                  position: "relative",
                  display: "block",
                  boxSizing: "border-box",
                  width: "46px",
                  height: "24px",
                  borderRadius: "12px",
                  background: "#E4E4E4",
                  border: "1px solid #DBDBDB",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "3px",
                    transform: "translateY(-50%)",
                    width: "17px",
                    height: "17px",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
                  }}
                />
              </span>
            )}
          </button>
        </div>
      </div>

      {embedStatus !== "enabled" && (
        <s-banner
          tone={embedStatus === "disabled" ? "warning" : "info"}
          heading="Enable the booking widget in your theme"
        >
          <s-paragraph>
            {embedStatus === "disabled"
              ? "The booking widget app embed is turned off, so booking won't show on your storefront. Turn it on in the theme editor."
              : "We couldn't confirm the booking widget's status. Check your theme editor to make sure the app embed is turned on."}
          </s-paragraph>
          <a
            href={themeEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: "4px",
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "13px",
              color: "#073E74",
              textDecoration: "underline",
            }}
          >
            Open theme editor
          </a>
        </s-banner>
      )}

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