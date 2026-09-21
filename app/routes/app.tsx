import type { HeadersFunction, LoaderFunctionArgs, LinksFunction } from "react-router";
import { Link, Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import { AppTopNav } from "../components/AppTopNav";

import navStyles from "../components/AppTopNav.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: navStyles },
];

const BLUE = "#073E74";
const BORDER = "#DBDBDB";
const TEXT_DARK = "#000000";
const TEXT_MUTED = "#373737";

const UNGATED_PATHS = new Set(["/app", "/app/"]);

function isGatedPath(pathname: string) {
  return !UNGATED_PATHS.has(pathname) && !pathname.startsWith("/app/account");
}

function sectionLabel(pathname: string) {
  if (pathname.startsWith("/app/settings")) return "Settings";
  if (pathname.startsWith("/app/products")) return "Products";
  if (pathname.startsWith("/app/bookings")) return "Bookings";
  return "this page";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopSettings = await getOrCreateShopSettings(session.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    registered: shopSettings.registered,
  };
};

const lockStyles: Record<string, React.CSSProperties> = {
  outerCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    background: "#fff",
    padding: "16px",
  },
  lockWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "48px 24px",
    gap: "12px",
  },
  lockTitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "18px",
    color: TEXT_DARK,
    margin: 0,
  },
  lockDescription: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    color: TEXT_MUTED,
    margin: 0,
    maxWidth: "360px",
  },
  lockButton: {
    marginTop: "8px",
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 20px",
    background: BLUE,
    borderRadius: "8px",
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
  },
};

function LockIcon() {
  return (
    <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="15" width="30" height="20" rx="3" stroke={BLUE} strokeWidth="1.8" />
      <path d="M7 15V9C7 4.58172 10.5817 1 15 1H17C21.4183 1 25 4.58172 25 9V15" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.4" fill={BLUE} />
      <path d="M16 26.4V29.4" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RegisterRequired({ section }: { section: string }) {
  return (
    <s-page inlineSize="large">
      <div style={lockStyles.outerCard}>
        <div style={lockStyles.lockWrap}>
          <LockIcon />
          <p style={lockStyles.lockTitle}>Login Required</p>
          <p style={lockStyles.lockDescription}>
            Create your account to access {section} and manage your bookings
            with EasyBooking.
          </p>
          <Link to="/app/account" style={lockStyles.lockButton}>
            Go to Account
          </Link>
        </div>
      </div>
    </s-page>
  );
}

export default function App() {
  const { apiKey, registered } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const locked = !registered && isGatedPath(pathname);

  return (
    <AppProvider apiKey={apiKey} embedded>
      <div style={{ maxWidth: "950px", width: "100%", margin: "0 auto" }}>
        <AppTopNav />
        {locked ? <RegisterRequired section={sectionLabel(pathname)} /> : <Outlet />}
      </div>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};