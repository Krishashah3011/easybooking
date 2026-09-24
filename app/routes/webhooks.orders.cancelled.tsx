import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { cancelBookingsForOrderML } from "../models/booking.server";

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { shop: shopML, topic: topicML, payload: payloadML } = await authenticate.webhook(requestML);

  console.log(`Received ${topicML} webhook for ${shopML}`);

  const orderIdML = (payloadML as { id: number | string }).id;
  await cancelBookingsForOrderML(shopML, orderIdML);

  return new Response();
};