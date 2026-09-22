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
import { styles, BLUE } from "../components/SettingsUI";

const GRAY_OFF = "#E4E4E4";

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: "46px",
        height: "24px",
        borderRadius: "110px",
        border: "none",
        padding: 0,
        position: "relative",
        background: checked ? BLUE : GRAY_OFF,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3.5px",
          left: checked ? "25px" : "4px",
          width: "17px",
          height: "17px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

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
        <div style={styles.licenseTitle}>License</div>
        <hr style={styles.divider} />

        <div style={styles.rowBetween}>
          <div style={styles.label}>Serial Key</div>
          <div style={styles.serialPill}>{serialKey}</div>
        </div>
        <hr style={styles.divider} />

        <div style={styles.rowBetween}>
          <div>
            <div style={styles.label}>Booking App Status</div>
            <div style={styles.subLabel}>
              Turn the whole booking app on or off across your storefront.
            </div>
          </div>
          <ToggleSwitch
            checked={currentEnabled}
            onChange={toggleApp}
            disabled={isSubmitting}
            label={currentEnabled ? "Disable booking app" : "Enable booking app"}
          />
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
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};