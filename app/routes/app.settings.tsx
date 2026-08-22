import { Outlet } from "react-router";

import { SubTabs } from "../components/SubTabs";

export default function AppSettingsLayout() {
  return (
    <>
      <SubTabs
        tabs={[
          { to: "/app/settings", label: "SMTP Settings", end: true },
        ]}
      />
      <Outlet />
    </>
  );
}