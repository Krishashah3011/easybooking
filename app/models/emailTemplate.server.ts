import type { EmailTemplate } from "@prisma/client";
import prismaML from "../db.server";
import { formatTimeRangeDisplayML } from "../utils/format";
import {
  EMAIL_TEMPLATE_TYPES_ML,
  type EmailTemplateType,
} from "./emailTemplateTypes";

export { EMAIL_TEMPLATE_TYPES_ML as EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from "./emailTemplateTypes";

export const EMAIL_TEMPLATE_LABELS_ML: Record<EmailTemplateType, string> = {
  confirmation: "Booking Confirmation",
  bundleConfirmation: "Bundle Booking Confirmation",
  reminder: "Booking Reminder",
  cancellation: "Booking Cancellation",
  rescheduled: "Booking Rescheduled",
};

export const EMAIL_TEMPLATE_DESCRIPTIONS_ML: Record<EmailTemplateType, string> = {
  confirmation: "Sent to the customer right after a single-session booking is placed.",
  bundleConfirmation: "Sent once for a bundle purchase, listing every session in the bundle.",
  reminder: "Sent automatically ahead of an upcoming booking.",
  cancellation: "Sent to the customer when a booking is cancelled.",
  rescheduled: "Sent to the customer when a booking's date/time is changed.",
};

const COMMON_PLACEHOLDERS_ML = [
  { token: "{{customer_name}}", description: "Customer's name (falls back to a generic greeting if unknown)" },
  { token: "{{product_title}}", description: "The booked product/service name" },
  { token: "{{date}}", description: "Booking date" },
  { token: "{{time_range}}", description: "Booking time range (e.g. 10:00 AM – 11:00 AM)" },
  { token: "{{shop_name}}", description: "Your store's name" },
];

export const EMAIL_TEMPLATE_PLACEHOLDERS_ML: Record<
  EmailTemplateType,
  { token: string; description: string }[]
> = {
  confirmation: COMMON_PLACEHOLDERS_ML,
  reminder: COMMON_PLACEHOLDERS_ML,
  cancellation: COMMON_PLACEHOLDERS_ML,
  bundleConfirmation: [
    COMMON_PLACEHOLDERS_ML[0],
    COMMON_PLACEHOLDERS_ML[1],
    { token: "{{session_count}}", description: "Number of sessions in the bundle" },
    { token: "{{sessions_list}}", description: "A formatted list of every session's date and time" },
    COMMON_PLACEHOLDERS_ML[4],
  ],
  rescheduled: [
    ...COMMON_PLACEHOLDERS_ML,
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

function escapeHtmlML(valueML: string): string {
  return valueML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greetingNameML(customerNameML: string | null): string {
  return customerNameML ? customerNameML : "there";
}

export const DEFAULT_EMAIL_TEMPLATES_ML: Record<
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

function buildRawTokensML(
  typeML: EmailTemplateType,
  dataML: AnyEmailData,
): Record<string, string> {
  if (typeML === "bundleConfirmation") {
    const bundleDataML = dataML as BundleBookingEmailData;
    return {
      customer_name: greetingNameML(bundleDataML.customerName),
      product_title: bundleDataML.productTitle,
      session_count: String(bundleDataML.sessions.length),
      shop_name: bundleDataML.shopName,
    };
  }

  const singleML = dataML as BookingEmailData | RescheduledEmailData;
  const tokensML: Record<string, string> = {
    customer_name: greetingNameML(singleML.customerName),
    product_title: singleML.productTitle,
    date: singleML.date,
    time_range: formatTimeRangeDisplayML(singleML.slotStart, singleML.slotEnd),
    shop_name: singleML.shopName,
  };

  if (typeML === "rescheduled") {
    const rescheduledDataML = dataML as RescheduledEmailData;
    tokensML.previous_date = rescheduledDataML.previousDate;
    tokensML.previous_time_range = formatTimeRangeDisplayML(
      rescheduledDataML.previousSlotStart,
      rescheduledDataML.previousSlotEnd,
    );
  }

  return tokensML;
}

function escapeTokensML(tokensML: Record<string, string>): Record<string, string> {
  const escapedML: Record<string, string> = {};
  for (const [keyML, valueML] of Object.entries(tokensML)) {
    escapedML[keyML] = escapeHtmlML(valueML);
  }
  return escapedML;
}

function buildSessionsListHtmlML(sessionsML: BundleSessionInfo[]): string {
  return sessionsML
    .map(
      (sML) =>
        `  <li>${escapeHtmlML(sML.date)}, ${escapeHtmlML(formatTimeRangeDisplayML(sML.slotStart, sML.slotEnd))}</li>`,
    )
    .join("\n");
}

function fillTemplateML(templateML: string, tokensML: Record<string, string>): string {
  return templateML.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (matchML, keyML) => {
    return Object.prototype.hasOwnProperty.call(tokensML, keyML) ? tokensML[keyML] : matchML;
  });
}

function htmlToTextML(htmlML: string): string {
  return htmlML
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

export async function listEmailTemplatesML(
  shopML: string,
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
  const rowsML = await prismaML.emailTemplate.findMany({ where: { shop: shopML } });
  const byTypeML = new Map<string, EmailTemplate>(
    rowsML.map((rowML: EmailTemplate) => [rowML.type, rowML]),
  );

  return EMAIL_TEMPLATE_TYPES_ML.map((typeML) => {
    const rowML = byTypeML.get(typeML);
    const fallbackML = DEFAULT_EMAIL_TEMPLATES_ML[typeML];
    return {
      type: typeML,
      label: EMAIL_TEMPLATE_LABELS_ML[typeML],
      description: EMAIL_TEMPLATE_DESCRIPTIONS_ML[typeML],
      placeholders: EMAIL_TEMPLATE_PLACEHOLDERS_ML[typeML],
      subject: rowML?.subject ?? fallbackML.subject,
      body: rowML?.body ?? fallbackML.body,
      isCustomized: Boolean(
        rowML &&
          (rowML.subject.trim() !== fallbackML.subject.trim() ||
            rowML.body.trim() !== fallbackML.body.trim()),
      ),
    };
  });
}

export async function upsertEmailTemplateML(
  shopML: string,
  typeML: EmailTemplateType,
  subjectML: string,
  bodyML: string,
): Promise<EmailTemplate> {
  return prismaML.emailTemplate.upsert({
    where: { shop_type: { shop: shopML, type: typeML } },
    create: { shop: shopML, type: typeML, subject: subjectML, body: bodyML },
    update: { subject: subjectML, body: bodyML },
  });
}

export async function resetEmailTemplateML(
  shopML: string,
  typeML: EmailTemplateType,
): Promise<void> {
  await prismaML.emailTemplate.deleteMany({ where: { shop: shopML, type: typeML } });
}

export async function renderEmailTemplateML(
  shopML: string,
  typeML: EmailTemplateType,
  dataML: AnyEmailData,
): Promise<{ subject: string; html: string; text: string }> {
  const rowML = await prismaML.emailTemplate.findUnique({
    where: { shop_type: { shop: shopML, type: typeML } },
  });
  const fallbackML = DEFAULT_EMAIL_TEMPLATES_ML[typeML];
  const subjectTemplateML = rowML?.subject ?? fallbackML.subject;
  const bodyTemplateML = rowML?.body ?? fallbackML.body;

  const rawTokensML = buildRawTokensML(typeML, dataML);
  const subjectML = fillTemplateML(subjectTemplateML, rawTokensML);

  const htmlTokensML = escapeTokensML(rawTokensML);
  if (typeML === "bundleConfirmation") {
    htmlTokensML.sessions_list = buildSessionsListHtmlML(
      (dataML as BundleBookingEmailData).sessions,
    );
  }
  const htmlML = fillTemplateML(bodyTemplateML, htmlTokensML);
  const textML = htmlToTextML(htmlML);

  return { subject: subjectML, html: htmlML, text: textML };
}

export async function confirmationEmailML(
  shopML: string,
  dataML: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplateML(shopML, "confirmation", dataML);
}

export async function bundleConfirmationEmailML(
  shopML: string,
  dataML: BundleBookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplateML(shopML, "bundleConfirmation", dataML);
}

export async function reminderEmailML(
  shopML: string,
  dataML: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplateML(shopML, "reminder", dataML);
}

export async function cancellationEmailML(
  shopML: string,
  dataML: BookingEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplateML(shopML, "cancellation", dataML);
}

export async function rescheduledEmailML(
  shopML: string,
  dataML: RescheduledEmailData,
): Promise<{ subject: string; text: string; html: string }> {
  return renderEmailTemplateML(shopML, "rescheduled", dataML);
}