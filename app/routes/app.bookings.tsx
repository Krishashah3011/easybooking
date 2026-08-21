import { Outlet } from "react-router";

import { SubTabs } from "../components/SubTabs";

export default function BookingsLayout() {
  return (
    <>
      <SubTabs
        tabs={[
          { to: "/app/bookings", label: "All Bookings", end: true },
          { to: "/app/bookings/new", label: "New Booking" },
        ]}
      />
      <Outlet />
    </>
  );
}