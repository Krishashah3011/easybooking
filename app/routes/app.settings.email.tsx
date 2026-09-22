import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getSmtpSettings,
  parseSmtpSettingsForm,
  toFormValues,
  upsertSmtpSettings,
  type SmtpSettingsFieldErrors,
  type SmtpSettingsFormValues,
} from "../models/smtpSettings.server";
import {
  listEmailTemplates,
  resetEmailTemplate,
  upsertEmailTemplate,
} from "../models/emailTemplate.server";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "../models/emailTemplateTypes";
import { styles, BORDER, TEXT_DARK, TEXT_MUTED, BLUE } from "../components/SettingsUI";
import type { RegisterSave } from "./app.settings";

type TemplateRow = Awaited<ReturnType<typeof listEmailTemplates>>[number];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [smtpSettings, templates] = await Promise.all([
    getSmtpSettings(session.shop),
    listEmailTemplates(session.shop),
  ]);
  return { smtp: toFormValues(smtpSettings), templates };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");

  if (intent === "reset-template") {
    const type = String(formData.get("type") ?? "") as EmailTemplateType;
    if (!EMAIL_TEMPLATE_TYPES.includes(type)) {
      return {
        ok: false as const,
        kind: "reset" as const,
        error: "Invalid template type",
      };
    }
    await resetEmailTemplate(session.shop, type);
    const templates = await listEmailTemplates(session.shop);
    return { ok: true as const, kind: "reset" as const, templates };
  }

  // intent === "save": saves SMTP settings and all email templates together
  const { values, errors } = parseSmtpSettingsForm(formData);
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, kind: "save" as const, errors, values };
  }

  const savedSmtp = await upsertSmtpSettings(session.shop, values);

  let parsedTemplates: { type: string; subject: string; body: string }[] = [];
  try {
    parsedTemplates = JSON.parse(String(formData.get("templates") ?? "[]"));
  } catch {
    parsedTemplates = [];
  }
  for (const item of parsedTemplates) {
    if (!EMAIL_TEMPLATE_TYPES.includes(item.type as EmailTemplateType)) continue;
    const subject = item.subject.trim();
    const body = item.body.trim();
    if (!subject || !body) continue;
    await upsertEmailTemplate(session.shop, item.type as EmailTemplateType, subject, body);
  }

  const templates = await listEmailTemplates(session.shop);
  return {
    ok: true as const,
    kind: "save" as const,
    errors: {} as SmtpSettingsFieldErrors,
    values: toFormValues(savedSmtp),
    templates,
  };
};

type EditableTemplateValues = Record<
  EmailTemplateType,
  { subject: string; body: string }
>;

function toEditableValues(templates: TemplateRow[]): EditableTemplateValues {
  const values = {} as EditableTemplateValues;
  for (const t of templates) {
    values[t.type] = { subject: t.subject, body: t.body };
  }
  return values;
}

