import { Outlet } from "react-router";

import { SubTabs } from "../components/SubTabs";

export default function SettingsLayout() {
  return (
    <>
      <SubTabs
        tabs={[
          { to: "/app/booking-settings", label: "Booking Settings", end: true },
          { to: "/app/booking-settings/locations", label: "Locations" },
          { to: "/app/booking-settings/blackout-dates", label: "Blackout Dates" },
          { to: "/app/booking-settings/custom-fields", label: "Custom Fields" },
        ]}
      />
      <Outlet />
    </>
  );
}