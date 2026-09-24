import type { EmailTemplateType } from "../models/emailTemplateTypes";

const SAMPLE_SESSIONS_LIST_ML = [
  "  <li>Oct 5, 2026, 10:00 AM &ndash; 11:00 AM</li>",
  "  <li>Oct 12, 2026, 10:00 AM &ndash; 11:00 AM</li>",
  "  <li>Oct 19, 2026, 10:00 AM &ndash; 11:00 AM</li>",
].join("\n");

const BASE_SAMPLE_TOKENS_ML: Record<string, string> = {
  customer_name: "Priya",
  product_title: "Yoga Class",
  date: "Oct 5, 2026",
  time_range: "10:00 AM &ndash; 11:00 AM",
  shop_name: "Your Store",
};

export const SAMPLE_TOKENS_BY_TYPE_ML: Record<EmailTemplateType, Record<string, string>> = {
  confirmation: BASE_SAMPLE_TOKENS_ML,
  reminder: BASE_SAMPLE_TOKENS_ML,
  cancellation: BASE_SAMPLE_TOKENS_ML,
  bundleConfirmation: {
    customer_name: BASE_SAMPLE_TOKENS_ML.customer_name,
    product_title: BASE_SAMPLE_TOKENS_ML.product_title,
    session_count: "3",
    sessions_list: SAMPLE_SESSIONS_LIST_ML,
    shop_name: BASE_SAMPLE_TOKENS_ML.shop_name,
  },
  rescheduled: {
    ...BASE_SAMPLE_TOKENS_ML,
    previous_date: "Sep 28, 2026",
    previous_time_range: "2:00 PM &ndash; 3:00 PM",
  },
};

export function fillPreviewTokensML(templateML: string, tokensML: Record<string, string>): string {
  return templateML.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (matchML, keyML) => {
    return Object.prototype.hasOwnProperty.call(tokensML, keyML) ? tokensML[keyML] : matchML;
  });
}

export function buildPreviewML(
  typeML: EmailTemplateType,
  subjectML: string,
  bodyML: string,
): { subject: string; html: string } {
  const tokensML = SAMPLE_TOKENS_BY_TYPE_ML[typeML];
  return {
    subject: fillPreviewTokensML(subjectML, tokensML),
    html: fillPreviewTokensML(bodyML, tokensML),
  };
}