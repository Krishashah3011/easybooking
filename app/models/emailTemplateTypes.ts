export type EmailTemplateType =
  | "confirmation"
  | "bundleConfirmation"
  | "reminder"
  | "cancellation"
  | "rescheduled";

export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = [
  "confirmation",
  "bundleConfirmation",
  "reminder",
  "cancellation",
  "rescheduled",
];