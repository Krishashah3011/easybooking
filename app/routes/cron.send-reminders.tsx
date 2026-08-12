import type { ActionFunctionArgs } from "react-router";
import { sendDueReminders } from "../models/booking.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowHoursParam = new URL(request.url).searchParams.get("windowHours");
  const windowHours = windowHoursParam ? Number(windowHoursParam) : 24;

  const result = await sendDueReminders(
    Number.isFinite(windowHours) ? windowHours : 24,
  );

  return Response.json(result);
};