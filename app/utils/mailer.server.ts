import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  return cachedTransporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Optional per-shop override for the display name on the "From" line
   * (e.g. "Acme Bookings" instead of the default "Bookings"). The actual
   * sending address always stays SMTP_FROM_EMAIL — only the display name
   * is overridable, since arbitrary from-addresses break SPF/DKIM.
   */
  fromName?: string | null;
};

/**
 * Sends an email via whatever SMTP credentials are configured in the
 * environment. Returns false (and logs) instead of throwing when SMTP
 * isn't configured or the send fails — callers should treat email as
 * best-effort and never let it block booking creation.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "SMTP is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD) — skipping email send.",
    );
    return false;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName =
    input.fromName?.trim() || process.env.SMTP_FROM_NAME || "Bookings";
  if (!fromEmail) {
    console.warn("SMTP_FROM_EMAIL is not set — skipping email send.");
    return false;
  }

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