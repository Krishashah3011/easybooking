import { useCallback, useState } from "react";
import type { HeadersFunction } from "react-router";
import { NavLink, Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  styles,
  tabButtonStyle,
  saveWrapperStyle,
  saveButtonStyle,
} from "../components/SettingsUI";

const TABS = [
  { to: "/app/settings", label: "General Settings", end: true },
  { to: "/app/settings/booking", label: "Booking Settings" },
  { to: "/app/settings/locations", label: "Locations" },
  { to: "/app/settings/blackout-dates", label: "Blackout Dates" },
  { to: "/app/settings/custom-fields", label: "Custom Fields" },
  { to: "/app/settings/smtp", label: "SMTP Settings" },
];

// Lets any settings sub-page opt in to the shared "Save Settings" button in
// the header — call this in a useEffect with your own save handler and
// saving state. Pages that don't call it just leave the button inert.
export type RegisterSave = (
  handler: (() => void) | null,
  isSaving?: boolean,
) => void;

export default function SettingsLayout() {
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const registerSave: RegisterSave = useCallback((handler, saving = false) => {
    setSaveHandler(() => handler);
    setIsSaving(saving);
  }, []);

  return (
    <s-page heading="Settings" inlineSize="large" style={{ fontFamily: "Inter" }}>
      <div style={styles.outerCard}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.heading}>Configurations</h1>
            <p style={styles.pageSubtitle}>
              Configure your booking rules and customize how customers book appointments on your store.
            </p>
          </div>
          <div style={saveWrapperStyle()}>
            <button
              style={saveButtonStyle(isSaving)}
              disabled={!saveHandler || isSaving}
              onClick={() => saveHandler?.()}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div style={styles.tabBar}>
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              style={({ isActive }) => tabButtonStyle(isActive)}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <Outlet context={{ registerSave }} />
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};