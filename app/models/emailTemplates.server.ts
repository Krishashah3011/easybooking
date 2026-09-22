import { renderEmailTemplate } from "./emailTemplate.server";
import type {
  BookingEmailData,
  BundleBookingEmailData,
  RescheduledEmailData,
} from "./emailTemplate.server";

export type {
  BookingEmailData,
  BundleBookingEmailData,
  BundleSessionInfo,
  RescheduledEmailData,
} from "./emailTemplate.server";

export async function confirmationEmail(
  shop: string,
  data: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplate(shop, "confirmation", data);
}

export async function bundleConfirmationEmail(
  shop: string,
  data: BundleBookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplate(shop, "bundleConfirmation", data);
}

export async function reminderEmail(
  shop: string,
  data: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplate(shop, "reminder", data);
}

export async function cancellationEmail(
  shop: string,
  data: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplate(shop, "cancellation", data);
}

export async function rescheduledEmail(
  shop: string,
  data: RescheduledEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplate(shop, "rescheduled", data);
}