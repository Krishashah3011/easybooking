import { Link, useLocation } from "react-router";

import "./AppTopNav.css";
import {
  AccountIcon,
  BookingsIcon,
  HomeIcon,
  ProductsIcon,
  ReportsIcon,
  SettingsIcon,
} from "./NavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  matchPrefix?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon, matchPrefix: true },
  { href: "/app/products", label: "Products", icon: ProductsIcon, matchPrefix: true },
  { href: "/app/bookings", label: "Bookings", icon: BookingsIcon, matchPrefix: true },
  { href: "/app/reports", label: "Reports", icon: ReportsIcon },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  return item.matchPrefix
    ? pathname.startsWith(item.href)
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppTopNav() {
  const { pathname } = useLocation();
  const accountActive = pathname.startsWith("/app/account");

  return (
    <nav className="bar" aria-label="App navigation">
      <div className="group">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={active ? "link linkActive" : "link"}
            >
              <Icon />
            </Link>
          );
        })}
      </div>
      <div className="spacer" />
      <Link
        to="/app/account"
        title="Account"
        aria-label="Account"
        aria-current={accountActive ? "page" : undefined}
        className={accountActive ? "link linkActive" : "link"}
      >
        <AccountIcon />
      </Link>
    </nav>
  );
}