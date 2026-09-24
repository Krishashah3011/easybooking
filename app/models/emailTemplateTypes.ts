export type EmailTemplateType =
  | "confirmation"
  | "bundleConfirmation"
  | "reminder"
  | "cancellation"
  | "rescheduled";

export const EMAIL_TEMPLATE_TYPES_ML: EmailTemplateType[] = [
  "confirmation",
  "bundleConfirmation",
  "reminder",
  "cancellation",
  "rescheduled",
];