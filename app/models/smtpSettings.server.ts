import type { SmtpSettings } from "@prisma/client";
import prismaML from "../db.server";

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

export async function getSmtpSettingsML(
  shopML: string,
): Promise<SmtpSettings | null> {
  return prismaML.smtpSettings.findUnique({ where: { shop: shopML } });
}

export function toFormValuesML(
  settingsML: SmtpSettings | null,
): SmtpSettingsFormValues {
  return {
    host: settingsML?.host ?? "",
    port: settingsML?.port != null ? String(settingsML.port) : "",
    username: settingsML?.username ?? "",
    password: settingsML?.password ?? "",
    fromEmail: settingsML?.fromEmail ?? "",
  };
}

const PORT_RE_ML = /^\d+$/;
const EMAIL_RE_ML = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSmtpSettingsFormML(formDataML: FormData): {
  values: SmtpSettingsFormValues;
  errors: SmtpSettingsFieldErrors;
} {
  const errorsML: SmtpSettingsFieldErrors = {};

  const hostML = String(formDataML.get("host") ?? "").trim();
  if (!hostML) {
    errorsML.host = "SMTP host is required.";
  }

  const portML = String(formDataML.get("port") ?? "").trim();
  if (!portML || !PORT_RE_ML.test(portML) || Number(portML) < 1 || Number(portML) > 65535) {
    errorsML.port = "Enter a valid port number.";
  }

  const usernameML = String(formDataML.get("username") ?? "").trim();
  if (!usernameML) {
    errorsML.username = "SMTP username is required.";
  }

  const passwordML = String(formDataML.get("password") ?? "");
  if (!passwordML) {
    errorsML.password = "SMTP password is required.";
  }

  const fromEmailML = String(formDataML.get("fromEmail") ?? "").trim();
  if (!fromEmailML || !EMAIL_RE_ML.test(fromEmailML)) {
    errorsML.fromEmail = "Enter a valid \"from\" email address.";
  }

  return {
    values: { host: hostML, port: portML, username: usernameML, password: passwordML, fromEmail: fromEmailML },
    errors: errorsML,
  };
}

export async function upsertSmtpSettingsML(
  shopML: string,
  valuesML: SmtpSettingsFormValues,
): Promise<SmtpSettings> {
  const dataML = {
    host: valuesML.host,
    port: Number(valuesML.port),
    username: valuesML.username,
    password: valuesML.password,
    fromEmail: valuesML.fromEmail,
  };

  return prismaML.smtpSettings.upsert({
    where: { shop: shopML },
    create: { shop: shopML, ...dataML },
    update: dataML,
  });
}