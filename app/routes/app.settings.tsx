import { Outlet } from "react-router";

import { SubTabs } from "../components/SubTabs";

export default function SettingsLayout() {
  return (
    <>
      <SubTabs
        tabs={[
          { to: "/app/settings", label: "Booking Settings", end: true },
          { to: "/app/settings/locations", label: "Locations" },
          { to: "/app/settings/blackout-dates", label: "Blackout Dates" },
          { to: "/app/settings/custom-fields", label: "Custom Fields" },
        ]}
      />
      <Outlet />
    </>
  );
}