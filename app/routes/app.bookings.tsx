import { Outlet } from "react-router";

import { SubTabs } from "../components/SubTabs";

export default function BookingsLayout() {
  return (
    <>
      <SubTabs
        tabs={[
          { to: "/app/bookings/new", label: "New Booking" },
          { to: "/app/bookings/slot", label: "Slot Bookings" },
          { to: "/app/bookings/full-day", label: "Full-Day Bookings" },
          { to: "/app/bookings/multi-day", label: "Multi-Day Bookings" },
          { to: "/app/bookings/bundle", label: "Bundle Bookings" },
        ]}
      />
      <Outlet />
    </>
  );
}