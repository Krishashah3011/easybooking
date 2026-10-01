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

export const MIN_REMINDER_HOURS_ML = 1;
export const MAX_REMINDER_HOURS_ML = 168;