import type { HeadersFunction, LoaderFunctionArgs, LinksFunction } from "react-router";
import { Outlet, redirect, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import { AppTopNav } from "../components/AppTopNav";

import navStyles from "../components/AppTopNav.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: navStyles },
];

const UNGATED_PATHS = new Set(["/app", "/app/"]);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopSettings = await getOrCreateShopSettings(session.shop);

  const url = new URL(request.url);
  const isAccountPath = url.pathname.startsWith("/app/account");

  if (!shopSettings.registered && !UNGATED_PATHS.has(url.pathname) && !isAccountPath) {
    throw redirect(`/app/account${url.search}`);
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    registered: shopSettings.registered,
  };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey} embedded>
      <div style={{ maxWidth: 950, marginInline: "auto" }}>
        <AppTopNav />
        <Outlet />
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