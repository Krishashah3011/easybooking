import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listEnabledLocations,
  toPublicLocation,
} from "../models/bookingLocation.server";
import { getBookableProduct } from "../models/bookableProduct.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  const [locations, bookableProduct] = await Promise.all([
    listEnabledLocations(session.shop),
    productId ? getBookableProduct(session.shop, productId) : Promise.resolve(null),
  ]);

  return Response.json({
    locations: locations.map(toPublicLocation),
    productBookingEnabled: productId ? !!bookableProduct?.isEnabled : true,
  });
};