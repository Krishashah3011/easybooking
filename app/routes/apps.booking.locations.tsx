import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listEnabledLocations,
  toPublicLocation,
} from "../models/bookingLocation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const locations = await listEnabledLocations(session.shop);
  return Response.json({ locations: locations.map(toPublicLocation) });
};
