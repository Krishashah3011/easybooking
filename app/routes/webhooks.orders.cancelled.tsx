import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { cancelBookingsForOrder } from "../models/booking.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const orderId = (payload as { id: number | string }).id;
  await cancelBookingsForOrder(shop, orderId);

  return new Response();
};
