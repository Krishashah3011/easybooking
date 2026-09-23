import type { EmailTemplate } from "@prisma/client";
import prisma from "../db.server";
import { formatTimeRangeDisplay } from "../utils/format";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "./emailTemplateTypes";

export { EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from "./emailTemplateTypes";

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  confirmation: "Booking Confirmation",
  bundleConfirmation: "Bundle Booking Confirmation",
  reminder: "Booking Reminder",
  cancellation: "Booking Cancellation",
  rescheduled: "Booking Rescheduled",
};

export const EMAIL_TEMPLATE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  confirmation: "Sent to the customer right after a single-session booking is placed.",
  bundleConfirmation: "Sent once for a bundle purchase, listing every session in the bundle.",
  reminder: "Sent automatically ahead of an upcoming booking.",
  cancellation: "Sent to the customer when a booking is cancelled.",
  rescheduled: "Sent to the customer when a booking's date/time is changed.",
};

const COMMON_PLACEHOLDERS = [
  { token: "{{customer_name}}", description: "Customer's name (falls back to a generic greeting if unknown)" },
  { token: "{{product_title}}", description: "The booked product/service name" },
  { token: "{{date}}", description: "Booking date" },
  { token: "{{time_range}}", description: "Booking time range (e.g. 10:00 AM – 11:00 AM)" },
  { token: "{{shop_name}}", description: "Your store's name" },
];

export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<
  EmailTemplateType,
  { token: string; description: string }[]
> = {
  confirmation: COMMON_PLACEHOLDERS,
  reminder: COMMON_PLACEHOLDERS,
  cancellation: COMMON_PLACEHOLDERS,
  bundleConfirmation: [
    COMMON_PLACEHOLDERS[0],
    COMMON_PLACEHOLDERS[1],
    { token: "{{session_count}}", description: "Number of sessions in the bundle" },
    { token: "{{sessions_list}}", description: "A formatted list of every session's date and time" },
    COMMON_PLACEHOLDERS[4],
  ],
  rescheduled: [
    ...COMMON_PLACEHOLDERS,
    { token: "{{previous_date}}", description: "The booking's previous date" },
    { token: "{{previous_time_range}}", description: "The booking's previous time range" },
  ],
};

export type BookingEmailData = {
  productTitle: string;
  customerName: string | null;
  date: string;
  slotStart: string;
  slotEnd: string;
  shopName: string;
};

export type BundleSessionInfo = { date: string; slotStart: string; slotEnd: string };

export type BundleBookingEmailData = {
  productTitle: string;
  customerName: string | null;
  sessions: BundleSessionInfo[];
  shopName: string;
};

export type RescheduledEmailData = BookingEmailData & {
  previousDate: string;
  previousSlotStart: string;
  previousSlotEnd: string;
};

export type AnyEmailData =
  | BookingEmailData
  | BundleBookingEmailData
  | RescheduledEmailData;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greetingName(customerName: string | null): string {
  return customerName ? customerName : "there";
}

export const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplateType,
  { subject: string; body: string }
> = {
  confirmation: {
    subject: "Booking confirmed: {{product_title}} on {{date}}",
    body: `<p>Hi {{customer_name}},</p>
<p>Your booking is confirmed:</p>
<ul>
  <li><strong>{{product_title}}</strong></li>
  <li>{{date}}, {{time_range}}</li>
</ul>
<p>Thanks for booking with {{shop_name}}.</p>`,
  },
  bundleConfirmation: {
    subject: "Booking confirmed: {{product_title}} ({{session_count}} sessions)",
    body: `<p>Hi {{customer_name}},</p>
<p>Your booking is confirmed:</p>
<p><strong>{{product_title}}</strong></p>
<ul>
{{sessions_list}}
</ul>
<p>Thanks for booking with {{shop_name}}.</p>`,
  },
  reminder: {
    subject: "Reminder: {{product_title}} coming up on {{date}}",
    body: `<p>Hi {{customer_name}},</p>
<p>This is a reminder for your upcoming booking:</p>
<ul>
  <li><strong>{{product_title}}</strong></li>
  <li>{{date}}, {{time_range}}</li>
</ul>
<p>See you soon &mdash; {{shop_name}}.</p>`,
  },
  cancellation: {
    subject: "Booking cancelled: {{product_title}} on {{date}}",
    body: `<p>Hi {{customer_name}},</p>
<p>Your booking has been cancelled:</p>
<ul>
  <li><strong>{{product_title}}</strong></li>
  <li>{{date}}, {{time_range}}</li>
</ul>
<p>If this wasn't expected, feel free to reach out to {{shop_name}}.</p>`,
  },
  rescheduled: {
    subject: "Booking rescheduled: {{product_title}} now on {{date}}",
    body: `<p>Hi {{customer_name}},</p>
<p>Your booking has been rescheduled:</p>
<ul>
  <li><strong>{{product_title}}</strong></li>
  <li>Was: {{previous_date}}, {{previous_time_range}}</li>
  <li>Now: {{date}}, {{time_range}}</li>
</ul>
<p>Thanks for your patience &mdash; {{shop_name}}.</p>`,
  },
};

