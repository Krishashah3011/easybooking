import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  await authenticate.admin(requestML);

  return null;
};

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};