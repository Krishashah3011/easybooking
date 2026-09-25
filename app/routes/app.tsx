import type { HeadersFunction, LoaderFunctionArgs, LinksFunction } from "react-router";
import { Link, Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { getOrCreateShopSettingsML } from "../models/shopSettings.server";
import { AppTopNav } from "../components/AppTopNav";

import navStyles from "../components/AppTopNav.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: navStyles },
];

const DEFAULT_APP_NAME_ML = "Milople Booking and Reservation App";
const BLUE_ML = "#073E74";
const BORDER_ML = "#DBDBDB";
const TEXT_DARK_ML = "#000000";
const TEXT_MUTED_ML = "#373737";

const UNGATED_PATHS_ML = new Set(["/app", "/app/"]);

function isGatedPathML(pathnameML: string) {
  return !UNGATED_PATHS_ML.has(pathnameML) && !pathnameML.startsWith("/app/account");
}

function sectionLabelML(pathnameML: string) {
  if (pathnameML.startsWith("/app/settings")) return "Settings";
  if (pathnameML.startsWith("/app/products")) return "Products";
  if (pathnameML.startsWith("/app/bookings")) return "Bookings";
  return "this page";
}

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const shopSettingsML = await getOrCreateShopSettingsML(sessionML.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    registered: shopSettingsML.registered,
    appName: process.env.APP_NAME?.trim() || DEFAULT_APP_NAME_ML,
  };
};

const lockStylesML: Record<string, React.CSSProperties> = {
  outerCard: {
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "8px",
    background: "#fff",
    padding: "16px",
    marginTop: "-16px",
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
    color: TEXT_DARK_ML,
    margin: 0,
  },
  lockDescription: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    color: TEXT_MUTED_ML,
    margin: 0,
    maxWidth: "360px",
  },
  lockButton: {
    marginTop: "8px",
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 20px",
    background: BLUE_ML,
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
      <rect x="1" y="15" width="30" height="20" rx="3" stroke={BLUE_ML} strokeWidth="1.8" />
      <path d="M7 15V9C7 4.58172 10.5817 1 15 1H17C21.4183 1 25 4.58172 25 9V15" stroke={BLUE_ML} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.4" fill={BLUE_ML} />
      <path d="M16 26.4V29.4" stroke={BLUE_ML} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RegisterRequired({
  section: sectionML,
  appName: appNameML,
}: {
  section: string;
  appName: string;
}) {
  return (
    <s-page heading={appNameML} inlineSize="large">
      <div style={lockStylesML.outerCard}>
        <div style={lockStylesML.lockWrap}>
          <LockIcon />
          <p style={lockStylesML.lockTitle}>Login Required</p>
          <p style={lockStylesML.lockDescription}>
            Create your account to access {sectionML} and manage your bookings
            with {appNameML}.
          </p>
          <Link to="/app/account" style={lockStylesML.lockButton}>
            Go to Account
          </Link>
        </div>
      </div>
    </s-page>
  );
}

export default function App() {
  const { apiKey: apiKeyML, registered: registeredML, appName: appNameML } = useLoaderData<typeof loader>();
  const { pathname: pathnameML } = useLocation();
  const lockedML = !registeredML && isGatedPathML(pathnameML);

  return (
    <AppProvider apiKey={apiKeyML} embedded>
      <div style={{ maxWidth: "982px", width: "100%", margin: "0 auto" }}>
        <AppTopNav />
        {lockedML ? (
          <RegisterRequired section={sectionLabelML(pathnameML)} appName={appNameML} />
        ) : (
          <Outlet />
        )}
      </div>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};