function buildRawTokens(
  type: EmailTemplateType,
  data: AnyEmailData,
): Record<string, string> {
  if (type === "bundleConfirmation") {
    const bundleData = data as BundleBookingEmailData;
    return {
      customer_name: greetingName(bundleData.customerName),
      product_title: bundleData.productTitle,
      session_count: String(bundleData.sessions.length),
      shop_name: bundleData.shopName,
    };
  }

  const single = data as BookingEmailData | RescheduledEmailData;
  const tokens: Record<string, string> = {
    customer_name: greetingName(single.customerName),
    product_title: single.productTitle,
    date: single.date,
    time_range: formatTimeRangeDisplay(single.slotStart, single.slotEnd),
    shop_name: single.shopName,
  };

  if (type === "rescheduled") {
    const rescheduledData = data as RescheduledEmailData;
    tokens.previous_date = rescheduledData.previousDate;
    tokens.previous_time_range = formatTimeRangeDisplay(
      rescheduledData.previousSlotStart,
      rescheduledData.previousSlotEnd,
    );
  }

  return tokens;
}

function escapeTokens(tokens: Record<string, string>): Record<string, string> {
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    escaped[key] = escapeHtml(value);
  }
  return escaped;
}

function buildSessionsListHtml(sessions: BundleSessionInfo[]): string {
  return sessions
    .map(
      (s) =>
        `  <li>${escapeHtml(s.date)}, ${escapeHtml(formatTimeRangeDisplay(s.slotStart, s.slotEnd))}</li>`,
    )
    .join("\n");
}

function fillTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
  });
}

function htmlToText(html: string): string {
  return html
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function listEmailTemplates(
  shop: string,
): Promise<
  {
    type: EmailTemplateType;
    label: string;
    description: string;
    placeholders: { token: string; description: string }[];
    subject: string;
    body: string;
    isCustomized: boolean;
  }[]
> {
  const rows = await prisma.emailTemplate.findMany({ where: { shop } });
  const byType = new Map<string, EmailTemplate>(
    rows.map((row: EmailTemplate) => [row.type, row]),
  );

  return EMAIL_TEMPLATE_TYPES.map((type) => {
    const row = byType.get(type);
    const fallback = DEFAULT_EMAIL_TEMPLATES[type];
    return {
      type,
      label: EMAIL_TEMPLATE_LABELS[type],
      description: EMAIL_TEMPLATE_DESCRIPTIONS[type],
      placeholders: EMAIL_TEMPLATE_PLACEHOLDERS[type],
      subject: row?.subject ?? fallback.subject,
      body: row?.body ?? fallback.body,
      isCustomized: Boolean(row),
    };
  });
}

export async function upsertEmailTemplate(
  shop: string,
  type: EmailTemplateType,
  subject: string,
  body: string,
): Promise<EmailTemplate> {
  return prisma.emailTemplate.upsert({
    where: { shop_type: { shop, type } },
    create: { shop, type, subject, body },
    update: { subject, body },
  });
}

export async function resetEmailTemplate(
  shop: string,
  type: EmailTemplateType,
): Promise<void> {
  await prisma.emailTemplate.deleteMany({ where: { shop, type } });
}

export async function renderEmailTemplate(
  shop: string,
  type: EmailTemplateType,
  data: AnyEmailData,
): Promise<{ subject: string; html: string; text: string }> {
  const row = await prisma.emailTemplate.findUnique({
    where: { shop_type: { shop, type } },
  });
  const fallback = DEFAULT_EMAIL_TEMPLATES[type];
  const subjectTemplate = row?.subject ?? fallback.subject;
  const bodyTemplate = row?.body ?? fallback.body;

  const rawTokens = buildRawTokens(type, data);
  const subject = fillTemplate(subjectTemplate, rawTokens);

  const htmlTokens = escapeTokens(rawTokens);
  if (type === "bundleConfirmation") {
    htmlTokens.sessions_list = buildSessionsListHtml(
      (data as BundleBookingEmailData).sessions,
    );
  }
  const html = fillTemplate(bodyTemplate, htmlTokens);
  const text = htmlToText(html);

  return { subject, html, text };
}

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