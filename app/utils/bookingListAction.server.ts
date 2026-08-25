import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  cancelBooking,
  listSlotsForReschedule,
  rescheduleBooking,
} from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";

export async function bookingListAction({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "cancel" | "reschedule" | "loadRescheduleSlots" | "";

  if (intent === "cancel") {
    const id = String(formData.get("id") ?? "");
    const result = await cancelBooking(session.shop, id);
    return { intent, ...result };
  }

  if (intent === "loadRescheduleSlots") {
    const id = String(formData.get("id") ?? "");
    const date = String(formData.get("date") ?? "");
    if (!id || !date) {
      return {
        intent,
        ok: false as const,
        error: "Missing booking or date.",
        slots: [] as TimeSlot[],
      };
    }
    const result = await listSlotsForReschedule(session.shop, id, date);
    if (!result.ok) {
      return { intent, ok: false as const, error: result.error, slots: [] as TimeSlot[] };
    }
    return { intent, ok: true as const, slots: result.slots };
  }

  if (intent === "reschedule") {
    const id = String(formData.get("id") ?? "");
    const date = String(formData.get("date") ?? "");
    const slotStart = String(formData.get("slotStart") ?? "");
    const result = await rescheduleBooking(session.shop, id, date, slotStart);
    return { intent, ...result };
  }

  return { intent, ok: false as const, error: "Unknown action." };
}