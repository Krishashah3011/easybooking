import nodemailer from "nodemailer";
import { getSmtpSettings } from "../models/smtpSettings.server";

const transporterCache = new Map<string, nodemailer.Transporter>();
const transporterCacheKey = new Map<string, string>();

async function getTransporter(
  shop: string,
): Promise<{ transporter: nodemailer.Transporter; fromEmail: string } | null> {
  const settings = await getSmtpSettings(shop);

  if (
    !settings?.host ||
    !settings.port ||
    !settings.username ||
    !settings.password ||
    !settings.fromEmail
  ) {
    return null;
  }

  const cacheKey = `${settings.host}:${settings.port}:${settings.username}:${settings.password}`;
  const cached = transporterCache.get(shop);
  if (cached && transporterCacheKey.get(shop) === cacheKey) {
    return { transporter: cached, fromEmail: settings.fromEmail };
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.username, pass: settings.password },
  });

  transporterCache.set(shop, transporter);
  transporterCacheKey.set(shop, cacheKey);

  return { transporter, fromEmail: settings.fromEmail };
}

export type SendEmailInput = {
  shop: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string | null;
};

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const result = await getTransporter(input.shop);
  if (!result) {
    console.warn(
      `SMTP is not configured for shop ${input.shop} — go to Settings > SMTP Settings to set it up. Skipping email send.`,
    );
    return false;
  }

  const { transporter, fromEmail } = result;
  const fromName = input.fromName?.trim() || "Bookings";

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}