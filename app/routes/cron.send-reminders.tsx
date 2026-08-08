import type { ActionFunctionArgs } from "react-router";
import { sendDueReminders } from "../models/booking.server";

/**
 * POST /cron/send-reminders
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Shopify apps have no built-in scheduler, so this route is meant to be
 * called on a schedule by an external trigger — a hosting provider's own
 * cron (Render/Fly/Railway cron jobs), GitHub Actions on a schedule, or a
 * free service like cron-job.org hitting this URL every hour. It has no
 * Shopify session context, so it's protected by a shared secret instead.
 */
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
