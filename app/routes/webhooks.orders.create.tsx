import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createBookingsFromOrderML, type OrderPayload } from "../models/booking.server";

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { shop: shopML, topic: topicML, payload: payloadML } = await authenticate.webhook(requestML);

  console.log(`Received ${topicML} webhook for ${shopML}`);

  const orderML = payloadML as unknown as OrderPayload;
  const createdML = await createBookingsFromOrderML(shopML, orderML);
  console.log(`Created ${createdML.length} booking(s) for order ${orderML.id}`);

  if (createdML.some((bML) => bML.status === "OVERBOOKED")) {
    console.warn(
      `Order ${orderML.id} for ${shopML} created one or more OVERBOOKED bookings — needs merchant review.`,
    );
  }

  return new Response();
};