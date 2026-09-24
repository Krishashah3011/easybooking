import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  cancelBookingML,
  listSlotsForRescheduleML,
  rescheduleBookingML,
} from "../models/booking.server";
import type { TimeSlot } from "../models/slotAvailability.server";

export async function bookingListActionML({ request: requestML }: ActionFunctionArgs) {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as
    "cancel" | "reschedule" | "loadRescheduleSlots" | "";

  if (intentML === "cancel") {
    const idML = String(formDataML.get("id") ?? "");
    const resultML = await cancelBookingML(sessionML.shop, idML);
    return { intent: intentML, ...resultML };
  }

  if (intentML === "loadRescheduleSlots") {
    const idML = String(formDataML.get("id") ?? "");
    const dateML = String(formDataML.get("date") ?? "");
    if (!idML || !dateML) {
      return {
        intent: intentML,
        ok: false as const,
        error: "Missing booking or date.",
        slots: [] as TimeSlot[],
      };
    }
    const resultML = await listSlotsForRescheduleML(sessionML.shop, idML, dateML);
    if (!resultML.ok) {
      return { intent: intentML, ok: false as const, error: resultML.error, slots: [] as TimeSlot[] };
    }
    return { intent: intentML, ok: true as const, slots: resultML.slots };
  }

  if (intentML === "reschedule") {
    const idML = String(formDataML.get("id") ?? "");
    const dateML = String(formDataML.get("date") ?? "");
    const slotStartML = String(formDataML.get("slotStart") ?? "");
    const endDateML = String(formDataML.get("endDate") ?? "") || null;
    const resultML = await rescheduleBookingML(
      sessionML.shop,
      idML,
      dateML,
      slotStartML,
      endDateML,
    );
    return { intent: intentML, ...resultML };
  }

  return { intent: intentML, ok: false as const, error: "Unknown action." };
}