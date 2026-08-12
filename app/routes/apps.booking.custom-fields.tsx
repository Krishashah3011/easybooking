import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listCustomFields,
  toPublicField,
} from "../models/customBookingField.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const fields = await listCustomFields(session.shop);
  return Response.json({ fields: fields.map(toPublicField) });
};