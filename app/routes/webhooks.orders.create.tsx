import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createBookingsFromOrder, type OrderPayload } from "../models/booking.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const order = payload as unknown as OrderPayload;
  const created = await createBookingsFromOrder(shop, order);

  if (created.some((b) => b.status === "OVERBOOKED")) {
    console.warn(
      `Order ${order.id} for ${shop} created one or more OVERBOOKED bookings — needs merchant review.`,
    );
  }

  return new Response();
};
