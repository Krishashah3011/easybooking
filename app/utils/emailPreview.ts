import type { EmailTemplateType } from "../models/emailTemplateTypes";

const SAMPLE_SESSIONS_LIST = [
  "  <li>Oct 5, 2026, 10:00 AM &ndash; 11:00 AM</li>",
  "  <li>Oct 12, 2026, 10:00 AM &ndash; 11:00 AM</li>",
  "  <li>Oct 19, 2026, 10:00 AM &ndash; 11:00 AM</li>",
].join("\n");

const BASE_SAMPLE_TOKENS: Record<string, string> = {
  customer_name: "Priya",
  product_title: "Yoga Class",
  date: "Oct 5, 2026",
  time_range: "10:00 AM &ndash; 11:00 AM",
  shop_name: "Your Store",
};

export const SAMPLE_TOKENS_BY_TYPE: Record<EmailTemplateType, Record<string, string>> = {
  confirmation: BASE_SAMPLE_TOKENS,
  reminder: BASE_SAMPLE_TOKENS,
  cancellation: BASE_SAMPLE_TOKENS,
  bundleConfirmation: {
    customer_name: BASE_SAMPLE_TOKENS.customer_name,
    product_title: BASE_SAMPLE_TOKENS.product_title,
    session_count: "3",
    sessions_list: SAMPLE_SESSIONS_LIST,
    shop_name: BASE_SAMPLE_TOKENS.shop_name,
  },
  rescheduled: {
    ...BASE_SAMPLE_TOKENS,
    previous_date: "Sep 28, 2026",
    previous_time_range: "2:00 PM &ndash; 3:00 PM",
  },
};

export function fillPreviewTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
  });
}

export function buildPreview(
  type: EmailTemplateType,
  subject: string,
  body: string,
): { subject: string; html: string } {
  const tokens = SAMPLE_TOKENS_BY_TYPE[type];
  return {
    subject: fillPreviewTokens(subject, tokens),
    html: fillPreviewTokens(body, tokens),
  };
}
