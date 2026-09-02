import type { HeadersFunction } from "react-router";
import { NavLink, Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { styles, tabButtonStyle } from "../components/SettingsUI";

const TABS = [
  { to: "/app/settings", label: "General Settings", end: true },
  { to: "/app/settings/booking", label: "Booking Settings" },
  { to: "/app/settings/locations", label: "Locations" },
  { to: "/app/settings/blackout-dates", label: "Blackout Dates" },
  { to: "/app/settings/custom-fields", label: "Custom Fields" },
  { to: "/app/settings/smtp", label: "SMTP Settings" },
];

export default function SettingsLayout() {
  return (
    <s-page heading="Settings" inlineSize="large" style={{ fontFamily: "Inter" }}>
      <div style={styles.outerCard}>
        <div style={styles.headerRow}>
          <h1 style={styles.heading}>Configurations</h1>
        </div>
        <p style={{ ...styles.subLabel, marginTop: "-8px", marginBottom: "12px" }}>
          Drag and drop rules to change their priority. Higher rules are evaluated first.
        </p>

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

        <Outlet />
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
