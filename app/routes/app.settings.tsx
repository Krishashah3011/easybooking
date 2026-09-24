import { useCallback, useState } from "react";
import type { HeadersFunction } from "react-router";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  stylesML,
  tabButtonStyleML,
  saveWrapperStyleML,
  saveButtonStyleML,
  TabNavRow,
} from "../components/SettingsUI";

const TABS_ML = [
  { to: "/app/settings", label: "General Settings", end: true },
  { to: "/app/settings/booking", label: "Booking Settings" },
  { to: "/app/settings/locations", label: "Locations" },
  { to: "/app/settings/blackout-dates", label: "Blackout Dates" },
  { to: "/app/settings/custom-fields", label: "Custom Fields" },
  { to: "/app/settings/email", label: "Email Settings" },
];

export type RegisterSave = (
  handler: (() => void) | null,
  isSaving?: boolean,
) => void;

export default function SettingsLayout() {
  const [saveHandlerML, setSaveHandlerML] = useState<(() => void) | null>(null);
  const [isSavingML, setIsSavingML] = useState(false);
  const locationML = useLocation();
  const navigateML = useNavigate();

  const registerSaveML: RegisterSave = useCallback((handlerML, savingML = false) => {
    setSaveHandlerML(() => handlerML);
    setIsSavingML(savingML);
  }, []);

  const currentPathML = locationML.pathname.replace(/\/$/, "") || "/app/settings";
  const activeIndexML = TABS_ML.findIndex((tabML) => tabML.to === currentPathML);
  const isFirstML = activeIndexML <= 0;
  const isLastML = activeIndexML === -1 || activeIndexML === TABS_ML.length - 1;

  const goBackML = () => {
    if (activeIndexML > 0) navigateML(TABS_ML[activeIndexML - 1].to);
  };
  const goNextML = () => {
    if (activeIndexML !== -1 && activeIndexML < TABS_ML.length - 1) {
      navigateML(TABS_ML[activeIndexML + 1].to);
    }
  };

  return (
    <s-page heading="Settings" inlineSize="large" style={{ fontFamily: "Inter" }}>
      <div style={stylesML.outerCard}>
        <div style={stylesML.headerRow}>
          <div>
            <h1 style={stylesML.heading}>Configurations</h1>
            <p style={stylesML.pageSubtitle}>
              Configure your store's booking rules and preferences.
            </p>
          </div>
          <div className="eb-settings-save" style={saveWrapperStyleML()}>
            <button
              style={saveButtonStyleML(isSavingML)}
              disabled={!saveHandlerML || isSavingML}
              onClick={() => saveHandlerML?.()}
            >
              {isSavingML ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="eb-tab-bar" style={stylesML.tabBar}>
          {TABS_ML.map((tabML) => (
            <NavLink
              key={tabML.to}
              to={tabML.to}
              end={tabML.end}
              style={({ isActive: isActiveML }) => tabButtonStyleML(isActiveML)}
            >
              {tabML.label}
            </NavLink>
          ))}
        </div>

        <Outlet context={{ registerSave: registerSaveML }} />

        <TabNavRow onBack={goBackML} onNext={goNextML} isFirst={isFirstML} isLast={isLastML} />
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};