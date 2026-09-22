import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listEnabledLocations,
  toPublicLocation,
} from "../models/bookingLocation.server";
import {
  getBookableProduct,
  isProductAvailableForCountry,
} from "../models/bookableProduct.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const countryCode = url.searchParams.get("country");

  const [locations, bookableProduct] = await Promise.all([
    listEnabledLocations(session.shop),
    productId ? getBookableProduct(session.shop, productId) : Promise.resolve(null),
  ]);

  const productBookingEnabled = productId
    ? !!bookableProduct &&
      bookableProduct.isEnabled &&
      isProductAvailableForCountry(bookableProduct, countryCode)
    : true;

  return Response.json({
    locations: locations.map(toPublicLocation),
    productBookingEnabled,
  });
};