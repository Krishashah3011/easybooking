import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { shop: shopML, session: sessionML, topic: topicML } = await authenticate.webhook(requestML);

  console.log(`Received ${topicML} webhook for ${shopML}`);

  if (sessionML) {
    await db.session.deleteMany({ where: { shop: shopML } });
  }

  return new Response();
};