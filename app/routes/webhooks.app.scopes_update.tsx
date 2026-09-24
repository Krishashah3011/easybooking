import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
    const { payload: payloadML, session: sessionML, topic: topicML, shop: shopML } = await authenticate.webhook(requestML);
    console.log(`Received ${topicML} webhook for ${shopML}`);

    const currentML = payloadML.current as string[];
    if (sessionML) {
        await db.session.update({   
            where: {
                id: sessionML.id
            },
            data: {
                scope: currentML.toString(),
            },
        });
    }
    return new Response();
};