export default function EmailSettingsTab() {
  const { smtp: initialSmtp, templates: initialTemplates } =
    useLoaderData<typeof loader>();
  const saveFetcher = useFetcher<typeof action>();
  const resetFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { registerSave } = useOutletContext<{ registerSave: RegisterSave }>();

  const [smtpValues, setSmtpValues] = useState<SmtpSettingsFormValues>(initialSmtp);
  const [showPass, setShowPass] = useState(false);

  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates);
  const [templateValues, setTemplateValues] = useState<EditableTemplateValues>(() =>
    toEditableValues(initialTemplates),
  );
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const smtpErrors: SmtpSettingsFieldErrors =
    saveFetcher.data && saveFetcher.data.kind === "save"
      ? saveFetcher.data.errors
      : {};
  const isSaving = saveFetcher.state !== "idle";
  const isResetting = resetFetcher.state !== "idle";

  useEffect(() => {
    if (!saveFetcher.data) return;
    if (saveFetcher.data.kind !== "save") return;
    if (saveFetcher.data.ok) {
      setSmtpValues(saveFetcher.data.values);
      setTemplates(saveFetcher.data.templates);
      setTemplateValues(toEditableValues(saveFetcher.data.templates));
      shopify.toast.show("Settings saved");
    } else {
      shopify.toast.show("Please fix the highlighted fields", { isError: true });
    }
  }, [saveFetcher.data, shopify]);

  useEffect(() => {
    if (resetFetcher.data?.ok && resetFetcher.data.kind === "reset") {
      setTemplates(resetFetcher.data.templates);
      setTemplateValues(toEditableValues(resetFetcher.data.templates));
      shopify.toast.show("Reverted to default");
    }
  }, [resetFetcher.data, shopify]);

  const setSmtpField = <K extends keyof SmtpSettingsFormValues>(
    key: K,
    value: SmtpSettingsFormValues[K],
  ) => {
    setSmtpValues((prev) => ({ ...prev, [key]: value }));
  };

  const setTemplateField = (
    type: EmailTemplateType,
    field: "subject" | "body",
    value: string,
  ) => {
    setTemplateValues((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const insertToken = (type: EmailTemplateType, token: string) => {
    const textarea = bodyRefs.current[type];
    const current = templateValues[type]?.body ?? "";
    if (!textarea) {
      setTemplateField(type, "body", `${current}${token}`);
      return;
    }
    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    setTemplateField(type, "body", next);
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + token.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const handleSave = () => {
    const templatesPayload = EMAIL_TEMPLATE_TYPES.map((type) => ({
      type,
      subject: templateValues[type]?.subject ?? "",
      body: templateValues[type]?.body ?? "",
    }));
    saveFetcher.submit(
      {
        intent: "save",
        host: smtpValues.host,
        port: smtpValues.port,
        username: smtpValues.username,
        password: smtpValues.password,
        fromEmail: smtpValues.fromEmail,
        templates: JSON.stringify(templatesPayload),
      },
      { method: "POST" },
    );
  };

  const handleResetTemplate = (type: EmailTemplateType) => {
    resetFetcher.submit({ intent: "reset-template", type }, { method: "POST" });
  };

  useEffect(() => {
    registerSave(handleSave, isSaving);
    return () => registerSave(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSave, smtpValues, templateValues, isSaving]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={styles.clientCard}>
        <div style={styles.clientCardBody}>
          <div style={styles.clientCardHeader}>
            <div style={styles.clientCardTitle}>Email (SMTP) Settings</div>
            <div style={styles.subLabel}>
              Used to send automated emails for reminders, booking confirmations, rescheduling updates, cancellations, and other booking-related notifications.
            </div>
          </div>

          <div style={styles.clientDivider} />

          <div style={styles.clientFieldGroup}>
            <div style={styles.clientFieldLabel}>SMTP Host</div>
            <input
              type="text"
              style={styles.clientInput}
              value={smtpValues.host}
              onChange={(e) => setSmtpField("host", e.target.value)}
              placeholder="smtp.example.com"
            />
            {smtpErrors.host && <p style={styles.errorText}>{smtpErrors.host}</p>}
          </div>

          <div style={styles.clientDivider} />

          <div style={styles.clientFieldGroup}>
            <div style={styles.clientFieldLabel}>SMTP Port</div>
            <input
              type="text"
              style={styles.clientInput}
              value={smtpValues.port}
              onChange={(e) => setSmtpField("port", e.target.value)}
              placeholder="587"
            />
            {smtpErrors.port && <p style={styles.errorText}>{smtpErrors.port}</p>}
          </div>

          <div style={styles.clientDivider} />

          <div style={styles.clientFieldGroup}>
            <div style={styles.clientFieldLabel}>SMTP Username</div>
            <input
              type="text"
              style={styles.clientInput}
              value={smtpValues.username}
              onChange={(e) => setSmtpField("username", e.target.value)}
              placeholder="Enter SMTP username"
            />
            {smtpErrors.username && (
              <p style={styles.errorText}>{smtpErrors.username}</p>
            )}
          </div>

          <div style={styles.clientDivider} />

          <div style={styles.clientFieldGroup}>
            <div style={styles.clientFieldLabel}>SMTP Password</div>
            <div style={styles.secretInputWrap}>
              <input
                type={showPass ? "text" : "password"}
                autoComplete="off"
                style={styles.secretInput}
                value={smtpValues.password}
                onChange={(e) => setSmtpField("password", e.target.value)}
                placeholder="Enter SMTP password"
              />
              <button
                type="button"
                style={styles.secretToggleButton}
                onClick={() => setShowPass((prev) => !prev)}
                aria-label={showPass ? "Hide SMTP password" : "Show SMTP password"}
                title={showPass ? "Hide" : "Show"}
              >
                <img src="/eye-icon.svg" width={22} height={20} alt="" />
              </button>
            </div>
            {smtpErrors.password && (
              <p style={styles.errorText}>{smtpErrors.password}</p>
            )}
          </div>

          <div style={styles.clientDivider} />

          <div style={styles.clientFieldGroup}>
            <div style={styles.clientFieldLabel}>From Email</div>
            <input
              type="text"
              style={styles.clientInput}
              value={smtpValues.fromEmail}
              onChange={(e) => setSmtpField("fromEmail", e.target.value)}
              placeholder="bookings@yourdomain.com"
            />
            {smtpErrors.fromEmail && (
              <p style={styles.errorText}>{smtpErrors.fromEmail}</p>
            )}
          </div>
        </div>
      </div>

      <div style={styles.clientCard}>
        <div style={styles.clientCardBody}>
          <div style={styles.clientCardHeader}>
            <div style={styles.clientCardTitle}>Email Templates</div>
            <div style={styles.subLabel}>
              Customize the subject and content of the automated emails your customers
              receive. Use the tokens below to insert booking details \u2014 they'll be
              filled in automatically when the email is sent.
            </div>
          </div>

          {templates.map((template, index) => {
            const editable = templateValues[template.type] ?? { subject: "", body: "" };
            return (
              <div key={template.type}>
                {index > 0 && <div style={styles.clientDivider} />}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "6px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <div style={{ ...styles.label, fontSize: "15px" }}>{template.label}</div>
                      <div style={styles.subLabel}>{template.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetTemplate(template.type)}
                      disabled={!template.isCustomized || isResetting}
                      style={resetButtonStyle(!template.isCustomized || isResetting)}
                    >
                      Reset to default
                    </button>
                  </div>

                  <div style={styles.clientFieldGroup}>
                    <div style={styles.clientFieldLabel}>Subject</div>
                    <input
                      type="text"
                      style={styles.clientInput}
                      value={editable.subject}
                      onChange={(e) => setTemplateField(template.type, "subject", e.target.value)}
                    />
                  </div>

                  <div style={styles.clientFieldGroup}>
                    <div style={styles.clientFieldLabel}>Email Body (HTML)</div>
                    <textarea
                      ref={(el) => {
                        bodyRefs.current[template.type] = el;
                      }}
                      style={textareaStyle}
                      rows={8}
                      value={editable.body}
                      onChange={(e) => setTemplateField(template.type, "body", e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {template.placeholders.map((p) => (
                      <button
                        key={p.token}
                        type="button"
                        title={p.description}
                        onClick={() => insertToken(template.type, p.token)}
                        style={tokenPillStyle}
                      >
                        {p.token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: "4px",
  border: `1px solid ${BORDER}`,
  fontFamily: "monospace",
  fontSize: "13px",
  color: TEXT_DARK,
  boxSizing: "border-box",
  resize: "vertical",
  lineHeight: 1.5,
};

const tokenPillStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "999px",
  border: `1px solid ${BORDER}`,
  background: "#F5F6F7",
  color: TEXT_MUTED,
  fontFamily: "monospace",
  fontSize: "12px",
  cursor: "pointer",
};

function resetButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${BORDER}`,
    background: disabled ? "#F5F5F5" : "#fff",
    color: disabled ? "#A6A6A6" : BLUE,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "12px",
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap",
  };
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};