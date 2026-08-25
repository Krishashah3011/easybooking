import type { SmtpSettings } from "@prisma/client";
import prisma from "../db.server";

export const DEFAULT_SMTP_SETTINGS = {
  host: null as string | null,
  port: null as number | null,
  username: null as string | null,
  password: null as string | null,
  fromEmail: null as string | null,
};

export type SmtpSettingsFormValues = {
  host: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
};

export type SmtpSettingsFieldErrors = Partial<
  Record<keyof SmtpSettingsFormValues, string>
>;

export async function getSmtpSettings(
  shop: string,
): Promise<SmtpSettings | null> {
  return prisma.smtpSettings.findUnique({ where: { shop } });
}

export function toFormValues(
  settings: SmtpSettings | null,
): SmtpSettingsFormValues {
  return {
    host: settings?.host ?? "",
    port: settings?.port != null ? String(settings.port) : "",
    username: settings?.username ?? "",
    password: settings?.password ?? "",
    fromEmail: settings?.fromEmail ?? "",
  };
}

const PORT_RE = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSmtpSettingsForm(formData: FormData): {
  values: SmtpSettingsFormValues;
  errors: SmtpSettingsFieldErrors;
} {
  const errors: SmtpSettingsFieldErrors = {};

  const host = String(formData.get("host") ?? "").trim();
  if (!host) {
    errors.host = "SMTP host is required.";
  }

  const port = String(formData.get("port") ?? "").trim();
  if (!port || !PORT_RE.test(port) || Number(port) < 1 || Number(port) > 65535) {
    errors.port = "Enter a valid port number.";
  }

  const username = String(formData.get("username") ?? "").trim();
  if (!username) {
    errors.username = "SMTP username is required.";
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    errors.password = "SMTP password is required.";
  }

  const fromEmail = String(formData.get("fromEmail") ?? "").trim();
  if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
    errors.fromEmail = "Enter a valid \"from\" email address.";
  }

  return {
    values: { host, port, username, password, fromEmail },
    errors,
  };
}

export async function upsertSmtpSettings(
  shop: string,
  values: SmtpSettingsFormValues,
): Promise<SmtpSettings> {
  const data = {
    host: values.host,
    port: Number(values.port),
    username: values.username,
    password: values.password,
    fromEmail: values.fromEmail,
  };

  return prisma.smtpSettings.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}