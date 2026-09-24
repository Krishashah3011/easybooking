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
  checkAppEmbedStatusML,
  getOrCreateShopSettingsML,
  setAppEnabledML,
} from "../models/shopSettings.server";
import { stylesML, BLUE_ML } from "../components/SettingsUI";

const GRAY_OFF_ML = "#E4E4E4";

function ToggleSwitch({
  checked: checkedML,
  onChange: onChangeML,
  disabled: disabledML,
  label: labelML,
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
      aria-checked={checkedML}
      aria-label={labelML}
      disabled={disabledML}
      onClick={onChangeML}
      style={{
        width: "46px",
        height: "24px",
        borderRadius: "110px",
        border: "none",
        padding: 0,
        position: "relative",
        background: checkedML ? BLUE_ML : GRAY_OFF_ML,
        cursor: disabledML ? "default" : "pointer",
        opacity: disabledML ? 0.5 : 1,
        transition: "background 0.15s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3.5px",
          left: checkedML ? "25px" : "4px",
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

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { admin: adminML, session: sessionML } = await authenticate.admin(requestML);
  const shopSettingsML = await getOrCreateShopSettingsML(sessionML.shop);
  const embedStatusML = await checkAppEmbedStatusML(adminML);

  return {
    serialKey: shopSettingsML.serialKey,
    isAppEnabled: shopSettingsML.isAppEnabled,
    embedStatus: embedStatusML,
    shop: sessionML.shop,
  };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const isAppEnabledML = formDataML.get("isAppEnabled") === "true";

  await setAppEnabledML(sessionML.shop, isAppEnabledML);

  return { ok: true as const, isAppEnabled: isAppEnabledML };
};

export default function GeneralSettingsTab() {
  const { serialKey: serialKeyML, isAppEnabled: isAppEnabledML, embedStatus: embedStatusML, shop: shopML } =
    useLoaderData<typeof loader>();
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();

  const currentEnabledML =
    fetcherML.formData?.get("isAppEnabled") != null
      ? fetcherML.formData.get("isAppEnabled") === "true"
      : isAppEnabledML;
  const isSubmittingML = fetcherML.state !== "idle";

  useEffect(() => {
    if (fetcherML.data?.ok) {
      shopifyML.toast.show(
        fetcherML.data.isAppEnabled ? "Booking app enabled" : "Booking app disabled",
      );
    }
  }, [fetcherML.data, shopifyML]);

  const toggleAppML = () => {
    fetcherML.submit(
      { isAppEnabled: String(!currentEnabledML) },
      { method: "POST" },
    );
  };

  const themeEditorUrlML = `https://${shopML}/admin/themes/current/editor?context=apps`;

  return (
    <div style={stylesML.innerCard}>
      <div style={stylesML.licenseBox}>
        <div style={stylesML.licenseTitle}>License</div>
        <hr style={stylesML.divider} />

        <div style={stylesML.rowBetween}>
          <div style={stylesML.label}>Serial Key</div>
          <div style={stylesML.serialPill}>{serialKeyML}</div>
        </div>
        <hr style={stylesML.divider} />

        <div style={stylesML.rowBetween}>
          <div>
            <div style={stylesML.label}>Booking App Status</div>
            <div style={stylesML.subLabel}>
              Turn the whole booking app on or off across your storefront.
            </div>
          </div>
          <ToggleSwitch
            checked={currentEnabledML}
            onChange={toggleAppML}
            disabled={isSubmittingML}
            label={currentEnabledML ? "Disable booking app" : "Enable booking app"}
          />
        </div>
      </div>

      {embedStatusML !== "enabled" && (
        <div>
          <div style={stylesML.subLabel}>
            {
              "Check your theme editor to make sure the app embed is turned on. If it's off, the booking widget won't show up on your storefront."
            }
          </div>
          <a
            href={themeEditorUrlML}
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
        </div>
      )}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};