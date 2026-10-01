import { Link, useLocation } from "react-router";

import "./AppTopNav.css";
import {
  AccountIcon,
  BookingsIcon,
  HomeIcon,
  ProductsIcon,
  SettingsIcon,
  type IconProps,
} from "./NavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: IconProps) => JSX.Element;
  matchPrefix?: boolean;
};

const NAV_ITEMS_ML: NavItem[] = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon, matchPrefix: true },
  { href: "/app/products", label: "Products", icon: ProductsIcon, matchPrefix: true },
  { href: "/app/bookings", label: "Bookings", icon: BookingsIcon, matchPrefix: true },
];

function isActiveML(pathnameML: string, itemML: NavItem) {
  if (itemML.href === "/app") {
    return pathnameML === "/app" || pathnameML === "/app/";
  }
  return itemML.matchPrefix
    ? pathnameML.startsWith(itemML.href)
    : pathnameML === itemML.href || pathnameML.startsWith(`${itemML.href}/`);
}

export function AppTopNav() {
  const { pathname: pathnameML } = useLocation();
  const accountActiveML = pathnameML.startsWith("/app/account");

  return (
    <nav className="bar" aria-label="App navigation">
      <div className="barInner">
        <div className="group">
          {NAV_ITEMS_ML.map((itemML) => {
            const Icon = itemML.icon;
            const activeML = isActiveML(pathnameML, itemML);
            const tipIdML = `nav-tip-${itemML.label.toLowerCase()}`;
            return (
              <div key={itemML.href} style={{ display: "flex" }}>
                <s-text interestFor={tipIdML}>
                  <Link
                    to={itemML.href}
                    aria-label={itemML.label}
                    aria-current={activeML ? "page" : undefined}
                    className="link"
                  >
                    <Icon active={activeML} />
                  </Link>
                </s-text>
                <s-tooltip id={tipIdML}>{itemML.label}</s-tooltip>
              </div>
            );
          })}
        </div>
        <div className="spacer" />
        <div style={{ display: "flex" }}>
          <s-text interestFor="nav-tip-account">
            <Link
              to="/app/account"
              aria-label="Account"
              aria-current={accountActiveML ? "page" : undefined}
              className="link"
            >
              <AccountIcon active={accountActiveML} />
            </Link>
          </s-text>
          <s-tooltip id="nav-tip-account">Account</s-tooltip>
        </div>
      </div>
    </nav>
  );
}