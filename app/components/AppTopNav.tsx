import { Link, useLocation } from "react-router";

import styles from "./AppTopNav.module.css";
import {
  BlackoutIcon,
  BookingsIcon,
  CustomFieldsIcon,
  HomeIcon,
  LocationIcon,
  NewBookingIcon,
  ProductsIcon,
  ReportsIcon,
  SettingsIcon,
} from "./NavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  // Matches nested routes too, e.g. /app/products/123 stays on "Products".
  matchPrefix?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/settings", label: "Booking Settings", icon: SettingsIcon },
  { href: "/app/products", label: "Products", icon: ProductsIcon, matchPrefix: true },
  { href: "/app/locations", label: "Locations", icon: LocationIcon },
  { href: "/app/blackout-dates", label: "Blackout Dates", icon: BlackoutIcon },
  { href: "/app/custom-fields", label: "Custom Fields", icon: CustomFieldsIcon },
  { href: "/app/bookings/new", label: "New Booking", icon: NewBookingIcon },
  { href: "/app/booking-management", label: "Bookings", icon: BookingsIcon },
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

  return (
    <nav className={styles.bar} aria-label="App navigation">
      <div className={styles.group}>
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
              className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
            >
              <Icon />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
