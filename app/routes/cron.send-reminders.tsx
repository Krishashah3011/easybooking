import type { ActionFunctionArgs } from "react-router";
import { sendDueRemindersML } from "../models/booking.server";

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const secretML = process.env.CRON_SECRET;
  if (!secretML) {
    return Response.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const authHeaderML = requestML.headers.get("Authorization") ?? "";
  if (authHeaderML !== `Bearer ${secretML}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowHoursParamML = new URL(requestML.url).searchParams.get("windowHours");
  const windowHoursML = windowHoursParamML ? Number(windowHoursParamML) : 24;

  const resultML = await sendDueRemindersML(
    Number.isFinite(windowHoursML) ? windowHoursML : 24,
  );

  return Response.json(resultML);
};