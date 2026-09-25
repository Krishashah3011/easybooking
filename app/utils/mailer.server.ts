import nodemailer from "nodemailer";
import { getSmtpSettingsML } from "../models/smtpSettings.server";

const transporterCacheML = new Map<string, nodemailer.Transporter>();
const transporterCacheKeyML = new Map<string, string>();

async function getTransporterML(
  shopML: string,
): Promise<{ transporter: nodemailer.Transporter; fromEmail: string } | null> {
  const settingsML = await getSmtpSettingsML(shopML);

  if (
    !settingsML?.host ||
    !settingsML.port ||
    !settingsML.username ||
    !settingsML.password ||
    !settingsML.fromEmail
  ) {
    return null;
  }

  const cacheKeyML = `${settingsML.host}:${settingsML.port}:${settingsML.username}:${settingsML.password}`;
  const cachedML = transporterCacheML.get(shopML);
  if (cachedML && transporterCacheKeyML.get(shopML) === cacheKeyML) {
    return { transporter: cachedML, fromEmail: settingsML.fromEmail };
  }

  const transporterML = nodemailer.createTransport({
    host: settingsML.host,
    port: settingsML.port,
    secure: settingsML.port === 465,
    auth: { user: settingsML.username, pass: settingsML.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: false },
  });

  transporterCacheML.set(shopML, transporterML);
  transporterCacheKeyML.set(shopML, cacheKeyML);

  return { transporter: transporterML, fromEmail: settingsML.fromEmail };
}

export type SendEmailInput = {
  shop: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string | null;
};

export async function sendEmailML(inputML: SendEmailInput): Promise<boolean> {
  const resultML = await getTransporterML(inputML.shop);
  if (!resultML) {
    console.warn(
      `SMTP is not configured for shop ${inputML.shop} — go to Settings > SMTP Settings to set it up. Skipping email send.`,
    );
    return false;
  }

  const { transporter: transporterML, fromEmail: fromEmailML } = resultML;
  const fromNameML = inputML.fromName?.trim() || "Bookings";

  try {
    await transporterML.sendMail({
      from: `"${fromNameML}" <${fromEmailML}>`,
      to: inputML.to,
      subject: inputML.subject,
      text: inputML.text,
      html: inputML.html,
    });
    return true;
  } catch (errorML) {
    console.error("Failed to send email:", errorML);
    return false;
  }
}