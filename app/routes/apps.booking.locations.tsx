import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listEnabledLocationsML,
  toPublicLocationML,
} from "../models/bookingLocation.server";
import {
  getBookableProductML,
  isProductAvailableForCountryML,
} from "../models/bookableProduct.server";

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.public.appProxy(requestML);
  if (!sessionML) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const urlML = new URL(requestML.url);
  const productIdML = urlML.searchParams.get("productId");
  const countryCodeML = urlML.searchParams.get("country");

  const [locationsML, bookableProductML] = await Promise.all([
    listEnabledLocationsML(sessionML.shop),
    productIdML ? getBookableProductML(sessionML.shop, productIdML) : Promise.resolve(null),
  ]);

  const productBookingEnabledML = productIdML
    ? !!bookableProductML &&
      bookableProductML.isEnabled &&
      isProductAvailableForCountryML(bookableProductML, countryCodeML)
    : true;

  return Response.json({
    locations: locationsML.map(toPublicLocationML),
    productBookingEnabled: productBookingEnabledML,
  });
};