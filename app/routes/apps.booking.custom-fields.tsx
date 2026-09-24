import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  listCustomFieldsML,
  toPublicFieldML,
} from "../models/customBookingField.server";

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.public.appProxy(requestML);
  if (!sessionML) {
    return Response.json({ error: "Unknown shop" }, { status: 401 });
  }

  const fieldsML = await listCustomFieldsML(sessionML.shop);
  return Response.json({ fields: fieldsML.map(toPublicFieldML) });
};